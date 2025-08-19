import { createHash } from "crypto";

const SECRET = process.env.UNSUBSCRIBE_SECRET!;

export function generateUnsubscribeToken(email: string) {
  return createHash("sha256")
    .update(email + SECRET)
    .digest("base64url");
}

export function validateUnsubscribeToken(email: string, token: string) {
  return generateUnsubscribeToken(email) === token;
}
