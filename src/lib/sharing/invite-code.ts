import crypto from "crypto";

export function generateInviteCode(): string {
  return crypto.randomBytes(16).toString("hex");
}
