/**
 * Backend-only bilingual strings.
 *
 * Separate from frontend next-intl messages.
 * Covers API responses, validation errors, and email content.
 */

export type SupportedLocale = "ro" | "en";

const VALID_LOCALES: readonly SupportedLocale[] = ["ro", "en"];

export function resolveLocale(raw: unknown): SupportedLocale {
  if (typeof raw === "string" && VALID_LOCALES.includes(raw as SupportedLocale)) {
    return raw as SupportedLocale;
  }
  return "ro";
}

type Bi = Record<SupportedLocale, string>;

function t(bi: Bi, locale: SupportedLocale): string {
  return bi[locale];
}

// ---------------------------------------------------------------------------
// Validation errors
// ---------------------------------------------------------------------------

const VALIDATION: Record<string, Bi> = {
  first_name_required: {
    ro: "Prenumele este obligatoriu",
    en: "First name is required",
  },
  last_name_required: {
    ro: "Numele de familie este obligatoriu",
    en: "Last name is required",
  },
  phone_required: {
    ro: "Numarul de telefon este obligatoriu",
    en: "Phone number is required",
  },
  phone_invalid: {
    ro: "Numarul de telefon nu pare valid (ex. +40 7XX XXX XXX)",
    en: "This phone number doesn't look valid (e.g. +40 7XX XXX XXX)",
  },
  email_required: {
    ro: "Adresa de email este obligatorie",
    en: "Email address is required",
  },
  email_invalid: {
    ro: "Adresa de email nu pare corecta",
    en: "This email address doesn't look right",
  },
  age_range_invalid: {
    ro: "Selecteaza varsta",
    en: "Select your age",
  },
  tried_ivf_invalid: {
    ro: "Selecteaza o optiune",
    en: "Select an option",
  },
  timeline_invalid: {
    ro: "Selecteaza un termen",
    en: "Select a timeline",
  },
  city_required: {
    ro: "Completeaza orasul",
    en: "Enter your city",
  },
  budget_range_invalid: {
    ro: "Selecteaza bugetul estimativ",
    en: "Select your estimated budget",
  },
  gdpr_required: {
    ro: "Trebuie sa accepti prelucrarea datelor pentru a continua",
    en: "You need to accept data processing to continue",
  },
  consent_to_share_required: {
    ro: "Trebuie sa accepti partajarea datelor pentru a continua",
    en: "You must agree to data sharing to continue",
  },
  female_age_exact_required: {
    ro: "Vârsta (femeie) este obligatorie",
    en: "Female age is required",
  },
  urgency_level_required: {
    ro: "Selectează un termen",
    en: "Select a timeline",
  },
  invalid_body: {
    ro: "Cererea nu este valida",
    en: "Invalid request body",
  },
};

export function validationError(key: string, locale: SupportedLocale): string {
  const bi = VALIDATION[key];
  return bi ? t(bi, locale) : key;
}

// ---------------------------------------------------------------------------
// API response messages
// ---------------------------------------------------------------------------

const API: Record<string, Bi> = {
  success: {
    ro: "Solicitarea ta a fost primita. Vom confirma detaliile in curand. O clinica partenera te va contacta dupa verificare.",
    en: "We received your request and will confirm details shortly. A partner clinic will contact you after verification.",
  },
  nextSteps: {
    ro: "Vom verifica solicitarea ta si o clinica partenera te va contacta dupa aprobare.",
    en: "We will verify your request and a partner clinic will contact you after approval.",
  },
  validationFailed: {
    ro: "Verifica campurile marcate.",
    en: "Please check the highlighted fields.",
  },
  serverError: {
    ro: "A aparut o eroare. Incearca din nou.",
    en: "An error occurred. Please try again.",
  },
  invalidJson: {
    ro: "Cererea nu a putut fi procesata.",
    en: "The request could not be processed.",
  },
};

export function apiMessage(key: string, locale: SupportedLocale): string {
  const bi = API[key];
  return bi ? t(bi, locale) : key;
}

