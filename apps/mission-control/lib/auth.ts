import crypto from "crypto";
import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { requireAuthSecret, timingSafeEqualString } from "@/lib/security";

const SESSION_TTL_SECONDS = 60 * 60 * 12;

type SessionPayload = {
  userId: string;
  workspaceId: string;
  exp: number;
};

function secret(): string {
  return requireAuthSecret();
}

export function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const actualSalt = salt ?? crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, actualSalt, 64).toString("hex");
  return { salt: actualSalt, hash };
}

export function verifyPassword(password: string, salt: string, hash: string): boolean {
  const next = hashPassword(password, salt).hash;
  const left = Buffer.from(next, "hex");
  const right = Buffer.from(hash, "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function sign(input: string): string {
  return crypto.createHmac("sha256", secret()).update(input).digest("hex");
}

function encode(payload: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(body);
  return `${body}.${signature}`;
}

function decode(token: string): SessionPayload | null {
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!timingSafeEqualString(sign(body), signature, "hex")) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf-8")) as SessionPayload;
    if (!payload.userId || !payload.workspaceId || !payload.exp) return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function createSessionToken(userId: string, workspaceId: string): string {
  return encode({
    userId,
    workspaceId,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS
  });
}

export function readSession(token?: string): SessionPayload | null {
  if (!token) return null;
  return decode(token);
}

export { SESSION_COOKIE_NAME };
