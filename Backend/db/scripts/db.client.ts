// db.client.ts
import { readFile } from "fs/promises";
import pool from "../../src/config/db.js";

export function splitStatements(sql: string): string[] {
  const stripped = sql
    .split("\n")
    .map((line) => {
      const commentIdx = line.indexOf("--");
      return commentIdx >= 0 ? line.slice(0, commentIdx) : line;
    })
    .join("\n");

  return stripped
    .split(";")
    .map((stmt) => stmt.trim())
    .filter((stmt) => stmt.length > 0);
}

export async function runSqlFile(filePath: string): Promise<void> {
  const raw = await readFile(filePath, "utf-8");
  const statements = splitStatements(raw);

  for (const [index, statement] of statements.entries()) {
    try {
      await pool.query(statement);
    } catch (err) {
      console.error(
        `Failed at statement ${index + 1}/${statements.length} in ${filePath}`,
      );
      console.error(statement);
      throw err;
    }
  }

  console.log(`Executed ${statements.length} statement(s) from ${filePath}`);
}