// ---------------------------------------------------------------------------
// Intent scoring
// ---------------------------------------------------------------------------

export type IntentLevel = "high" | "medium" | "low";

/** Input for intent derivation. urgency_level is primary; timeline + budget used as fallback. */
export interface IntentInput {
  /** Primary: ASAP_0_30 | SOON_1_3 | MID_3_6 | LATER_6_12 | INFO_ONLY */
  urgency_level?: string | null;
  /** Fallback / legacy: asap | 1-3months | researching */
  timeline?: string;
  budget_range?: string;
  has_recent_tests?: boolean | null;
  /** APPROVED_* = voucher approved (boosts intent) */
  voucher_status?: string | null;
}

const URGENCY_HIGH = ["ASAP_0_30", "SOON_1_3"];
const BUDGET_KNOWN = ["under-10k", "10k-20k", "over-20k"];
const VOUCHER_APPROVED = ["APPROVED_ASSMB", "APPROVED_NATIONAL", "APPROVED_OTHER"];

function isBudgetKnown(budgetRange?: string | null): boolean {
  return !!budgetRange && BUDGET_KNOWN.includes(budgetRange);
}

/**
 * Derive lead intent from form fields (urgency, budget, tests, voucher).
 *   High:   ASAP or 1–3 months + budget known; optional boost from recent tests / voucher approved.
 *   Medium: ASAP/1–3mo with prefer-discuss, or 3–6 months, or 6–12 months with budget known.
 *   Low:    INFO_ONLY, or 6–12 months without budget, or researching.
 */
export function deriveIntentLevel(
  input: IntentInput | string,
  budgetRange?: string
): IntentLevel {
  // Legacy signature: deriveIntentLevel(timeline, budgetRange)
  if (typeof input === "string") {
    const timeline = input;
    const budget = budgetRange;
    if (timeline === "researching") return "low";
    if (timeline === "asap" || timeline === "1-3months") {
      if (budget === "prefer-discuss") return "medium";
      return "high";
    }
    return "low";
  }

  const { urgency_level, timeline, budget_range, has_recent_tests, voucher_status } = input;

  const budgetKnown = isBudgetKnown(budget_range);
  const voucherApproved = !!voucher_status && VOUCHER_APPROVED.includes(voucher_status);

  // 1) Info-only or researching → low
  if (urgency_level === "INFO_ONLY") return "low";
  if (timeline === "researching" && !urgency_level) return "low";

  // 2) Later 6–12 months: medium if budget known, else low
  if (urgency_level === "LATER_6_12") {
    return budgetKnown ? "medium" : "low";
  }

  // 3) Mid 3–6 months → medium (optional: high if budget known + tests/voucher)
  if (urgency_level === "MID_3_6") {
    if (budgetKnown && (has_recent_tests || voucherApproved)) return "high";
    return "medium";
  }

  // 4) ASAP or 1–3 months
  if (URGENCY_HIGH.includes(urgency_level ?? "")) {
    if (budgetKnown) return "high";
    if (budget_range === "prefer-discuss") return "medium";
    return "high"; // ASAP/SOON without budget still high intent
  }

  // Fallback: use timeline if no urgency_level
  if (timeline === "asap" || timeline === "1-3months") {
    if (budget_range === "prefer-discuss") return "medium";
    return "high";
  }

  return "low";
}

const INTENT_LABELS: Record<IntentLevel, Bi> = {
  high: { ro: "Intent ridicat", en: "High intent" },
  medium: { ro: "Intent mediu", en: "Medium intent" },
  low: { ro: "Doar informativ", en: "Informational only" },
};

export function intentLabel(level: IntentLevel, locale: SupportedLocale): string {
  return t(INTENT_LABELS[level], locale);
}

// ---------------------------------------------------------------------------
// Clinic notification email
// ---------------------------------------------------------------------------

