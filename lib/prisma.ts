import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

const prismaDirectory = path.join(/* turbopackIgnore: true */ process.cwd(), "prisma");
const defaultDemoDatabasePath = path.join(prismaDirectory, "demo.db");
const defaultDevDatabasePath = path.join(prismaDirectory, "dev.db");

function resolveSqliteDatabasePath(databaseUrl: string) {
  if (!databaseUrl.startsWith("file:")) {
    return null;
  }

  const rawPath = databaseUrl.slice("file:".length);

  if (path.isAbsolute(rawPath)) {
    return rawPath;
  }

  const normalized = rawPath.replace(/^\.[\\/]/, "");
  return path.join(prismaDirectory, normalized);
}

function ensureDeployableDemoDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return;
  }

  const targetPath = resolveSqliteDatabasePath(databaseUrl);

  if (!targetPath || !targetPath.startsWith("/tmp/")) {
    return;
  }

  if (existsSync(targetPath)) {
    return;
  }

  const sourceCandidates = [defaultDemoDatabasePath, defaultDevDatabasePath];

  const sourcePath = sourceCandidates.find((candidate) => existsSync(candidate));

  if (!sourcePath) {
    return;
  }

  mkdirSync(path.dirname(targetPath), { recursive: true });
  copyFileSync(sourcePath, targetPath);
}

ensureDeployableDemoDatabase();

// 在开发环境复用 PrismaClient，避免 Next.js 热更新时重复创建连接。
export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
