"use server"

import { db, isMySql } from "@/lib/db"
import { getTableColumns } from "drizzle-orm"
import { revalidatePath, updateTag } from "next/cache"
import { checkAdmin } from "@/actions/admin"
import { recalcProductAggregatesForMany } from "@/lib/db/queries"
import {
    adminMessages,
    broadcastMessages,
    broadcastReads,
    cards,
    categories,
    dailyCheckins,
    loginUsers,
    orders,
    products,
    refundRequests,
    reviewReplies,
    reviews,
    settings,
    userMessages,
    userNotifications,
    wishlistItems,
    wishlistVotes,
} from "@/lib/db/schema"

const MAX_IMPORT_BYTES = 64 * 1024 * 1024

const importTableEntries = [
    ['categories', categories],
    ['products', products],
    ['cards', cards],
    ['orders', orders],
    ['reviews', reviews],
    ['review_replies', reviewReplies],
    ['settings', settings],
    ['login_users', loginUsers],
    ['user_notifications', userNotifications],
    ['user_messages', userMessages],
    ['admin_messages', adminMessages],
    ['broadcast_messages', broadcastMessages],
    ['broadcast_reads', broadcastReads],
    ['wishlist_items', wishlistItems],
    ['wishlist_votes', wishlistVotes],
    ['refund_requests', refundRequests],
    ['daily_checkins_v2', dailyCheckins],
] as const

const importTables = new Map<string, any>(importTableEntries)
const importConflictKeys = new Map<string, string>([
    ['products', 'id'],
    ['orders', 'orderId'],
    ['settings', 'key'],
    ['login_users', 'userId'],
])
const timestampFields = new Set([
    'createdAt', 'updatedAt', 'paidAt', 'deliveredAt', 'reservedAt',
    'expiresAt', 'usedAt', 'lastLoginAt', 'lastCheckinAt', 'processedAt',
])
const booleanFields = new Set([
    'isHot', 'isActive', 'isShared', 'isUsed', 'isBlocked',
    'desktopNotificationsEnabled', 'isRead',
])

// SQLite exports may contain literal line breaks and semicolons
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

function splitSqlValues(source: string): string[] {
    const values: string[] = []
    let start = 0
    let quote: "'" | '"' | null = null

    for (let index = 0; index < source.length; index++) {
        const char = source[index]
        const next = source[index + 1]
        if (quote) {
            if (char === quote) {
                if (next === quote) {
                    index++
                } else {
                    quote = null
                }
            }
            continue
        }
        if (char === "'" || char === '"') {
            quote = char
        } else if (char === ',') {
            values.push(source.slice(start, index).trim())
            start = index + 1
        }
    }
    if (quote) throw new Error('Unterminated SQL string literal')
    values.push(source.slice(start).trim())
    return values
}

function parseSqlValue(source: string): unknown {
    const value = source.trim()
    if (/^null$/i.test(value)) return null
    if (/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(value)) return Number(value)
    if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
        const quote = value[0]
        return value.slice(1, -1).replaceAll(quote + quote, quote)
    }
    throw new Error('Unsupported SQL value')
}

function normalizeImportStatement(statement: string) {
    const normalized = stripLeadingSqlComments(statement)
    if (!normalized || !/^INSERT\b/i.test(normalized)) return null

    const match = normalized.match(
        /^INSERT\s+(?:OR\s+IGNORE\s+)?INTO\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]+)\)\s*VALUES\s*\(([\s\S]*)\)\s*;?\s*$/i
    )
    if (!match) return { error: 'Unsupported INSERT syntax' }

    const sourceTable = match[1].toLowerCase()
    if (!importTables.has(sourceTable)) {
        return { error: `Unsupported import table: ${sourceTable}` }
    }

    const columns = match[2].split(',').map(column => column.trim())
    if (!columns.length || !columns.every(column => /^[A-Za-z_][A-Za-z0-9_]*$/.test(column))) {
        return { error: `Invalid column list for table: ${sourceTable}` }
    }

    const values = splitSqlValues(match[3]).map(parseSqlValue)
    if (values.length !== columns.length) return { error: `Column/value count mismatch for table: ${sourceTable}` }
    return { table: sourceTable, row: Object.fromEntries(columns.map((column, index) => [column, values[index]])) }
}