const CLINIC_SUBJECT: Record<IntentLevel, Bi> = {
  high: { ro: "Lead nou FIV - intent ridicat", en: "New IVF Lead - high intent" },
  medium: { ro: "Lead nou FIV - intent mediu", en: "New IVF Lead - medium intent" },
  low: { ro: "Lead nou FIV - doar informativ", en: "New IVF Lead - informational only" },
};

export function clinicSubject(locale: SupportedLocale, intent: IntentLevel = "high"): string {
  return t(CLINIC_SUBJECT[intent], locale);
}

const CLINIC_LABELS: Record<string, Bi> = {
  name: { ro: "Nume", en: "Name" },
  email: { ro: "Email", en: "Email" },
  phone: { ro: "Telefon", en: "Phone" },
  ageRange: { ro: "Varsta", en: "Age" },
  triedIvf: { ro: "A mai incercat FIV", en: "Tried IVF Before" },
  timeline: { ro: "Termen dorit", en: "Timeline" },
  city: { ro: "Oras", en: "City" },
  message: { ro: "Mesaj", en: "Message" },
  budgetRange: { ro: "Buget estimativ", en: "Estimated Budget" },
  gdpr: { ro: "Consimtamant GDPR", en: "GDPR Consent" },
  intentLevel: { ro: "Nivel de intent", en: "Intent Level" },
};

export function clinicLabel(key: string, locale: SupportedLocale): string {
  const bi = CLINIC_LABELS[key];
  return bi ? t(bi, locale) : key;
}

const CLINIC_TRIED_IVF: Record<string, Bi> = {
  Yes: { ro: "Da", en: "Yes" },
  No: { ro: "Nu", en: "No" },
  InProgress: { ro: "In curs", en: "In progress" },
};

export function clinicYesNo(value: string, locale: SupportedLocale): string {
  const bi = CLINIC_TRIED_IVF[value];
  return bi ? t(bi, locale) : value;
}

const TIMELINE_LABELS: Record<string, Bi> = {
  asap: { ro: "Cat mai curand", en: "As soon as possible" },
  "1-3months": { ro: "In 1-3 luni", en: "Within 1-3 months" },
  researching: { ro: "Doar se informeaza", en: "Just researching" },
};

export function clinicTimeline(value: string, locale: SupportedLocale): string {
  const bi = TIMELINE_LABELS[value];
  return bi ? t(bi, locale) : value;
}

const BUDGET_LABELS: Record<string, Bi> = {
  "under-10k": { ro: "Fonduri proprii", en: "Own funds" },
  "10k-20k": { ro: "Programul de Stat", en: "State Program" },
  "over-20k": { ro: "Credit medical", en: "Medical credit" },
  "prefer-discuss": { ro: "Preferă să discute cu clinica", en: "Prefers to discuss with clinic" },
};

export function clinicBudget(value: string, locale: SupportedLocale): string {
  const bi = BUDGET_LABELS[value];
  return bi ? t(bi, locale) : value;
}

const TEST_STATUS_LABELS: Record<string, Bi> = {
  "ready": { ro: "Analizele sunt gata", en: "Tests are ready" },
  "pending": { ro: "Analizele sunt în curs", en: "Tests are in progress" },
  "not-started": { ro: "Nu am început analizele", en: "Haven't started tests" },
  "unknown": { ro: "Nu știu", en: "Don't know" },
};

export function testStatusDisplay(value: string | null | undefined, locale: SupportedLocale): string {
  if (!value) return locale === "ro" ? "—" : "—";
  const bi = TEST_STATUS_LABELS[value];
  return bi ? t(bi, locale) : value;
}

// Phase 2: Urgency level labels
const URGENCY_LABELS: Record<string, Bi> = {
  "ASAP_0_30": { ro: "Cât mai curând (0-30 zile)", en: "As soon as possible (0-30 days)" },
  "SOON_1_3": { ro: "În curând (1-3 luni)", en: "Soon (1-3 months)" },
  "MID_3_6": { ro: "Medie (3-6 luni)", en: "Medium (3-6 months)" },
  "LATER_6_12": { ro: "Mai târziu (6-12 luni)", en: "Later (6-12 months)" },
  "INFO_ONLY": { ro: "Doar informare", en: "Information only" },
};

