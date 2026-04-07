import { PrismaClient } from "@prisma/client";

import { maskDatabaseUrl, resolveAppEnvironment } from "@/lib/environment";

declare global {
  var prisma: PrismaClient | undefined;
}

const defaultLocalDatabaseUrl =
  "postgresql://postgres:postgres@127.0.0.1:5432/first_step_local?schema=public";

function resolveRuntimeDatabaseUrl() {
  return process.env.DATABASE_URL?.trim() || defaultLocalDatabaseUrl;
}

const explicitDatabaseUrl = process.env.DATABASE_URL?.trim() || null;
const databaseUrl = resolveRuntimeDatabaseUrl();
process.env.DATABASE_URL = databaseUrl;

export type PrismaSetupState = {
  appEnvironment: string;
  databaseProvider: "postgresql";
  databaseUrlMasked: string;
  setupError: string | null;
};

export const prismaSetupState: PrismaSetupState = {
  appEnvironment: resolveAppEnvironment(),
  databaseProvider: "postgresql",
  databaseUrlMasked: maskDatabaseUrl(databaseUrl),
  setupError: explicitDatabaseUrl
    ? null
    : "DATABASE_URL 未显式配置，当前回退到本地默认 Postgres 连接串。",
};

export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
