import Database from "better-sqlite3";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import { drizzle as drizzleSqliteProxy } from "drizzle-orm/sqlite-proxy";
import { drizzle as drizzleMySql } from "drizzle-orm/mysql2";
import { drizzle as drizzleMySqlProxy } from "drizzle-orm/mysql-proxy";
import { createPool, type Pool } from "mysql2/promise";
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { PHASE_EXPORT, PHASE_PRODUCTION_BUILD } from "next/constants";
import * as schema from "./schema";

export type DatabaseType = "sqlite" | "mysql";

function resolveDatabaseType(): DatabaseType {
    const configured = process.env.DB_TYPE?.trim().toLowerCase() || "sqlite";
    if (configured !== "sqlite" && configured !== "mysql") {
        throw new Error(`Unsupported DB_TYPE: ${configured}. Use sqlite or mysql.`);
    }
    return configured;
}

export const databaseType = resolveDatabaseType();
export const isMySql = databaseType === "mysql";

type DatabaseGlobals = {
    db?: any;
    sqlite?: Database.Database;
    mysqlPool?: Pool;
    databaseType?: DatabaseType;
};

const globalForDatabase = globalThis as typeof globalThis & DatabaseGlobals;

function isBuildPhase() {
    const phase = process.env.NEXT_PHASE;
    return phase === PHASE_PRODUCTION_BUILD || phase === PHASE_EXPORT;
}

function getDatabasePath() {
    const configuredPath = process.env.DATABASE_PATH?.trim();
    return configuredPath || path.join(process.cwd(), "data", "ldc-shop.sqlite");
}

function getMySqlUrl() {
    const url = process.env.DATABASE_URL?.trim() || process.env.MYSQL_URL?.trim();
    if (!url) throw new Error("DATABASE_URL is required when DB_TYPE=mysql");
    return url;
}

function addMySqlCompatibilityMethods(mysqlDb: any) {
    mysqlDb.run = (statement: any) => mysqlDb.execute(statement);
    mysqlDb.all = async (statement: any) => {
        const result = await mysqlDb.execute(statement);
        return Array.isArray(result) && Array.isArray(result[0]) ? result[0] : [];
    };
    return mysqlDb;
}

function createBuildDatabase() {
    if (isMySql) {
        return addMySqlCompatibilityMethods(
            drizzleMySqlProxy(async () => ({ rows: [] }), { schema }),
        );
    }
    return drizzleSqliteProxy(async () => ({ rows: [] }), { schema });
}

function createSqliteDatabase() {
    const databasePath = getDatabasePath();

    if (databasePath !== ":memory:") {
        fs.mkdirSync(path.dirname(databasePath), { recursive: true });
    }

    const sqlite = new Database(databasePath);
    sqlite.pragma("journal_mode = WAL");
    sqlite.pragma("foreign_keys = ON");
    sqlite.pragma("busy_timeout = 5000");

    globalForDatabase.sqlite = sqlite;
    return drizzleSqlite(sqlite, { schema });
}

function createMySqlDatabase() {
    const pool = createPool({
        uri: getMySqlUrl(),
        connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
        enableKeepAlive: true,
        supportBigNumbers: true,
        bigNumberStrings: false,
    });
    globalForDatabase.mysqlPool = pool;
    return addMySqlCompatibilityMethods(drizzleMySql(pool, { schema, mode: "default" }));
}

function createDatabase() {
    if (isBuildPhase()) return createBuildDatabase();
    return isMySql ? createMySqlDatabase() : createSqliteDatabase();
}

if (globalForDatabase.db && globalForDatabase.databaseType !== databaseType) {
    throw new Error("DB_TYPE cannot be changed without restarting the application");
}

export const db: any = globalForDatabase.db ?? createDatabase();

if (process.env.NODE_ENV !== "production") {
    globalForDatabase.db = db;
    globalForDatabase.databaseType = databaseType;
}

/**
 * Execute a static SQLite schema script.
 *
 * Drizzle's `db.run()` prepares exactly one statement, while SQLite schema
 * setup commonly contains a table plus one or more indexes.  Use the native
 * driver's `exec()` only for static, parameter-free DDL scripts so first boot
 * and on-demand schema compatibility checks work with better-sqlite3.
 */
export async function runSqliteScript(script: string): Promise<void> {
    if (isBuildPhase() || isMySql) return;

    const sqlite = globalForDatabase.sqlite;
    if (!sqlite) {
        throw new Error("SQLite connection is not available");
    }

    sqlite.exec(script);
}

export function randomOrder() {
    return isMySql ? sql`RAND()` : sql`RANDOM()`;
}

export function getAffectedRows(result: any): number {
    const candidate = Array.isArray(result) ? result[0] : result;
    return Number(candidate?.affectedRows ?? candidate?.changes ?? candidate?.meta?.changes ?? 0);
}

export function upsert(table: any, values: any, target: any, set: any, executor: any = db) {
    const query = executor.insert(table).values(values);
    return isMySql
        ? query.onDuplicateKeyUpdate({ set })
        : query.onConflictDoUpdate({ target, set });
}

export function insertOrIgnore(table: any, values: any, executor: any = db) {
    return isMySql
        ? executor.insert(table).ignore().values(values)
        : executor.insert(table).values(values).onConflictDoNothing();
}

export function insertReturningId(table: any, values: any, executor: any = db) {
    const query = executor.insert(table).values(values);
    return isMySql ? query.$returningId() : query.returning();
}