function normalizeDate(value: unknown): Date | null {
    if (value === null || value === undefined || value === '') return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    const numeric = typeof value === 'number' ? value : Number(value)
    const date = Number.isFinite(numeric)
        ? new Date(numeric < 1_000_000_000_000 ? numeric * 1000 : numeric)
        : new Date(String(value))
    if (Number.isNaN(date.getTime())) throw new Error(`Invalid timestamp: ${String(value)}`)
    return date
}

function normalizeRow(table: any, source: Record<string, unknown>) {
    const result: Record<string, unknown> = {}
    const columns = getTableColumns(table) as Record<string, { name: string }>
    for (const [property, column] of Object.entries(columns)) {
        const hasProperty = Object.prototype.hasOwnProperty.call(source, property)
        const hasColumn = Object.prototype.hasOwnProperty.call(source, column.name)
        if (!hasProperty && !hasColumn) continue

        let value = hasProperty ? source[property] : source[column.name]
        if (timestampFields.has(property)) value = normalizeDate(value)
        if (booleanFields.has(property) && value !== null && value !== undefined) {
            value = value === true || value === 1 || value === '1' || value === 'true'
        }
        result[property] = value
    }
    return result
}

async function insertRow(executor: any, tableName: string, source: Record<string, unknown>) {
    const table = importTables.get(tableName)
    if (!table) throw new Error(`Unsupported import table: ${tableName}`)
    const row = normalizeRow(table, source)
    if (!Object.keys(row).length) throw new Error(`No supported columns for table: ${tableName}`)

    if (isMySql) {
        const conflictKey = importConflictKeys.get(tableName) || 'id'
        await executor.insert(table).values(row).onDuplicateKeyUpdate({
            set: { [conflictKey]: table[conflictKey] },
        })
    } else {
        await executor.insert(table).values(row).onConflictDoNothing()
    }
}

function parseJsonRows(text: string): Array<{ table: string; row: Record<string, unknown> }> {
    const parsed = JSON.parse(text)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Invalid migration JSON')
    }

    if ('format' in parsed && parsed.format !== 'ldc-shop-backup') {
        throw new Error('Unsupported migration package format')
    }
    if (parsed.format === 'ldc-shop-backup' && parsed.version !== 1) {
        throw new Error(`Unsupported migration package version: ${String(parsed.version)}`)
    }

    const tables = parsed.format === 'ldc-shop-backup' ? parsed.tables : parsed
    if (!tables || typeof tables !== 'object' || Array.isArray(tables)) {
        throw new Error('Invalid migration JSON')
    }

    const rows: Array<{ table: string; row: Record<string, unknown> }> = []
    for (const [table] of importTableEntries) {
        const tableRows = (tables as Record<string, unknown>)[table]
        if (tableRows === undefined) continue
        if (!Array.isArray(tableRows)) throw new Error(`Invalid rows for table: ${table}`)
        for (const row of tableRows) {
            if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`Invalid row for table: ${table}`)
            rows.push({ table, row: row as Record<string, unknown> })
        }
    }
    return rows
}

function parseSqlRows(text: string): Array<{ table: string; row: Record<string, unknown> }> {
    const rows: Array<{ table: string; row: Record<string, unknown> }> = []
    for (const rawStatement of splitSqlStatements(text)) {
        const parsed = normalizeImportStatement(rawStatement)
        if (!parsed) continue
        if ('error' in parsed) throw new Error(parsed.error)
        rows.push(parsed)
    }
    return rows
}

export async function importData(formData: FormData) {
    await checkAdmin()

    const file = formData.get('file') as File
    if (!file) {
        return { success: false, error: 'No file provided' }
    }
    if (file.size > MAX_IMPORT_BYTES) {
        return { success: false, error: 'Import file is too large (maximum 64 MB)' }
    }

    try {
        // Remove a possible UTF-8 BOM added by spreadsheet/file tools before
        // deciding whether the backup is JSON or SQL.
        const text = (await file.text()).replace(/^\uFEFF/u, '')

        const rows = text.trimStart().startsWith('{') ? parseJsonRows(text) : parseSqlRows(text)
        if (!rows.length) throw new Error('No supported data rows found')

        let successCount = 0
        let errorCount = 0
        const importRows = async (executor: any) => {
            for (const { table, row } of rows) {
                try {
                    await insertRow(executor, table, row)
                    successCount++
                } catch (error) {
                    console.error(`Import failed for table: ${table}`)
                    if (isMySql) throw error
                    errorCount++
                }
            }
        }

        if (isMySql) await db.transaction(importRows)
        else await importRows(db)

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
