import { defineConfig } from "drizzle-kit";
import { config } from 'dotenv';
import fs from "fs";
import path from "path";

config({ path: '.env.local' });
config({ path: '.env' });

const databasePath = process.env.DATABASE_PATH || './data/ldc-shop.sqlite';
if (databasePath !== ':memory:') {
    fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

export default defineConfig({
    schema: "./src/lib/db/schema.ts",
    out: "./lib/db/migrations",
    dialect: "sqlite",
    dbCredentials: {
        url: databasePath,
    },
});