export function urgencyDisplay(value: string | null | undefined, locale: SupportedLocale): string {
  if (!value) return locale === "ro" ? "—" : "—";
  const bi = URGENCY_LABELS[value];
  return bi ? t(bi, locale) : value;
}

// Phase 2: Voucher status labels
const VOUCHER_LABELS: Record<string, Bi> = {
  "NONE": { ro: "Nu am", en: "None" },
  "APPLIED": { ro: "Am aplicat", en: "Applied" },
  "APPROVED_ASSMB": { ro: "Aprobat ASSMB", en: "Approved ASSMB" },
  "APPROVED_NATIONAL": { ro: "Aprobat Program Național", en: "Approved National Program" },
  "APPROVED_OTHER": { ro: "Aprobat alt program", en: "Approved other program" },
};

export function voucherDisplay(value: string | null | undefined, locale: SupportedLocale): string {
  if (!value) return locale === "ro" ? "—" : "—";
  const bi = VOUCHER_LABELS[value];
  return bi ? t(bi, locale) : value;
}

// Phase 2: Primary factor labels
const PRIMARY_FACTOR_LABELS: Record<string, Bi> = {
  "UNKNOWN": { ro: "Nu știu", en: "Don't know" },
  "MALE_FACTOR": { ro: "Factor masculin", en: "Male factor" },
  "FEMALE_FACTOR": { ro: "Factor feminin", en: "Female factor" },
  "BOTH": { ro: "Ambele", en: "Both" },
  "UNEXPLAINED": { ro: "Nedescoperit", en: "Unexplained" },
  "ENDOMETRIOSIS": { ro: "Endometrioză", en: "Endometriosis" },
  "LOW_OVARIAN_RESERVE": { ro: "Rezervă ovariană scăzută", en: "Low ovarian reserve" },
  "TUBAL": { ro: "Factor tubar", en: "Tubal factor" },
  "PCOS": { ro: "PCOS", en: "PCOS" },
  "OTHER": { ro: "Altul", en: "Other" },
};

export function primaryFactorDisplay(value: string | null | undefined, locale: SupportedLocale): string {
  if (!value) return locale === "ro" ? "—" : "—";
  const bi = PRIMARY_FACTOR_LABELS[value];
  return bi ? t(bi, locale) : value;
}

// Phase 2: Best contact method labels
const CONTACT_METHOD_LABELS: Record<string, Bi> = {
  "PHONE": { ro: "Telefon", en: "Phone" },
  "WHATSAPP": { ro: "WhatsApp", en: "WhatsApp" },
  "EMAIL": { ro: "Email", en: "Email" },
};

export function contactMethodDisplay(value: string | null | undefined, locale: SupportedLocale): string {
  if (!value) return locale === "ro" ? "—" : "—";
  const bi = CONTACT_METHOD_LABELS[value];
  return bi ? t(bi, locale) : value;
}

const AGE_RANGE_LABELS: Record<string, Bi> = {
  "under-30": { ro: "Sub 30 ani", en: "Under 30" },
  "30-34": { ro: "30 - 34 ani", en: "30 - 34" },
  "35-37": { ro: "35 - 37 ani", en: "35 - 37" },
  "38-40": { ro: "38 - 40 ani", en: "38 - 40" },
  "41+": { ro: "41+ ani", en: "41+" },
};

export function ageRangeDisplay(value: string, locale: SupportedLocale): string {
  const bi = AGE_RANGE_LABELS[value];
  return bi ? t(bi, locale) : value;
}

const GDPR_YES: Bi = { ro: "Da", en: "Yes" };

export function clinicGdpr(locale: SupportedLocale): string {
  return t(GDPR_YES, locale);
}

// ---------------------------------------------------------------------------
// User confirmation email
// ---------------------------------------------------------------------------

const USER_SUBJECT: Bi = {
  ro: "Solicitarea ta pentru FIV a fost primita",
  en: "Your IVF request has been received",
};

