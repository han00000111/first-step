export type AppEnvironment = "local" | "preview" | "production";
export type SeedProfile = "local" | "preview" | "demo";

const supportedAppEnvironments = new Set<AppEnvironment>([
  "local",
  "preview",
  "production",
]);

const supportedSeedProfiles = new Set<SeedProfile>(["local", "preview", "demo"]);

export function resolveAppEnvironment(): AppEnvironment {
  const explicit = process.env.APP_ENV?.trim() as AppEnvironment | undefined;

  if (explicit && supportedAppEnvironments.has(explicit)) {
    return explicit;
  }

  const vercelEnvironment = process.env.VERCEL_ENV?.trim();

  if (vercelEnvironment === "production") {
    return "production";
  }

  if (vercelEnvironment === "preview") {
    return "preview";
  }

  return "local";
}

export function resolveSeedProfile(): SeedProfile {
  const explicit = process.env.SEED_PROFILE?.trim() as SeedProfile | undefined;

  if (explicit && supportedSeedProfiles.has(explicit)) {
    return explicit;
  }

  const appEnvironment = resolveAppEnvironment();

  if (appEnvironment === "production") {
    return "demo";
  }

  if (appEnvironment === "preview") {
    return "preview";
  }

  return "local";
}

export function maskDatabaseUrl(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return "未配置";
  }

  try {
    const parsed = new URL(databaseUrl);
    const databaseName = parsed.pathname.replace(/^\//, "") || "(default)";

    return `${parsed.protocol}//${parsed.hostname}:${parsed.port || "(default)"}/${databaseName}`;
  } catch {
    return "无法解析";
  }
}
