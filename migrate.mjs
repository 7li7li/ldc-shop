import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

const databasePath = process.env.DATABASE_PATH || "/app/data/ldc-shop.sqlite";

if (databasePath !== ":memory:") {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });
}

const sqlite = new Database(databasePath);
sqlite.pragma("foreign_keys = ON");

function tableExists(table) {
  return Boolean(
    sqlite
      .prepare("SELECT 1 FROM sqlite_master WHERE type = ? AND name = ?")
      .get("table", table),
  );
}

function tableColumns(table) {
  return new Set(
    sqlite
      .prepare(`PRAGMA table_info("${table.replaceAll('"', '""')}")`)
      .all()
      .map((column) => column.name),
  );
}

function ensureColumn(table, column, definition) {
  if (!tableExists(table) || tableColumns(table).has(column)) {
    return false;
  }

  sqlite.exec(
    `ALTER TABLE "${table.replaceAll('"', '""')}" ADD COLUMN "${column.replaceAll('"', '""')}" ${definition}`,
  );
  return true;
}

let changed = 0;

// These fields were introduced after the original Docker SQLite release.
// Adding them before drizzle-kit inspects the database avoids a destructive
// table rebuild and preserves existing products during an upgrade.
for (const [column, definition] of [
  ["product_images", "TEXT"],
  ["purchase_url", "TEXT"],
  ["variant_group_id", "TEXT"],
  ["variant_label", "TEXT"],
  ["purchase_questions", "TEXT"],
]) {
  if (ensureColumn("products", column, definition)) {
    changed += 1;
  }
}

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS review_replies (
    id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL,
    review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    username TEXT NOT NULL,
    comment TEXT NOT NULL,
    created_at INTEGER
  )
`);

sqlite.close();
console.log(`[db] compatibility migration complete (${changed} product columns added)`);
