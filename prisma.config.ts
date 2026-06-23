import "dotenv/config";
import { defineConfig } from "prisma/config";
import { resolve } from "node:path";

function toSqliteFileUrl(filePath: string): string {
  return `file:${filePath.replace(/\\/g, "/")}`;
}

function normalizeDatabaseUrl(url: string): string {
  if (!url.startsWith("file:")) {
    return url;
  }

  const sqlitePath = url.slice("file:".length);
  if (!sqlitePath.startsWith("./") && !sqlitePath.startsWith(".\\")) {
    return url;
  }

  return toSqliteFileUrl(resolve(process.cwd(), sqlitePath));
}

const isRenderRuntime = Boolean(process.env["RENDER"]) || process.env["NODE_ENV"] === "production";
const fallbackUrl = isRenderRuntime
  ? "file:/tmp/mk-academy.db"
  : toSqliteFileUrl(resolve(process.cwd(), "prisma", "dev.db"));
const databaseUrl = process.env["DATABASE_URL"]
  ? normalizeDatabaseUrl(process.env["DATABASE_URL"])
  : fallbackUrl;

if (!process.env["DATABASE_URL"]) {
  console.warn(
    `DATABASE_URL is not set. Falling back to ${fallbackUrl} for Prisma generate.`,
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
  },
});
