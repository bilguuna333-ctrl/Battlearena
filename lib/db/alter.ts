import { sql } from "drizzle-orm";
import { db } from "./src";

async function main() {
  try {
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;`);
    console.log("Success");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
main();
