import { createHmac, timingSafeEqual } from "node:crypto";

import { demoSessionSecret } from "@/lib/config";

export const DEMO_COOKIE = "gata_demo_session";

function sign(value: string): string {
  return createHmac("sha256", demoSessionSecret()).update(value).digest("base64url");
}

/** Token format: "<authUserId>.<hmac>" (demo mode only). */
export function createDemoToken(authUserId: string): string {
  return `${authUserId}.${sign(authUserId)}`;
}

export function verifyDemoToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const id = token.slice(0, dot);
  const given = Buffer.from(token.slice(dot + 1));
  const expected = Buffer.from(sign(id));
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return /^[0-9a-f-]{36}$/i.test(id) ? id : null;
}
