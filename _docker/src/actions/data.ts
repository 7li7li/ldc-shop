"use server"

import { db } from "@/lib/db"
import { sql } from "drizzle-orm"
import { revalidatePath, updateTag } from "next/cache"
import { checkAdmin } from "@/actions/admin"
import { recalcProductAggregatesForMany } from "@/lib/db/queries"
import { products } from "@/lib/db/schema"

const MAX_IMPORT_BYTES = 16 * 1024 * 1024

const importTableMap: Record<string, string> = {
    daily_checkins: 'daily_checkins_v2',
}

const importTables = new Set([
    'products',
    'cards',
    'orders',
    'login_users',
    'daily_checkins_v2',
    'settings',
    'categories',
    'reviews',
    'review_replies',
    'refund_requests',
    'user_notifications',
    'admin_messages',
    'user_messages',
    'broadcast_messages',
    'broadcast_reads',
    'wishlist_items',
    'wishlist_votes',
])

// Cloudflare and SQLite exports may contain literal line breaks and semicolons
// in quoted card keys, descriptions, or notes. Splitting on `\n` or `;` would
// turn one INSERT into invalid fragments, so only terminate a statement when
// the semicolon is outside quoted strings and comments.
function splitSqlStatements(source: string): string[] {
    const statements: string[] = []
    let statementStart = 0
    let quote: "'" | '"' | '`' | null = null
    let lineComment = false
    let blockComment = false

    for (let index = 0; index < source.length; index++) {
        const char = source[index]
        const next = source[index + 1]

        if (lineComment) {
            if (char === '\n') lineComment = false
            continue
        }

        if (blockComment) {
            if (char === '*' && next === '/') {
                blockComment = false
                index++
            }
            continue
        }

        if (quote) {
            if (char === quote) {
                // SQLite escapes quote characters by doubling them.
                if ((quote === "'" || quote === '"') && next === quote) {
                    index++
                    continue
                }
                quote = null
            }
            continue
        }

        if (char === '-' && next === '-') {
            lineComment = true
            index++
            continue
        }
        if (char === '/' && next === '*') {
            blockComment = true
            index++
            continue
        }
        if (char === "'" || char === '"' || char === '`') {
            quote = char
            continue
        }
        if (char === ';') {
            statements.push(source.slice(statementStart, index + 1))
            statementStart = index + 1
        }
    }

    const trailingStatement = source.slice(statementStart).trim()
    if (trailingStatement) statements.push(trailingStatement)
    return statements
}

function stripLeadingSqlComments(statement: string) {
    return statement
        .replace(/^(?:\s|--[^\r\n]*(?:\r?\n|$)|\/\*[\s\S]*?\*\/)*/u, '')
        .trim()
}

function normalizeImportStatement(statement: string, columnMap: Record<string, string>) {
    const normalized = stripLeadingSqlComments(statement)
    if (!normalized || !/^INSERT\b/i.test(normalized)) return null

    const match = normalized.match(
        /^INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)\s*VALUES\s*\(([\s\S]*)\)\s*;?\s*$/i
    )
    if (!match) return { error: 'Unsupported INSERT syntax' }

    const sourceTable = match[1].toLowerCase()
    const targetTable = importTableMap[sourceTable] || sourceTable
    if (!importTables.has(targetTable)) {
        return { error: `Unsupported import table: ${sourceTable}` }
    }

    const columns = match[2].split(',').map(column => column.trim())
    if (!columns.length || !columns.every(column => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column))) {
        return { error: `Invalid column list for table: ${sourceTable}` }
    }

    const targetColumns = columns.map(column => columnMap[column] || column)
    return {
        statement: `INSERT OR IGNORE INTO ${targetTable} (${targetColumns.join(', ')}) VALUES (${match[3]});`,
        table: targetTable,
    }
}

async function executeStatement(statement: string, table: string) {
    if (!statement.trim()) return
    try {
        await db.run(sql.raw(statement))
    } catch {
        // Do not log raw import statements: card keys and private customer
        // data may be present in an otherwise harmless SQLite error.
        console.error(`Import failed for table: ${table}`)
        throw new Error(`Failed to import data into ${table}`)
    }
}

