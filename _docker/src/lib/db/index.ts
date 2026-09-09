import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleProxy } from "drizzle-orm/sqlite-proxy";
import fs from "fs";
import path from "path";
import { PHASE_EXPORT, PHASE_PRODUCTION_BUILD } from "next/constants";
import * as schema from "./schema";

type SqliteGlobals = {
    db?: any;
    sqlite?: Database.Database;
};

const globalForSqlite = globalThis as typeof globalThis & SqliteGlobals;

function isBuildPhase() {
    const phase = process.env.NEXT_PHASE;
    return phase === PHASE_PRODUCTION_BUILD || phase === PHASE_EXPORT;
}

function getDatabasePath() {
    const configuredPath = process.env.DATABASE_PATH?.trim();
    return configuredPath || path.join(process.cwd(), "data", "ldc-shop.sqlite");
}

function createBuildDatabase() {
    // Pages can be evaluated during next build, but the persistent SQLite file
    // must not be created or modified as part of image compilation.
    return drizzleProxy(async () => ({ rows: [] }), { schema });
}

function createRuntimeDatabase() {
    const databasePath = getDatabasePath();

    if (databasePath !== ":memory:") {
        fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    }

    const sqlite = new Database(databasePath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("busy_timeout = 5000");

    globalForSqlite.sqlite = sqlite;
    return drizzleSqlite(sqlite, { schema });
}

function createDatabase() {
    if (isBuildPhase()) {
        return createBuildDatabase();
    }

    return createRuntimeDatabase();
}

// Keep one connection in development, where Next.js reloads modules frequently.
export const db: any = globalForSqlite.db ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
    globalForSqlite.db = db;
}
