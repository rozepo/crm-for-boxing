import "dotenv/config";
import { defineConfig } from "prisma/config";

// `prisma generate` does not connect to the database, but Prisma still parses
// this config during Vercel's dependency installation. Keep generation usable
// before production environment variables are attached to the deployment.
const datasourceUrl =
  process.env.DIRECT_URL ??
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: datasourceUrl },
});
