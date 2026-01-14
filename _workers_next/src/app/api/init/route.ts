import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // Run schema migrations directly
        await db.run(sql`
            -- Create tables if not exist
            CREATE TABLE IF NOT EXISTS products (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                price TEXT NOT NULL,
                category TEXT,
                image TEXT,
                is_active INTEGER DEFAULT 1,
                sort_order INTEGER DEFAULT 0,
                purchase_limit INTEGER,
                created_at INTEGER DEFAULT (unixepoch() * 1000)
            );
            CREATE TABLE IF NOT EXISTS cards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
                card_key TEXT NOT NULL,
                is_used INTEGER DEFAULT 0,
                reserved_order_id TEXT,
                reserved_at INTEGER,
                used_at INTEGER,
                created_at INTEGER DEFAULT (unixepoch() * 1000)
            );
            CREATE TABLE IF NOT EXISTS orders (
                order_id TEXT PRIMARY KEY,
                product_id TEXT NOT NULL,
                product_name TEXT NOT NULL,
                amount TEXT NOT NULL,
                email TEXT,
                payee TEXT,
                status TEXT DEFAULT 'pending',
                trade_no TEXT,
                card_key TEXT,
                paid_at INTEGER,
                delivered_at INTEGER,
                user_id TEXT,
                username TEXT,
                created_at INTEGER DEFAULT (unixepoch() * 1000)
            );
            CREATE TABLE IF NOT EXISTS login_users (
                user_id TEXT PRIMARY KEY,
                username TEXT,
                created_at INTEGER DEFAULT (unixepoch() * 1000),
                last_login_at INTEGER DEFAULT (unixepoch() * 1000)
            );
            -- Note: ALTER TABLE ADD COLUMN IF NOT EXISTS is not supported in SQLite
        `);

        return NextResponse.json({ success: true, message: "Database initialized successfully" });
    } catch (error: any) {
        console.error(error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
