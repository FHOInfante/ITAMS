// Run with: `npm run db:init`
import path from "path";
import { runSqlFile } from "./db.client.js";
import { runIndexFile } from "./db.index.js";

const SCHEMA_DIR = path.resolve("db/schema");

async function main() {
  await runSqlFile(path.join(SCHEMA_DIR, "CREATE_TABLES.SQL"));
  await runIndexFile(path.join(SCHEMA_DIR, "CREATE_INDEX.SQL"));
  await runSqlFile(path.join(SCHEMA_DIR, "CREATE_EVENTS.SQL"));
  console.log("Schema initialization complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Schema initialization failed:", err);
  process.exit(1);
});
