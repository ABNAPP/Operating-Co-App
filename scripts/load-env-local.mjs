import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Loads `.env.local` into process.env (does not override existing env vars).
 */
export function loadEnvLocal(cwd = process.cwd()) {
  const path = resolve(cwd, ".env.local");
  if (!existsSync(path)) {
    return { loaded: false, path };
  }

  const content = readFileSync(path, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    value = value.replace(/\\n/g, "\n");

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return { loaded: true, path };
}