async function repairTimestamps() {
    const timestampColumns = [
        { table: 'products', cols: ['created_at'] },
        { table: 'cards', cols: ['created_at', 'reserved_at', 'expires_at', 'used_at'] },
        { table: 'orders', cols: ['created_at', 'paid_at', 'delivered_at'] },
        { table: 'login_users', cols: ['created_at', 'last_login_at', 'last_checkin_at'] },
        { table: 'daily_checkins_v2', cols: ['created_at'] },
        { table: 'settings', cols: ['updated_at'] },
        { table: 'reviews', cols: ['created_at'] },
        { table: 'review_replies', cols: ['created_at'] },
        { table: 'categories', cols: ['created_at', 'updated_at'] },
        { table: 'refund_requests', cols: ['created_at', 'updated_at', 'processed_at'] },
        { table: 'user_notifications', cols: ['created_at'] },
        { table: 'user_messages', cols: ['created_at'] },
        { table: 'admin_messages', cols: ['created_at'] },
        { table: 'broadcast_messages', cols: ['created_at'] },
        { table: 'broadcast_reads', cols: ['created_at'] },
        { table: 'wishlist_items', cols: ['created_at'] },
        { table: 'wishlist_votes', cols: ['created_at'] },
    ]

    for (const { table, cols } of timestampColumns) {
        for (const col of cols) {
            try {
                // SQLite: Convert TEXT timestamps (e.g. '2023-01-01...') to INTEGER (Unix MS)
                // Only targets rows where column is currently TEXT
                // strftime('%s') returns seconds, so * 1000 for ms
                await db.run(sql.raw(`
                    UPDATE ${table} 
                    SET ${col} = CAST(strftime('%s', ${col}) AS INTEGER) * 1000 
                    WHERE typeof(${col}) = 'text' AND ${col} IS NOT NULL AND ${col} != ''
                `))
            } catch (e) {
                console.error(`Failed to repair timestamp for ${table}.${col}:`, e)
            }
        }
    }
}

export async function repairDataAction() {
    await checkAdmin()
    try {
        await repairTimestamps()
        return { success: true }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}

export async function importData(formData: FormData) {
    await checkAdmin()

    const file = formData.get('file') as File
    if (!file) {
        return { success: false, error: 'No file provided' }
    }
    if (file.size > MAX_IMPORT_BYTES) {
        return { success: false, error: 'Import file is too large (maximum 16 MB)' }
    }

    try {
        const text = await file.text()

        // Comprehensive Column Mapping (CamelCase -> snake_case) for Vercel exports
        // This covers known differences between Vercel export (which uses property names) and D1 schema
        const columnMap: Record<string, string> = {
            userId: 'user_id',
            productId: 'product_id',
            orderId: 'order_id',
            reviewId: 'review_id',
            itemId: 'item_id',
            messageId: 'message_id',
            // Products
            compareAtPrice: 'compare_at_price',
            isHot: 'is_hot',
            isActive: 'is_active',
            isShared: 'is_shared',
            sortOrder: 'sort_order',
            purchaseLimit: 'purchase_limit',
            purchaseWarning: 'purchase_warning',
            purchaseUrl: 'purchase_url',
            visibilityLevel: 'visibility_level',
            stockCount: 'stock_count',
            lockedCount: 'locked_count',
            soldCount: 'sold_count',
            reviewCount: 'review_count',
            variantGroupId: 'variant_group_id',
            variantLabel: 'variant_label',
            purchaseQuestions: 'purchase_questions',
            productImages: 'product_images',
            createdAt: 'created_at',
            // Cards
            cardKey: 'card_key',
            isUsed: 'is_used',
            reservedOrderId: 'reserved_order_id',
            reservedAt: 'reserved_at',
            expiresAt: 'expires_at',
            usedAt: 'used_at',
            // Orders
            productName: 'product_name',
            tradeNo: 'trade_no',
            paidAt: 'paid_at',
            deliveredAt: 'delivered_at',
            pointsUsed: 'points_used',
            currentPaymentId: 'current_payment_id',
            cardIds: 'card_ids',
            // Login Users
            lastLoginAt: 'last_login_at',
            lastCheckinAt: 'last_checkin_at',
            consecutiveDays: 'consecutive_days',
            isBlocked: 'is_blocked',
            desktopNotificationsEnabled: 'desktop_notifications_enabled',
            // Refund Requests
            adminUsername: 'admin_username',
            adminNote: 'admin_note',
            processedAt: 'processed_at',
            // Settings
            updatedAt: 'updated_at',
            // Notification / message tables
            titleKey: 'title_key',
            contentKey: 'content_key',
            isRead: 'is_read',
            // Broadcast / admin messages
            targetType: 'target_type',
            targetValue: 'target_value',
        }

        let successCount = 0
        let errorCount = 0

        for (const rawStatement of splitSqlStatements(text)) {
            const importStatement = normalizeImportStatement(rawStatement, columnMap)
            if (!importStatement) continue

            if ('error' in importStatement) {
                console.warn(`[data import] ${importStatement.error}`)
                errorCount++
                continue
            }

            try {
                await executeStatement(importStatement.statement, importStatement.table)
                successCount++
            } catch {
                errorCount++
            }
        }

        // Run repair regardless of insert success to fix any existing data issues
        await repairTimestamps()

        try {
            const productRows = await db.select({ id: products.id }).from(products);
            const productIds = productRows.map((r: { id: string }) => r.id).filter(Boolean);
            await recalcProductAggregatesForMany(productIds);
        } catch {
            // best effort
        }

        revalidatePath('/admin')
        updateTag('home:products')
        updateTag('home:ratings')
        updateTag('home:categories')
        updateTag('home:announcement')
        updateTag('home:product-categories')
        updateTag('home:visitors')
        return { success: true, count: successCount, errors: errorCount }
    } catch (e: any) {
        return { success: false, error: e.message }
    }
}
