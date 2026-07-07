import "dotenv/config";
import { readFile } from "node:fs/promises";
import { Client } from "pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) throw new Error("DIRECT_URL or DATABASE_URL is not configured");

async function main() {
  const client = new Client({ connectionString, connectionTimeoutMillis: 8_000 });
  client.on("error", (error) => console.error("Postgres connection error:", error.message));
  await client.connect();
  try {
    const sql = await readFile(new URL("./seed-data.sql", import.meta.url), "utf8");
    await client.query(sql);
    console.log("Supabase seed completed");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
