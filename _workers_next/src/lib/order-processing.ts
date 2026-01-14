import { db } from "@/lib/db";
import { orders, cards } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { isPaymentOrder } from "@/lib/payment";

export async function processOrderFulfillment(orderId: string, paidAmount: number, tradeNo: string) {
    const order = await db.query.orders.findFirst({
        where: eq(orders.orderId, orderId)
    });

    if (!order) {
        throw new Error(`Order ${orderId} not found`);
    }

    // Verify Amount (Prevent penny-dropping)
    const orderMoney = parseFloat(order.amount);

    // Allow small float epsilon difference
    if (Math.abs(paidAmount - orderMoney) > 0.01) {
        throw new Error(`Amount mismatch! Order: ${orderMoney}, Paid: ${paidAmount}`);
    }

    if (isPaymentOrder(order.productId)) {
        if (order.status === 'pending' || order.status === 'cancelled') {
            await db.update(orders)
                .set({
                    status: 'paid',
                    paidAt: new Date(),
                    tradeNo: tradeNo
                })
                .where(eq(orders.orderId, orderId));
        }
        return { success: true, status: 'processed' };
    }

    if (order.status === 'pending' || order.status === 'cancelled') {
        const quantity = order.quantity || 1;

        // No transaction - D1 doesn't support SQL transactions
        let cardKeys: string[] = [];
        const oneMinuteAgo = Date.now() - 60000;

        // 1. First, try to claim reserved cards for this order
        try {
            const reservedCards = await db.select({ id: cards.id, cardKey: cards.cardKey })
                .from(cards)
                .where(sql`${cards.reservedOrderId} = ${orderId} AND COALESCE(${cards.isUsed}, 0) = 0`)
                .limit(quantity);

            for (const card of reservedCards) {
                await db.update(cards)
                    .set({
                        isUsed: true,
                        usedAt: new Date(),
                        reservedOrderId: null,
                        reservedAt: null
                    })
                    .where(eq(cards.id, card.id));
                cardKeys.push(card.cardKey);
            }
        } catch (error: any) {
            // reservedOrderId column might not exist
            console.log('[Fulfill] Reserved cards check failed:', error.message);
        }

        // 2. If we need more cards, claim available ones
        if (cardKeys.length < quantity) {
            const needed = quantity - cardKeys.length;
            console.log(`[Fulfill] Order ${orderId}: Found ${cardKeys.length} reserved cards, need ${needed} more.`);

            const availableCards = await db.select({ id: cards.id, cardKey: cards.cardKey })
                .from(cards)
                .where(sql`${cards.productId} = ${order.productId} AND COALESCE(${cards.isUsed}, 0) = 0 AND (${cards.reservedAt} IS NULL OR ${cards.reservedAt} < ${oneMinuteAgo})`)
                .limit(needed);

            for (const card of availableCards) {
                await db.update(cards)
                    .set({
                        isUsed: true,
                        usedAt: new Date()
                    })
                    .where(eq(cards.id, card.id));
                cardKeys.push(card.cardKey);
            }
        }

        console.log(`[Fulfill] Order ${orderId}: Cards claimed: ${cardKeys.length}/${quantity}`);

        if (cardKeys.length > 0) {
            const joinedKeys = cardKeys.join('\n');

            await db.update(orders)
                .set({
                    status: 'delivered',
                    paidAt: new Date(),
                    deliveredAt: new Date(),
                    tradeNo: tradeNo,
                    cardKey: joinedKeys
                })
                .where(eq(orders.orderId, orderId));
            console.log(`[Fulfill] Order ${orderId} delivered successfully!`);
        } else {
            // Paid but no stock
            await db.update(orders)
                .set({ status: 'paid', paidAt: new Date(), tradeNo: tradeNo })
                .where(eq(orders.orderId, orderId));
            console.log(`[Fulfill] Order ${orderId} marked as paid (no stock)`);
        }
        return { success: true, status: 'processed' };
    } else {
        return { success: true, status: 'already_processed' }; // Idempotent success
    }
}
