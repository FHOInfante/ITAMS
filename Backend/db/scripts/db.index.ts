// db.index.ts
import { readFile } from "fs/promises";
import pool from "../../src/config/db.js";
import { splitStatements } from "./db.client.js";

// MariaDB 10.4 does not support `CREATE INDEX IF NOT EXISTS`, so this
// checks information_schema.STATISTICS before each CREATE INDEX statement
// to keep db:init safely re-runnable, mirroring the IF NOT EXISTS behavior
// already used in CREATE_TABLES.SQL.
const CREATE_INDEX_PATTERN =
  /CREATE\s+(?:UNIQUE\s+)?INDEX\s+`?(\w+)`?\s+ON\s+`?(\w+)`?/i;

export async function runIndexFile(filePath: string): Promise<void> {
  const raw = await readFile(filePath, "utf-8");
  const statements = splitStatements(raw);

  let created = 0;
  let skipped = 0;

  for (const [index, statement] of statements.entries()) {
    const match = statement.match(CREATE_INDEX_PATTERN);

    if (!match) {
      console.error(
        `Statement ${index + 1}/${statements.length} in ${filePath} is not a recognized CREATE INDEX statement`,
      );
      console.error(statement);
      throw new Error(`Unrecognized statement in ${filePath}`);
    }

    const [, indexName, tableName] = match;

    try {
      const [rows] = await pool.query(
        `SELECT 1 FROM information_schema.STATISTICS
         WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = ?
           AND INDEX_NAME = ?
         LIMIT 1`,
        [tableName, indexName],
      );

      if (Array.isArray(rows) && rows.length > 0) {
        skipped++;
        continue;
      }

      await pool.query(statement);
      created++;
    } catch (err) {
      console.error(
        `Failed at statement ${index + 1}/${statements.length} in ${filePath}`,
      );
      console.error(statement);
      throw err;
    }
  }

  console.log(
    `Indexes from ${filePath}: ${created} created, ${skipped} already existed (skipped).`,
  );
}
