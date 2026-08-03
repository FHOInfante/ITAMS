// Run with: `npm run db:seed`
import path from "path";
import { runSqlFile } from "./db.client.js";

const SEED_DIR = path.resolve("db/seed");

async function main() {
  await runSqlFile(path.join(SEED_DIR, "INSERT_INITIAL_VALUES.SQL"));
  console.log("Initial seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
