import { defineConfig } from "drizzle-kit";
import { config } from 'dotenv';
import fs from "fs";
import path from "path";

config({ path: '.env.local' });
config({ path: '.env' });

const databaseType = process.env.DB_TYPE?.trim().toLowerCase() || 'sqlite';
const databasePath = process.env.DATABASE_PATH || './data/ldc-shop.sqlite';
if (databaseType === 'sqlite' && databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

export default databaseType === 'mysql'
    ? defineConfig({
        schema: "./src/lib/db/schema.mysql.ts",
        out: "./lib/db/migrations/mysql",
        dialect: "mysql",
        dbCredentials: {
            url: process.env.DATABASE_URL || process.env.MYSQL_URL || '',
        },
    })
    : defineConfig({
        schema: "./src/lib/db/schema.sqlite.ts",
        out: "./lib/db/migrations",
        dialect: "sqlite",
        dbCredentials: {
            url: databasePath,
        },
    });
