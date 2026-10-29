/* Prototype sign-in ("Viewing as"). The chosen persona is kept in a signed
 * cookie and resolved on the server for every request and action, so each
 * screen and action is checked against the role on the server.
 * This is a demo switcher, not authentication: production identity comes
 * from OneUI single sign-on [ASSUMED] (docs/HANDOVER.md §Security). */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { isRole, ROLES, type RoleKey } from "@/domain/config";
import type { Viewer } from "@/domain/types";

export const ROLE_COOKIE = "rl_role";
const secret = () => {
  const s = process.env.APP_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SIGNIN !== "1") throw new Error("APP_SECRET (32+ characters) is required in production.");
  return "dev-only-reference-letters-secret-change-me-000000";
};
const mac = (v: string) => createHmac("sha256", secret()).update("role:" + v).digest("base64url");
export const signRole = (r: RoleKey) => r + "." + mac(r);
function unsign(s?: string): RoleKey | null {
  if (!s) return null; const i = s.lastIndexOf("."); if (i < 1) return null;
  const v = s.slice(0, i), a = Buffer.from(s.slice(i + 1)), b = Buffer.from(mac(v));
  return a.length === b.length && timingSafeEqual(a, b) && isRole(v) ? v : null;
}
export const demoAllowed = () => process.env.NODE_ENV !== "production" || process.env.ALLOW_DEMO_SIGNIN === "1";

export async function getViewer(): Promise<Viewer> {
  if (!demoAllowed()) throw new Error("Demo sign-in is disabled. Connect OneUI single sign-on (docs/HANDOVER.md).");
  const role = unsign((await cookies()).get(ROLE_COOKIE)?.value) ?? "staff";
  return { role, emp: ROLES[role].emp, name: ROLES[role].name };
}
