/**
 * City-based clinic lead routing.
 *
 * Routes leads to specific clinic emails based on the patient's city.
 * Falls back to the default CLINIC_LEADS_EMAIL when no rule matches.
 *
 * ── Configuration ──────────────────────────────────────────────────
 *
 * Set CLINIC_ROUTING_RULES as a JSON array in your environment:
 *
 *   CLINIC_ROUTING_RULES='[
 *     { "email": "bucuresti-clinic@example.com", "cities": ["București", "Ilfov", "Ploiești"] },
 *     { "email": "cluj-clinic@example.com",      "cities": ["Cluj-Napoca", "Sibiu", "Brașov"] }
 *   ]'
 *
 * City matching is case-insensitive and diacritic-insensitive, so
 * "bucuresti", "BUCUREȘTI", and "Bucureşti" all match "București".
 *
 * If the env var is missing, empty, or invalid JSON, all leads go
 * to CLINIC_LEADS_EMAIL (the default). A warning is logged once.
 *
 * ── Future: Neon/Supabase table ────────────────────────────────────
 *
 * When the "clinics" table is ready, swap `loadRulesFromEnv()` for
 * a cached DB query. The public API (`resolveClinicEmail`) stays the
 * same - callers don't need to change.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RoutingRule {
  email: string;
  cities: string[];
}

export interface RoutingResult {
  /** The email address to send the clinic notification to. */
  clinicEmail: string;
  /** Which rule matched, or "default" if none did. */
  matchedRule: string;
}

// ---------------------------------------------------------------------------
// Normalization - strip diacritics and lowercase for fuzzy city matching
// ---------------------------------------------------------------------------

function normalize(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")  // strip combining diacritics
    .replace(/[\u0218\u0219]/g, "s")  // Ș/ș (comma-below variants)
    .replace(/[\u021A\u021B]/g, "t")  // Ț/ț (comma-below variants)
    .replace(/[^a-z0-9\s\-]/g, "");   // remove remaining non-alphanumeric
}

// ---------------------------------------------------------------------------
// Rule loading (from env - cached after first parse)
// ---------------------------------------------------------------------------

interface CompiledRule {
  email: string;
  normalizedCities: Set<string>;
  originalCities: string[];
}

let _compiled: CompiledRule[] | null = null;
let _warned = false;

function loadRules(): CompiledRule[] {
  if (_compiled !== null) return _compiled;

  const raw = process.env.CLINIC_ROUTING_RULES;

  if (!raw || raw.trim() === "") {
    _compiled = [];
    return _compiled;
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error("CLINIC_ROUTING_RULES must be a JSON array");
    }

    _compiled = parsed
      .filter((rule: unknown): rule is RoutingRule => {
        if (!rule || typeof rule !== "object") return false;
        const r = rule as Record<string, unknown>;
        return (
          typeof r.email === "string" &&
          r.email.includes("@") &&
          Array.isArray(r.cities) &&
          r.cities.length > 0 &&
          r.cities.every((c: unknown) => typeof c === "string")
        );
      })
      .map((rule) => ({
        email: rule.email.trim(),
        normalizedCities: new Set(rule.cities.map(normalize)),
        originalCities: rule.cities,
      }));

    if (_compiled.length > 0) {
      console.log(
        `[clinic-routing] Loaded ${_compiled.length} routing rule(s): ${_compiled
          .map((r) => `${r.email} → [${r.originalCities.join(", ")}]`)
          .join("; ")}`,
      );
    }
  } catch (err) {
    if (!_warned) {
      console.warn(
        "[clinic-routing] Failed to parse CLINIC_ROUTING_RULES:",
        err instanceof Error ? err.message : err,
      );
      _warned = true;
    }
    _compiled = [];
  }

  return _compiled;
}

// ---------------------------------------------------------------------------
// Default fallback
// ---------------------------------------------------------------------------

function getDefaultClinicEmail(): string {
  const email =
    process.env.CLINIC_LEADS_EMAIL || process.env.CLINIC_NOTIFICATION_EMAIL;
  if (!email) {
    throw new Error("Missing CLINIC_LEADS_EMAIL environment variable.");
  }
  return email;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Resolve which clinic email should receive a lead based on the patient's city.
 *
 * @param city - The patient's city as entered in the form.
 * @returns The target clinic email and which rule matched.
 */
export function resolveClinicEmail(city: string): RoutingResult {
  const rules = loadRules();
  const normalizedCity = normalize(city);

  for (const rule of rules) {
    if (rule.normalizedCities.has(normalizedCity)) {
      return {
        clinicEmail: rule.email,
        matchedRule: `city-match: ${city} → ${rule.email}`,
      };
    }
  }

  return {
    clinicEmail: getDefaultClinicEmail(),
    matchedRule: "default",
  };
}

/**
 * Get the internal monitoring email (CC on every clinic notification).
 * Returns undefined if not configured.
 */
export function getMonitorEmail(): string | undefined {
  return process.env.INTERNAL_LEADS_MONITOR_EMAIL || undefined;
}

/**
 * Force-reload routing rules from env.
 * Useful for testing or if env vars change at runtime.
 */
export function _resetRoutingCache(): void {
  _compiled = null;
  _warned = false;
}
