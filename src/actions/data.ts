"use server"

import { db } from "@/lib/db"
import { sql } from "drizzle-orm"
import { revalidatePath, updateTag } from "next/cache"
import { checkAdmin } from "@/actions/admin"
import { recalcProductAggregatesForMany } from "@/lib/db/queries"
import { products } from "@/lib/db/schema"

const MAX_IMPORT_BYTES = 16 * 1024 * 1024

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

    return {
        statement: `INSERT OR IGNORE INTO ${sourceTable} (${columns.join(', ')}) VALUES (${match[3]});`,
        table: sourceTable,
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

        let successCount = 0
        let errorCount = 0

        for (const rawStatement of splitSqlStatements(text)) {
            const importStatement = normalizeImportStatement(rawStatement)
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
