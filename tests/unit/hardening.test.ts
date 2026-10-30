/* Hardening (gap IDs from docs/TECHNICAL_GAP_REGISTER.md). */
import { afterEach, describe, expect, it } from "vitest";
import { signRole } from "../../src/server/session";

const saved = { NODE_ENV: process.env.NODE_ENV, APP_SECRET: process.env.APP_SECRET, ALLOW_DEMO_SIGNIN: process.env.ALLOW_DEMO_SIGNIN };
const env = process.env as Record<string, string | undefined>;
afterEach(() => { for (const [k, v] of Object.entries(saved)) { if (v === undefined) delete env[k]; else env[k] = v; } });

describe("RL-G05: no fallback signing secret outside development", () => {
  it("refuses a production build with demo sign-in and no APP_SECRET", () => {
    env.NODE_ENV = "production"; env.ALLOW_DEMO_SIGNIN = "1"; delete env.APP_SECRET;
    expect(() => signRole("staff")).toThrow(/APP_SECRET/);
  });
  it("refuses a short APP_SECRET outside development", () => {
    env.NODE_ENV = "production"; env.ALLOW_DEMO_SIGNIN = "1"; env.APP_SECRET = "too-short";
    expect(() => signRole("staff")).toThrow(/APP_SECRET/);
  });
  it("refuses an unknown or missing NODE_ENV without APP_SECRET", () => {
    delete env.NODE_ENV; delete env.APP_SECRET;
    expect(() => signRole("staff")).toThrow(/APP_SECRET/);
  });
  it("accepts a strong APP_SECRET in production", () => {
    env.NODE_ENV = "production"; env.APP_SECRET = "x".repeat(32);
    expect(signRole("staff")).toMatch(/^staff\.[A-Za-z0-9_-]+$/);
  });
  it("still uses the development key in development and tests", () => {
    delete env.APP_SECRET;
    env.NODE_ENV = "development"; expect(signRole("staff")).toMatch(/^staff\./);
    env.NODE_ENV = "test"; expect(signRole("staff")).toMatch(/^staff\./);
  });
});
