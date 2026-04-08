import { PrismaClient } from "@prisma/client";

import { maskDatabaseUrl, resolveAppEnvironment } from "@/lib/environment";

declare global {
  var prisma: PrismaClient | undefined;
}

const defaultLocalDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public";

function resolveRuntimeDatabaseUrl() {
  const explicitDatabaseUrl = process.env.DATABASE_URL?.trim();

  if (explicitDatabaseUrl) {
    return explicitDatabaseUrl;
  }

  if (resolveAppEnvironment() === "local") {
    return defaultLocalDatabaseUrl;
  }

  return null;
}

const appEnvironment = resolveAppEnvironment();
const explicitDatabaseUrl = process.env.DATABASE_URL?.trim() || null;
const databaseUrl = resolveRuntimeDatabaseUrl();

if (databaseUrl) {
  process.env.DATABASE_URL = databaseUrl;
}

export type PrismaSetupState = {
  appEnvironment: string;
  databaseProvider: "postgresql";
  databaseUrlMasked: string;
  setupError: string | null;
};

export const prismaSetupState: PrismaSetupState = {
  appEnvironment,
  databaseProvider: "postgresql",
  databaseUrlMasked: maskDatabaseUrl(databaseUrl ?? undefined),
  setupError: explicitDatabaseUrl
    ? null
    : appEnvironment === "local"
      ? "DATABASE_URL 未显式配置，当前回退到本地默认 Postgres 连接串。"
      : "DATABASE_URL 未配置。Preview 和 Production 必须使用各自独立的 Postgres 数据源。",
};

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
