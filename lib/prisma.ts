import { copyFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

export type PrismaSetupState = {
  databaseUrl: string;
  sourcePath: string | null;
  targetPath: string | null;
  usingTmpDemoDatabase: boolean;
  setupError: string | null;
};

const prismaDirectory = path.join(/* turbopackIgnore: true */ process.cwd(), "prisma");
const defaultDemoDatabasePath = path.join(prismaDirectory, "demo.db");
const defaultDevDatabasePath = path.join(prismaDirectory, "dev.db");
const vercelDemoDatabaseUrl = "file:/tmp/first-step-demo.db";

function resolveRuntimeDatabaseUrl() {
  const explicitUrl = process.env.DATABASE_URL?.trim();

  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    if (explicitUrl && !explicitUrl.startsWith("file:")) {
      return explicitUrl;
    }

    return explicitUrl?.startsWith("file:/tmp/")
      ? explicitUrl
      : vercelDemoDatabaseUrl;
  }

  if (explicitUrl) {
    return explicitUrl;
  }

  return "file:./dev.db";
}

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

function findDeployableSourceDatabase() {
  const candidates = [defaultDemoDatabasePath, defaultDevDatabasePath];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function ensureDeployableDemoDatabase(): PrismaSetupState {
  const databaseUrl = resolveRuntimeDatabaseUrl();
  process.env.DATABASE_URL = databaseUrl;

  const targetPath = resolveSqliteDatabasePath(databaseUrl);
  const usingTmpDemoDatabase = Boolean(targetPath?.startsWith("/tmp/"));

  if (!usingTmpDemoDatabase) {
    return {
      databaseUrl,
      sourcePath: null,
      targetPath,
      usingTmpDemoDatabase,
      setupError: null,
    };
  }

  const sourcePath = findDeployableSourceDatabase();

  if (!sourcePath) {
    return {
      databaseUrl,
      sourcePath: null,
      targetPath,
      usingTmpDemoDatabase,
      setupError:
        "未找到可复制到 /tmp 的演示数据库快照。请确认 prisma/demo.db 已包含在部署产物中。",
    };
  }

  try {
    const hasUsableTarget = targetPath
      ? existsSync(targetPath) && statSync(targetPath).size > 0
      : false;

    if (!hasUsableTarget && targetPath) {
      mkdirSync(path.dirname(targetPath), { recursive: true });
      copyFileSync(sourcePath, targetPath);
    }

    return {
      databaseUrl,
      sourcePath,
      targetPath,
      usingTmpDemoDatabase,
      setupError: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sqlite copy error";

    return {
      databaseUrl,
      sourcePath,
      targetPath,
      usingTmpDemoDatabase,
      setupError: `演示数据库复制失败：${message}`,
    };
  }
}

export const prismaSetupState = ensureDeployableDemoDatabase();

// 在开发环境复用 PrismaClient，避免 Next.js 热更新时重复创建连接。
export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prisma = prisma;
}