export function userSubject(locale: SupportedLocale): string {
  return t(USER_SUBJECT, locale);
}

export interface UserEmailStrings {
  heading: string;
  greeting: string;
  body1: string;
  body2: string;
  body3: string;
  dataSummaryTitle: string;
  noMessage: string;
  nextTitle: string;
  step1: string;
  step2: string;
  step3: string;
  closing: string;
  team: string;
  privacy: string;
  support: string;
}

export function userEmailStrings(
  firstName: string,
  locale: SupportedLocale,
): UserEmailStrings {
  if (locale === "ro") {
    return {
      heading: "Solicitarea ta a fost primita",
      greeting: `Buna ${firstName},`,
      body1:
        "Multumim pentru solicitare. Am primit detaliile tale si le vom verifica in curand.",
      body2:
        "Te vom contacta telefonic pentru confirmare, iar apoi o clinica partenera te va contacta pentru a discuta pasii urmatori.",
      body3:
        "Mai jos gasesti un rezumat al datelor trimise, ca dovada a inregistrarii solicitarii tale.",
      dataSummaryTitle: "Rezumatul solicitarii tale",
      noMessage: "—",
      nextTitle: "Ce urmeaza?",
      step1: "Te contactam telefonic pentru confirmare",
      step2: "Dupa aprobare, o clinica partenera te va contacta",
      step3: "Discuti direct cu clinica, fara obligatii",
      closing: "Cu respect,",
      team: "Echipa FIV Match",
      privacy:
        "Acest email a fost trimis deoarece ai completat un formular pe site-ul nostru. Datele tale sunt protejate conform GDPR.",
      support: "Intrebari? Scrie-ne la support@fivmatch.ro",
    };
  }

  return {
    heading: "Your request has been received",
    greeting: `Hi ${firstName},`,
    body1:
      "Thank you for your request. We have received your details and will verify them shortly.",
    body2:
      "We will contact you by phone for confirmation, and then a partner clinic will contact you to discuss next steps.",
    body3:
      "Below is a summary of the data you submitted, as proof that we have received your request.",
    dataSummaryTitle: "Summary of your request",
    noMessage: "—",
    nextTitle: "What happens next?",
    step1: "We contact you by phone for confirmation",
    step2: "After approval, a partner clinic will contact you",
    step3: "You discuss directly with the clinic, no obligation",
    closing: "Best regards,",
    team: "The FIV Match Team",
    privacy:
      "This email was sent because you submitted a request on our website. Your data is protected under GDPR.",
    support: "Questions? Reach us at support@fivmatch.ro",
  };
}

// ---------------------------------------------------------------------------
// Internal monitoring email (for manual gate workflow)
// ---------------------------------------------------------------------------

const INTERNAL_SUBJECT: Bi = {
  ro: "Lead nou - de verificat",
  en: "New lead - needs verification",
};

export function internalSubject(locale: SupportedLocale): string {
  return t(INTERNAL_SUBJECT, locale);
}

export interface InternalEmailStrings {
  heading: string;
  intro: string;
  leadIdLabel: string;
  submittedAtLabel: string;
  intentLabel: string;
  actionRequired: string;
}

export function internalEmailStrings(locale: SupportedLocale): InternalEmailStrings {
  if (locale === "ro") {
    return {
      heading: "Lead nou primit",
      intro: "Un nou lead a fost trimis prin formularul de pe site. Verifică detaliile în panoul de operator (/admin) și aprobă pentru trimitere către clinică.",
      leadIdLabel: "ID Lead",
      submittedAtLabel: "Trimis la",
      intentLabel: "Nivel intent",
      actionRequired: "Verifică lead-ul în /admin, contactează clientul telefonic pentru verificare, apoi atribuie o clinică și trimite email-ul premium.",
    };
  }

  return {
    heading: "New lead received",
    intro: "A new lead has been submitted through the website form. Review the details in the operator panel (/admin) and approve for sending to clinic.",
    leadIdLabel: "Lead ID",
    submittedAtLabel: "Submitted at",
    intentLabel: "Intent level",
    actionRequired: "Review the lead in /admin, call the client for verification, then assign a clinic and send the premium email.",
  };
}

