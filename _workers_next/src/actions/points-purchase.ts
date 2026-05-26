'use server'

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { orders } from "@/lib/db/schema"
import { getSetting, withOrderColumnFallback } from "@/lib/db/queries"
import { generateOrderId, generateSign } from "@/lib/crypto"
import { POINTS_TOPUP_PRODUCT_ID, POINTS_TOPUP_PRODUCT_NAME } from "@/lib/payment"
import { resolveSiteBaseUrl } from "@/lib/site-url"
import { cookies } from "next/headers"

function normalizeAmount(input: number | string) {
    const parsed = Number.parseFloat(String(input))
    if (!Number.isFinite(parsed)) return null
    const rounded = Math.round(parsed * 100) / 100
    if (rounded <= 0) return null
    return rounded
}

async function getPurchaseRate() {
    const raw = await getSetting('points_purchase_rate').catch(() => '1')
    const rate = Number.parseFloat(String(raw || '1'))
    return Number.isFinite(rate) && rate > 0 ? rate : 1
}

export async function createPointsTopupOrder(amountInput: number | string) {
    const session = await auth()
    const user = session?.user
    if (!user?.id) return { success: false, error: 'common.error' }

    const enabled = await getSetting('points_purchase_enabled').catch(() => 'false')
    if (enabled !== 'true') return { success: false, error: 'pointsPurchase.disabled' }

    const amount = normalizeAmount(amountInput)
    if (!amount) return { success: false, error: 'payment.invalidAmount' }

    const rate = await getPurchaseRate()
    const points = Math.floor(amount * rate)
    if (points <= 0) return { success: false, error: 'pointsPurchase.invalidPoints' }

    const orderId = generateOrderId()
    const money = amount.toFixed(2)

    await withOrderColumnFallback(async () => {
        await db.insert(orders).values({
            orderId,
            productId: POINTS_TOPUP_PRODUCT_ID,
            productName: POINTS_TOPUP_PRODUCT_NAME,
            amount: money,
            email: user.email || null,
            userId: user.id,
            username: user.username || user.name || null,
            status: 'pending',
            currentPaymentId: orderId,
            quantity: points,
            createdAt: new Date()
        })
    })

    const cookieStore = await cookies()
    cookieStore.set('ldc_pending_order', orderId, { secure: true, path: '/', sameSite: 'lax' })

    const baseUrl = await resolveSiteBaseUrl()
    const payParams: Record<string, any> = {
        pid: process.env.MERCHANT_ID!,
        type: 'epay',
        out_trade_no: orderId,
        notify_url: `${baseUrl}/api/notify`,
        return_url: `${baseUrl}/callback/${orderId}`,
        name: POINTS_TOPUP_PRODUCT_NAME,
        money,
        sign_type: 'MD5'
    }

    payParams.sign = generateSign(payParams, process.env.MERCHANT_KEY!)

    return {
        success: true,
        params: payParams,
        points,
        url: process.env.PAY_URL || 'https://credit.linux.do/epay/pay/submit.php'
    }
}
