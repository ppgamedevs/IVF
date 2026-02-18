import type { LeadPayload } from "./validation";

// ---------------------------------------------------------------------------
// 1. Rate limiter - in-memory sliding window per IP
// ---------------------------------------------------------------------------

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

const RATE_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const RATE_MAX_REQUESTS = 5; // max submissions per window

function pruneExpiredBuckets() {
  const now = Date.now();
  rateBuckets.forEach((bucket, key) => {
    if (now > bucket.resetAt) rateBuckets.delete(key);
  });
}

// Clean up every 5 minutes to prevent memory leaks in long-lived instances
if (typeof setInterval !== "undefined") {
  setInterval(pruneExpiredBuckets, 5 * 60 * 1000).unref?.();
}

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(ip);

  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return false;
  }

  bucket.count++;
  return bucket.count > RATE_MAX_REQUESTS;
}

// ---------------------------------------------------------------------------
// 2. Honeypot check - if the hidden field has any value, it's a bot
// ---------------------------------------------------------------------------

export function isHoneypotFilled(body: Record<string, unknown>): boolean {
  const value = body._company;
  return typeof value === "string" && value.length > 0;
}

// ---------------------------------------------------------------------------
// 3. Timing check - if submission arrives < 3 seconds after render, it's a bot
// ---------------------------------------------------------------------------

const MIN_FILL_TIME_MS = 3_000;

export function isSubmittedTooFast(body: Record<string, unknown>): boolean {
  const rendered = body._rendered;
  if (typeof rendered !== "number") return true; // missing timestamp = suspicious
  const elapsed = Date.now() - rendered;
  return elapsed < MIN_FILL_TIME_MS;
}

// ---------------------------------------------------------------------------
// 4. Content-based spam detection
// ---------------------------------------------------------------------------

const URL_REGEX = /https?:\/\/|www\./i;
const MARKUP_REGEX = /<[^>]+>|\[url|{.*}/i;
const REPEATED_CHARS = /(.)\1{7,}/;
const EXCESSIVE_NUMBERS_IN_NAME = /\d{3,}/;

function hasUrls(text: string): boolean {
  return URL_REGEX.test(text);
}

function hasMarkup(text: string): boolean {
  return MARKUP_REGEX.test(text);
}

function hasRepeatedChars(text: string): boolean {
  return REPEATED_CHARS.test(text);
}

function isGibberish(text: string): boolean {
  if (text.length < 2) return false;
  const consonants = text.replace(/[^bcdfghjklmnpqrstvwxyz]/gi, "");
  return consonants.length > 8 && consonants.length / text.length > 0.85;
}

export function isSpamContent(lead: LeadPayload): { spam: boolean; reason?: string } {
  const nameFields = [lead.first_name, lead.last_name];
  const textFields = [lead.first_name, lead.last_name, lead.city, lead.message || ""];

  // URLs in any field
  for (const text of textFields) {
    if (hasUrls(text)) return { spam: true, reason: "url_in_field" };
  }

  // HTML/BBCode markup in any field
  for (const text of textFields) {
    if (hasMarkup(text)) return { spam: true, reason: "markup_in_field" };
  }

  // Repeated characters (e.g. "aaaaaaaa")
  for (const text of textFields) {
    if (hasRepeatedChars(text)) return { spam: true, reason: "repeated_chars" };
  }

  // Numbers in name fields
  for (const name of nameFields) {
    if (EXCESSIVE_NUMBERS_IN_NAME.test(name)) return { spam: true, reason: "numbers_in_name" };
  }

  // Gibberish names (e.g. "bxfthrmkl")
  for (const name of nameFields) {
    if (isGibberish(name)) return { spam: true, reason: "gibberish_name" };
  }

  // Identical first and last name
  if (
    lead.first_name.toLowerCase() === lead.last_name.toLowerCase() &&
    lead.first_name.length > 1
  ) {
    return { spam: true, reason: "identical_names" };
  }

  // Message is suspiciously long (>2000 chars)
  if (lead.message && lead.message.length > 2000) {
    return { spam: true, reason: "message_too_long" };
  }

  return { spam: false };
}
