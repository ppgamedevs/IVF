import { createHash } from "crypto";

/**
 * Hash an IP address with SHA-256 + a secret salt.
 *
 * We never store raw IPs - only their salted hash - so that
 * rate-limiting and audit logs work without holding PII.
 */
export function hashIp(ip: string): string {
  const salt = process.env.IP_HASH_SALT || "fiv-match-default-salt";
  return createHash("sha256")
    .update(salt + ip)
    .digest("hex")
    .slice(0, 32); // 32 hex chars = 128 bits - plenty for uniqueness
}
