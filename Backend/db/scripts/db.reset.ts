// Run with:            `npm run db:reset`
// Run with dummy data: `npm run db:reset -- --with-dummy`
import path from "path";
import pool from "../../src/config/db.js";
import { runSqlFile } from "./db.client.js";
import { runIndexFile } from "./db.index.js";

const SEED_DIR = path.resolve("db/seed");

// Listed in reverse-dependency order (children before parents). FK checks
// are disabled below anyway, as a safety net in case this list ever drifts
// from the actual schema's dependency graph.
const TABLES_IN_DROP_ORDER = [
  "audit_log_detail",
  "audit_log",
  "purchase_request_item",
  "purchase_request",
  "ups",
  "printer",
  "network_device",
  "computer_program",
  "program",
  "computer_peripheral",
  "peripheral",
  "software",
  "computer",
  "end_user",
  "category",
  "vendor",
  "department",
  "user_permission",
  "permission",
  "user_credential",
  "user",
];

async function dropAllTables() {
  await pool.query("SET FOREIGN_KEY_CHECKS = 0");
  for (const table of TABLES_IN_DROP_ORDER) {
    await pool.query(`DROP TABLE IF EXISTS \`${table}\``);
  }
  await pool.query("SET FOREIGN_KEY_CHECKS = 1");
  console.log("All tables dropped.");
}

async function main() {
  const withDummy = process.argv.includes("--with-dummy");

  await dropAllTables();

  await runSqlFile(path.resolve("db/schema/CREATE_TABLES.SQL"));
  await runIndexFile(path.resolve("db/schema/CREATE_INDEX.SQL"));
  await runSqlFile(path.resolve("db/schema/CREATE_EVENTS.SQL"));
  await runSqlFile(path.join(SEED_DIR, "INSERT_INITIAL_VALUES.SQL"));

  if (withDummy) {
    await runSqlFile(path.join(SEED_DIR, "INSERT_DUMMY_DATA.SQL"));
    console.log("Dummy data loaded.");
  }

  console.log("Database reset complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Reset failed:", err);
  process.exit(1);
});
