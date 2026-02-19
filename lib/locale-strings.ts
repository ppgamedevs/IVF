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

/**
 * Derive lead intent from timeline + budget.
 *   High:   (asap or 1-3months) AND budget != prefer-discuss
 *   Medium: (asap or 1-3months) AND budget == prefer-discuss
 *   Low:    researching (any budget)
 */
export function deriveIntentLevel(timeline: string, budgetRange?: string): IntentLevel {
  if (timeline === "researching") return "low";
  if (timeline === "asap" || timeline === "1-3months") {
    if (budgetRange === "prefer-discuss") return "medium";
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
  "under-10k": { ro: "Sub 10.000 lei", en: "Under 10,000 lei" },
  "10k-20k": { ro: "10.000 - 20.000 lei", en: "10,000 - 20,000 lei" },
  "over-20k": { ro: "Peste 20.000 lei", en: "Over 20,000 lei" },
  "prefer-discuss": { ro: "Prefera sa discute cu clinica", en: "Prefers to discuss with clinic" },
};

export function clinicBudget(value: string, locale: SupportedLocale): string {
  const bi = BUDGET_LABELS[value];
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
      heading: "Lead nou - de verificat",
      intro: "Un nou lead a fost trimis prin formularul de pe site. Verifica detaliile si aproba pentru trimitere catre clinica.",
      leadIdLabel: "ID Lead",
      submittedAtLabel: "Trimis la",
      intentLabel: "Nivel intent",
      actionRequired: "Verifica lead-ul in panoul de operator si aproba pentru trimitere catre clinica.",
    };
  }

  return {
    heading: "New lead - needs verification",
    intro: "A new lead has been submitted through the website form. Review the details and approve for sending to clinic.",
    leadIdLabel: "Lead ID",
    submittedAtLabel: "Submitted at",
    intentLabel: "Intent level",
    actionRequired: "Review the lead in the operator panel and approve for sending to clinic.",
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