// ---------------------------------------------------------------------------
// Nurture sequence emails (for low-intent leads)
// ---------------------------------------------------------------------------

export interface NurtureEmailStrings {
  subject: string;
  greeting: string;
  body: string;
  cta: string;
  ctaLink?: string;
  closing: string;
  unsubscribe: string;
}

export function nurtureEmailStrings(
  stage: 1 | 2 | 3,
  firstName: string,
  locale: SupportedLocale,
): NurtureEmailStrings {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://fivmatch.ro";
  const localePath = locale === "ro" ? "ro" : "en";

  if (locale === "ro") {
    switch (stage) {
      case 1:
        return {
          subject: "Ce presupune FIV în România – pași generali",
          greeting: `Bună ${firstName},`,
          body: `<p>Mulțumim că v-ați interesat de opțiunile de tratament FIV în România.</p>
<p>FIV (Fertilizare In Vitro) este un proces medical care implică mai mulți pași generali:</p>
<ul>
<li><strong>Consultare inițială:</strong> Evaluarea situației medicale și discuții despre opțiuni</li>
<li><strong>Investigatii medicale:</strong> Analize și teste necesare pentru a determina abordarea optimă</li>
<li><strong>Stimulare ovariană:</strong> Medicamente pentru a pregăti ovulele pentru colectare</li>
<li><strong>Colectare ovule și fertilizare:</strong> Procedura de laborator pentru crearea embrionilor</li>
<li><strong>Transfer embrion:</strong> Introducerea embrionului în uter</li>
</ul>
<p>Fiecare situație este unică, iar pașii exacti pot varia în funcție de recomandările medicului specialist.</p>`,
          cta: "Dacă doriți să discutăm opțiunile disponibile, puteți răspunde la acest email.",
          closing: "Cu respect,<br><strong>Echipa FIV Match</strong>",
          unsubscribe: `Nu mai doriți să primiți aceste emailuri? <a href="${baseUrl}/${localePath}/unsubscribe?email={email}" style="color:#2563eb;">Anulați abonarea</a>`,
        };
      case 2:
        return {
          subject: "Când este momentul potrivit pentru a începe FIV?",
          greeting: `Bună ${firstName},`,
          body: `<p>Vă scriem din nou pentru a vă oferi informații utile despre momentul potrivit pentru a începe un tratament FIV.</p>
<p>În general, factorii care pot influența decizia includ:</p>
<ul>
<li><strong>Vârsta:</strong> Fertilitatea naturală scade odată cu vârsta, iar șansele de succes pot varia</li>
<li><strong>Istoric medical:</strong> Anumite condiții medicale sau tratamente anterioare pot influența abordarea</li>
<li><strong>Investigatii complete:</strong> Evaluarea completă a ambilor parteneri ajută la determinarea strategiei optime</li>
<li><strong>Pregătirea emoțională și financiară:</strong> Tratamentul FIV este un proces care necesită pregătire atât emoțională, cât și financiară</li>
</ul>
<p>Nu există un răspuns universal – momentul potrivit depinde de situația dumneavoastră specifică și de recomandările unui specialist în fertilitate.</p>`,
          cta: "Dacă aveți întrebări sau doriți să discutați mai multe, răspundeți la acest email.",
          closing: "Cu respect,<br><strong>Echipa FIV Match</strong>",
          unsubscribe: `Nu mai doriți să primiți aceste emailuri? <a href="${baseUrl}/${localePath}/unsubscribe?email={email}" style="color:#2563eb;">Anulați abonarea</a>`,
        };
      case 3:
        return {
          subject: "Doriți să discutăm opțiunile disponibile?",
          greeting: `Bună ${firstName},`,
          body: `<p>Am trimis câteva informații despre FIV în ultimele săptămâni și sperăm că v-au fost utile.</p>
<p>Dacă ați ajuns la concluzia că doriți să explorați opțiunile disponibile mai în detaliu, suntem aici pentru a vă ajuta.</p>
<p>Putem vă conecta cu clinici private partenere din România care oferă consultații și pot discuta despre situația dumneavoastră specifică.</p>`,
          cta: "Explorați opțiunile disponibile",
          ctaLink: `${baseUrl}/${localePath}`,
          closing: "Cu respect,<br><strong>Echipa FIV Match</strong>",
          unsubscribe: `Nu mai doriți să primiți aceste emailuri? <a href="${baseUrl}/${localePath}/unsubscribe?email={email}" style="color:#2563eb;">Anulați abonarea</a>`,
        };
    }
  }

  // English versions
  switch (stage) {
    case 1:
      return {
        subject: "What IVF involves in Romania – general steps",
        greeting: `Hi ${firstName},`,
        body: `<p>Thank you for your interest in IVF treatment options in Romania.</p>
<p>IVF (In Vitro Fertilization) is a medical process that involves several general steps:</p>
<ul>
<li><strong>Initial consultation:</strong> Medical situation evaluation and discussions about options</li>
<li><strong>Medical investigations:</strong> Tests and analyses needed to determine the optimal approach</li>
<li><strong>Ovarian stimulation:</strong> Medications to prepare eggs for collection</li>
<li><strong>Egg collection and fertilization:</strong> Laboratory procedure to create embryos</li>
<li><strong>Embryo transfer:</strong> Introduction of the embryo into the uterus</li>
</ul>
<p>Each situation is unique, and the exact steps may vary based on the fertility specialist's recommendations.</p>`,
        cta: "If you'd like to discuss available options, you can reply to this email.",
        closing: "Best regards,<br><strong>The FIV Match Team</strong>",
        unsubscribe: `Don't want to receive these emails? <a href="${baseUrl}/${localePath}/unsubscribe?email={email}" style="color:#2563eb;">Unsubscribe</a>`,
      };
    case 2:
      return {
        subject: "When is the right time to start IVF?",
        greeting: `Hi ${firstName},`,
        body: `<p>We're writing again to provide useful information about the right time to start an IVF treatment.</p>
<p>In general, factors that can influence the decision include:</p>
<ul>
<li><strong>Age:</strong> Natural fertility decreases with age, and success rates can vary</li>
<li><strong>Medical history:</strong> Certain medical conditions or previous treatments can influence the approach</li>
<li><strong>Complete investigations:</strong> Full evaluation of both partners helps determine the optimal strategy</li>
<li><strong>Emotional and financial preparation:</strong> IVF treatment is a process that requires both emotional and financial preparation</li>
</ul>
<p>There's no universal answer – the right time depends on your specific situation and a fertility specialist's recommendations.</p>`,
        cta: "If you have questions or would like to discuss more, reply to this email.",
        closing: "Best regards,<br><strong>The FIV Match Team</strong>",
        unsubscribe: `Don't want to receive these emails? <a href="${baseUrl}/${localePath}/unsubscribe?email={email}" style="color:#2563eb;">Unsubscribe</a>`,
      };
    case 3:
      return {
        subject: "Would you like to discuss available options?",
        greeting: `Hi ${firstName},`,
        body: `<p>We've sent you some information about IVF over the past few weeks and hope it's been helpful.</p>
<p>If you've reached the conclusion that you'd like to explore available options in more detail, we're here to help.</p>
<p>We can connect you with private partner clinics in Romania that offer consultations and can discuss your specific situation.</p>`,
        cta: "Explore available options",
        ctaLink: `${baseUrl}/${localePath}`,
        closing: "Best regards,<br><strong>The FIV Match Team</strong>",
        unsubscribe: `Don't want to receive these emails? <a href="${baseUrl}/${localePath}/unsubscribe?email={email}" style="color:#2563eb;">Unsubscribe</a>`,
      };
  }
}
