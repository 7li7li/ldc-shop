import { defineConfig } from "drizzle-kit";
import { config } from 'dotenv';

config({ path: '.env.local' });

export default defineConfig({
    schema: "./src/lib/db/schema.ts",
    out: "./src/lib/db/migrations",
    dialect: "sqlite",
    dbCredentials: {
        url: process.env.LOCAL_DB_PATH || 'local.sqlite',
    },
});
