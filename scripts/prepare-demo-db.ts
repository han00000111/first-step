import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

function resolveSqliteFilePath(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("Only sqlite DATABASE_URL values are supported.");
  }

  const rawPath = databaseUrl.slice("file:".length);

  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }

  const normalized = rawPath.replace(/^\.[\\/]/, "");
  return path.resolve(process.cwd(), "prisma", normalized);
}

function main() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";
  const sourcePath = resolveSqliteFilePath(databaseUrl);
  const targetPath = path.resolve(process.cwd(), "prisma", "demo.db");

  if (!existsSync(sourcePath)) {
    throw new Error(`Source sqlite database not found: ${sourcePath}`);
  }

  mkdirSync(path.dirname(targetPath), { recursive: true });
  copyFileSync(sourcePath, targetPath);

  console.log(`Demo database snapshot updated: ${targetPath}`);
}

main();
