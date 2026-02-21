"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useParams } from "next/navigation";
import Link from "next/link";

// Admin panel for lead management

export const dynamic = "force-dynamic";

interface Clinic {
  id: string;
  name: string;
  email: string;
  city: string;
}

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  age_range: string;
  exact_age: number | null;
  female_age_exact: number | null;
  male_age_exact: number | null;
  tried_ivf: string;
  timeline: string;
  budget_range: string;
  test_status: string | null;
  city: string;
  message: string | null;
  status: string;
  operator_status: string;
  lead_tier: string;
  tier_reason: string | null;
  urgency_level: string | null;
  voucher_status: string | null;
  primary_factor: string | null;
  has_recent_tests: boolean | null;
  tests_list: string | null;
  previous_clinics: string | null;
  availability_windows: string | null;
  best_contact_method: string | null;
  call_attempts: number;
  assigned_clinic_id: string | null;
  verified_at: string | null;
  phone_verified_at: string | null;
  operator_verified_at: string | null;
  assigned_at: string | null;
  sent_at: string | null;
  sent_to_clinic_at: string | null;
  notes: string | null;
  operator_notes: string | null;
  consent_timestamp: string | null;
  consent_ip_hash: string | null;
  consent_user_agent: string | null;
  created_at: string;
  intent_level: string;
  clinic_name: string | null;
  clinic_email: string | null;
}

interface LeadEvent {
  id: string;
  type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

const ADMIN_TOKEN_KEY = "fivmatch_admin_token";

function LeadDetailPageContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const tokenFromUrl = searchParams.get("token");
  const token = tokenFromUrl || (typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_TOKEN_KEY) : null);
  const leadId = params.id as string;

  // Persist token and clean URL so the long token is not in the address bar
  useEffect(() => {
    if (tokenFromUrl && typeof window !== "undefined") {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, tokenFromUrl);
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      const clean = url.pathname + (url.searchParams.toString() ? "?" + url.searchParams.toString() : "");
      window.history.replaceState({}, "", clean);
    }
  }, [tokenFromUrl]);

  const [lead, setLead] = useState<Lead | null>(null);
  const [events, setEvents] = useState<LeadEvent[]>([]);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [callNotes, setCallNotes] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Token lipsă");
      setLoading(false);
      return;
    }

    Promise.all([
      fetch(`/api/admin/leads/${leadId}?token=${token}`).then((res) =>
        res.json()
      ),
      fetch(`/api/admin/clinics?token=${token}&active=true`).then((res) => res.json()),
    ])
      .then(([leadData, clinicsData]) => {
        if (leadData?.lead) {
          setLead(leadData.lead);
          setNotes(leadData.lead.operator_notes || leadData.lead.notes || "");
          setSelectedClinicId(leadData.lead.assigned_clinic_id || "");
          if (leadData.events) {
            setEvents(leadData.events);
          }
        } else {
          setError("Lead negăsit");
        }
        if (clinicsData?.clinics) {
          setClinics(clinicsData.clinics);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Eroare la încărcarea datelor");
        setLoading(false);
      });
  }, [token, leadId]);

  const handleAction = async (
    action: string,
    endpoint: string,
    body?: Record<string, unknown>
  ) => {
    if (!token) return;

    setActionLoading(action);
    try {
      const res = await fetch(`/api/admin/leads/${leadId}/${endpoint}?token=${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await res.json();
      if (data.success) {
        // Reload lead data
        const leadRes = await fetch(`/api/admin/leads/${leadId}?token=${token}`);
        const leadData = await leadRes.json();
        if (leadData?.lead) {
          setLead(leadData.lead);
          setNotes(leadData.lead.operator_notes || leadData.lead.notes || "");
          if (leadData.events) {
            setEvents(leadData.events);
          }
        }
        alert("Acțiune realizată cu succes!");
      } else {
        alert(data.error || "Eroare");
      }
    } catch (err) {
      console.error(err);
      alert("Eroare la executarea acțiunii");
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogCall = async () => {
    await handleAction("call", "call", { notes: callNotes });
    setCallNotes("");
  };

  const handleStatusChange = async (status: string) => {
    const notes = prompt("Note (opțional):");
    await handleAction("status", "status", { status, notes: notes || "" });
  };

  const handleSaveNotes = async () => {
    await handleAction("notes", "notes", { notes });
  };

  const copyEmailTemplate = () => {
    if (!lead) return;

    const formatLeadId = (uuid: string) => {
      return uuid.replace(/-/g, "").slice(0, 8).toUpperCase();
    };

    const ageLabels: Record<string, string> = {
      "under-30": "Sub 30 ani",
      "30-34": "30 - 34 ani",
      "35-37": "35 - 37 ani",
      "38-40": "38 - 40 ani",
      "41+": "41+ ani",
    };

    const timelineLabels: Record<string, string> = {
      asap: "Cât mai curând",
      "1-3months": "În 1-3 luni",
      researching: "Doar mă informez",
    };

    const budgetLabels: Record<string, string> = {
      "under-10k": "Fonduri proprii",
      "10k-20k": "Programul de Stat",
      "over-20k": "Credit medical",
      "prefer-discuss": "Preferă să discute cu clinica",
    };

    const testStatusLabels: Record<string, string> = {
      "ready": "Analizele sunt gata",
      "pending": "Analizele sunt în curs",
      "not-started": "Nu am început analizele",
      "unknown": "Nu știu",
    };

    const triedIvfLabels: Record<string, string> = {
      Yes: "Da",
      No: "Nu",
      InProgress: "În curs",
    };

    const intentLabels: Record<string, string> = {
      high: "Ridicat",
      medium: "Mediu",
      low: "Scăzut",
    };

    const subject = `Lead FIV – ${formatLeadId(lead.id)} – ${lead.city || "N/A"} – ${intentLabels[lead.intent_level] || lead.intent_level}`;

    const phoneVerifiedText = lead.phone_verified_at 
      ? `\n✓ Confirmat telefonic la ${new Date(lead.phone_verified_at).toLocaleString("ro-RO", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Bucharest" })}`
      : "";

    const body = `Bună ziua,

Vă trimitem un lead confirmat telefonic${lead.phone_verified_at ? ` acum ${Math.round((Date.now() - new Date(lead.phone_verified_at).getTime()) / 60000)} minute` : ""}:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMAȚII LEAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID Lead: ${formatLeadId(lead.id)}
Data trimiterii: ${new Date(lead.created_at).toLocaleString("ro-RO", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    })}${phoneVerifiedText}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DATE CONTACT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Nume: ${lead.first_name} ${lead.last_name}
Email: ${lead.email}
Telefon: ${lead.phone}
Oraș: ${lead.city || "N/A"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DETALII SOLICITARE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vârstă: ${lead.exact_age ? `${lead.exact_age} ani` : ageLabels[lead.age_range] || lead.age_range || "N/A"}
A mai încercat FIV: ${triedIvfLabels[lead.tried_ivf] || lead.tried_ivf || "N/A"}
Termen dorit: ${timelineLabels[lead.timeline] || lead.timeline || "N/A"}
Mod de finanțare: ${budgetLabels[lead.budget_range] || lead.budget_range || "N/A"}
${lead.test_status ? `Status analize medicale: ${testStatusLabels[lead.test_status] || lead.test_status}\n` : ""}Nivel intenție: ${intentLabels[lead.intent_level] || lead.intent_level || "N/A"}

${lead.message ? `Mesaj:\n${lead.message}\n` : ""}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Vă rugăm să contactați pacientul în cel mai scurt timp posibil.

Cu respect,
Echipa FIV Match`;

    const fullEmail = `Subject: ${subject}\n\n${body}`;

    navigator.clipboard.writeText(fullEmail).then(() => {
      alert("Template email copiat în clipboard!");
    });
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString("ro-RO", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    });
  };

  const formatLeadId = (uuid: string) => {
    return uuid.replace(/-/g, "").slice(0, 8).toUpperCase();
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Acces Neautorizat
          </h1>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-600">Se încarcă...</div>
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Eroare</h1>
          <p className="text-gray-600">{error || "Lead negăsit"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-4">
          <Link
            href="/admin"
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Înapoi la listă
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900">
                    Lead #{formatLeadId(lead.id)}
                  </h1>
                  <span className={`px-3 py-1 rounded text-sm font-bold ${
                    lead.lead_tier === "A" ? "bg-green-600 text-white" :
                    lead.lead_tier === "B" ? "bg-blue-600 text-white" :
                    lead.lead_tier === "C" ? "bg-yellow-600 text-white" :
                    "bg-gray-600 text-white"
                  }`}>
                    Tier {lead.lead_tier}
                  </span>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    lead.operator_status === "VERIFIED_READY" ? "bg-blue-100 text-blue-800" :
                    lead.operator_status === "SENT_TO_CLINIC" ? "bg-green-100 text-green-800" :
                    lead.operator_status === "LOW_INTENT_NURTURE" ? "bg-orange-100 text-orange-800" :
                    lead.operator_status === "INVALID" ? "bg-red-100 text-red-800" :
                    lead.operator_status === "CALLED_NO_ANSWER" ? "bg-yellow-100 text-yellow-800" :
                    "bg-gray-100 text-gray-800"
                  }`}>
                    {lead.operator_status === "VERIFIED_READY" ? "Verificat gata" :
                     lead.operator_status === "SENT_TO_CLINIC" ? "Trimis la clinică" :
                     lead.operator_status === "LOW_INTENT_NURTURE" ? "Intenție scăzută" :
                     lead.operator_status === "INVALID" ? "Invalid" :
                     lead.operator_status === "CALLED_NO_ANSWER" ? "Apel fără răspuns" :
                     "Nou"}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {lead.first_name} {lead.last_name}
                </p>
                {lead.tier_reason && (
                  <p className="text-xs text-gray-500 mt-1 italic">
                    {lead.tier_reason}
                  </p>
                )}
              </div>
              <button
                onClick={copyEmailTemplate}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
              >
                📋 Copiază Template Email
              </button>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Date Contact
                </h2>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Nume</dt>
                    <dd className="text-sm text-gray-900">
                      {lead.first_name} {lead.last_name}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="text-sm text-gray-900">
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {lead.email}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Telefon
                    </dt>
                    <dd className="text-sm text-gray-900">
                      <a
                        href={`tel:${lead.phone}`}
                        className="text-blue-600 hover:underline"
                      >
                        {lead.phone}
                      </a>
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Oraș</dt>
                    <dd className="text-sm text-gray-900">
                      {lead.city || "—"}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Detalii Solicitare
                </h2>
                <dl className="space-y-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Vârstă</dt>
                    <dd className="text-sm text-gray-900">
                      {lead.female_age_exact 
                        ? `${lead.female_age_exact} ani (femeie)`
                        : lead.exact_age 
                        ? `${lead.exact_age} ani`
                        : lead.age_range === "under-30"
                        ? "Sub 30 ani"
                        : lead.age_range === "30-34"
                        ? "30 - 34 ani"
                        : lead.age_range === "35-37"
                        ? "35 - 37 ani"
                        : lead.age_range === "38-40"
                        ? "38 - 40 ani"
                        : lead.age_range === "41+"
                        ? "41+ ani"
                        : lead.age_range || "—"}
                      {lead.male_age_exact && ` / ${lead.male_age_exact} ani (bărbat)`}
                    </dd>
                  </div>
                  {lead.urgency_level && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Urgență</dt>
                      <dd className="text-sm text-gray-900">
                        {lead.urgency_level === "ASAP_0_30" ? "Cât mai curând (0-30 zile)" :
                         lead.urgency_level === "SOON_1_3" ? "În curând (1-3 luni)" :
                         lead.urgency_level === "MID_3_6" ? "Medie (3-6 luni)" :
                         lead.urgency_level === "LATER_6_12" ? "Mai târziu (6-12 luni)" :
                         lead.urgency_level === "INFO_ONLY" ? "Doar informare" :
                         lead.urgency_level}
                      </dd>
                    </div>
                  )}
                  {lead.voucher_status && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Voucher</dt>
                      <dd className="text-sm text-gray-900">
                        {lead.voucher_status === "NONE" ? "Fără" :
                         lead.voucher_status === "APPLIED" ? "Aplicat" :
                         lead.voucher_status === "APPROVED_ASSMB" ? "Aprobat ASSMB" :
                         lead.voucher_status === "APPROVED_NATIONAL" ? "Aprobat Program Național" :
                         lead.voucher_status === "APPROVED_OTHER" ? "Aprobat alt program" :
                         lead.voucher_status}
                      </dd>
                    </div>
                  )}
                  {lead.primary_factor && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Factor principal</dt>
                      <dd className="text-sm text-gray-900">
                        {lead.primary_factor === "UNKNOWN" ? "Nu știu" :
                         lead.primary_factor === "MALE_FACTOR" ? "Factor masculin" :
                         lead.primary_factor === "FEMALE_FACTOR" ? "Factor feminin" :
                         lead.primary_factor === "BOTH" ? "Ambele" :
                         lead.primary_factor === "UNEXPLAINED" ? "Nedescoperit" :
                         lead.primary_factor === "ENDOMETRIOSIS" ? "Endometrioză" :
                         lead.primary_factor === "LOW_OVARIAN_RESERVE" ? "Rezervă ovariană scăzută" :
                         lead.primary_factor === "TUBAL" ? "Factor tubar" :
                         lead.primary_factor === "PCOS" ? "PCOS" :
                         lead.primary_factor === "OTHER" ? "Altul" :
                         lead.primary_factor}
                      </dd>
                    </div>
                  )}
                  {lead.has_recent_tests !== null && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Are analize recente</dt>
                      <dd className="text-sm text-gray-900">
                        {lead.has_recent_tests ? "Da" : "Nu"}
                      </dd>
                    </div>
                  )}
                  {lead.tests_list && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Lista analizelor</dt>
                      <dd className="text-sm text-gray-900">{lead.tests_list}</dd>
                    </div>
                  )}
                  {lead.best_contact_method && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Metodă preferată contact</dt>
                      <dd className="text-sm text-gray-900">
                        {lead.best_contact_method === "PHONE" ? "Telefon" :
                         lead.best_contact_method === "WHATSAPP" ? "WhatsApp" :
                         lead.best_contact_method === "EMAIL" ? "Email" :
                         lead.best_contact_method}
                      </dd>
                    </div>
                  )}
                  {lead.availability_windows && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Disponibilitate</dt>
                      <dd className="text-sm text-gray-900">{lead.availability_windows}</dd>
                    </div>
                  )}
                  {lead.previous_clinics && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Clinicile consultate anterior</dt>
                      <dd className="text-sm text-gray-900">{lead.previous_clinics}</dd>
                    </div>
                  )}
                  {lead.test_status && (
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status analize</dt>
                      <dd className="text-sm text-gray-900">
                        {lead.test_status === "ready"
                          ? "Analizele sunt gata"
                          : lead.test_status === "pending"
                          ? "Analizele sunt în curs"
                          : lead.test_status === "not-started"
                          ? "Nu am început analizele"
                          : lead.test_status === "unknown"
                          ? "Nu știu"
                          : lead.test_status}
                      </dd>
                    </div>
                  )}
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      A mai încercat FIV
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {lead.tried_ivf === "Yes"
                        ? "Da"
                        : lead.tried_ivf === "No"
                        ? "Nu"
                        : lead.tried_ivf === "InProgress"
                        ? "În curs"
                        : lead.tried_ivf || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Termen dorit
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {lead.timeline === "asap"
                        ? "Cât mai curând"
                        : lead.timeline === "1-3months"
                        ? "În 1-3 luni"
                        : lead.timeline === "researching"
                        ? "Doar mă informez"
                        : lead.timeline || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Mod de finanțare
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {lead.budget_range === "under-10k"
                        ? "Fonduri proprii"
                        : lead.budget_range === "10k-20k"
                        ? "Programul de Stat"
                        : lead.budget_range === "over-20k"
                        ? "Credit medical"
                        : lead.budget_range === "prefer-discuss"
                        ? "Preferă să discute cu clinica"
                        : lead.budget_range || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Nivel intenție
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {lead.intent_level === "high"
                        ? "Ridicat"
                        : lead.intent_level === "medium"
                        ? "Mediu"
                        : lead.intent_level === "low"
                        ? "Scăzut"
                        : lead.intent_level || "—"}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {lead.message && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-2">
                  Mesaj
                </h2>
                <div className="bg-gray-50 p-4 rounded border border-gray-200">
                  <p className="text-sm text-gray-900 whitespace-pre-wrap break-words overflow-wrap-anywhere max-w-full">
                    {lead.message}
                  </p>
                </div>
              </div>
            )}

            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Status și Istoric
              </h2>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Status:</dt>
                  <dd className="text-gray-900 font-medium">
                    {lead.status === "new"
                      ? "Nou"
                      : lead.status === "new_unverified"
                      ? "Nou (neverificat)"
                      : lead.status === "verified"
                      ? "Verificat"
                      : lead.status === "assigned"
                      ? "Atribuit"
                      : lead.status === "sent"
                      ? "Trimis"
                      : lead.status === "rejected"
                      ? "Respins"
                      : lead.status}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Creat la:</dt>
                  <dd className="text-gray-900">{formatDate(lead.created_at)}</dd>
                </div>
                {lead.verified_at && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Verificat la:</dt>
                    <dd className="text-gray-900">{formatDate(lead.verified_at)}</dd>
                  </div>
                )}
                {lead.operator_verified_at && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Verificat de operator:</dt>
                    <dd className="text-gray-900 font-medium text-green-700">
                      ✓ {formatDate(lead.operator_verified_at)}
                    </dd>
                  </div>
                )}
                {lead.assigned_at && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Atribuit la:</dt>
                    <dd className="text-gray-900">{formatDate(lead.assigned_at)}</dd>
                  </div>
                )}
                {lead.sent_to_clinic_at && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Trimis la clinică:</dt>
                    <dd className="text-gray-900 font-medium text-green-700">
                      ✓ {formatDate(lead.sent_to_clinic_at)}
                    </dd>
                  </div>
                )}
                {lead.clinic_name && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Clinică atribuită:</dt>
                    <dd className="text-gray-900">
                      {lead.clinic_name} ({lead.clinic_email})
                    </dd>
                  </div>
                )}
                {lead.consent_timestamp && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Consimțământ GDPR:</dt>
                    <dd className="text-gray-900 font-medium text-green-700">
                      ✓ {formatDate(lead.consent_timestamp)}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Phase 2 Actions */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Acțiuni Operator
              </h2>
              <div className="space-y-4">
                {/* Log Call */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-medium text-blue-900 mb-2">Log Apel</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={callNotes}
                      onChange={(e) => setCallNotes(e.target.value)}
                      placeholder="Note despre apel (opțional)"
                      className="flex-1 px-3 py-2 border border-blue-300 rounded text-sm"
                    />
                    <button
                      onClick={handleLogCall}
                      disabled={actionLoading === "call"}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
                    >
                      {actionLoading === "call" ? "Se procesează..." : "📞 Log Apel"}
                    </button>
                  </div>
                  {lead.call_attempts > 0 && (
                    <p className="text-xs text-blue-700 mt-2">
                      Încercări apel: {lead.call_attempts}
                    </p>
                  )}
                </div>

                {/* Status Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {lead.operator_status !== "VERIFIED_READY" && lead.operator_status !== "SENT_TO_CLINIC" && (
                    <button
                      onClick={() => handleStatusChange("VERIFIED_READY")}
                      disabled={actionLoading === "status"}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
                    >
                      ✓ Verifică Gata
                    </button>
                  )}
                  {lead.operator_status !== "LOW_INTENT_NURTURE" && (
                    <button
                      onClick={() => handleStatusChange("LOW_INTENT_NURTURE")}
                      disabled={actionLoading === "status"}
                      className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 text-sm font-medium"
                    >
                      📧 Intenție Scăzută
                    </button>
                  )}
                  {lead.operator_status !== "INVALID" && (
                    <button
                      onClick={() => handleStatusChange("INVALID")}
                      disabled={actionLoading === "status"}
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                    >
                      ✗ Marchează Invalid
                    </button>
                  )}
                </div>

                {/* Assign Clinic */}
                {lead.operator_status === "VERIFIED_READY" && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-purple-900 mb-2">Atribuie Clinică</h3>
                    <div className="flex flex-col md:flex-row gap-2">
                      <select
                        value={selectedClinicId}
                        onChange={(e) => setSelectedClinicId(e.target.value)}
                        className="flex-1 px-3 py-2 border border-purple-300 rounded text-sm"
                      >
                        <option value="">Selectează clinică...</option>
                        {clinics.map((clinic) => (
                          <option key={clinic.id} value={clinic.id}>
                            {clinic.name}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() =>
                          handleAction("assign", "assign", {
                            clinic_id: selectedClinicId,
                          })
                        }
                        disabled={actionLoading === "assign" || !selectedClinicId}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
                      >
                        {actionLoading === "assign" ? "Se procesează..." : "📎 Atribuie"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Send to Clinic */}
                {lead.operator_status === "VERIFIED_READY" && lead.assigned_clinic_id && (
                  <button
                    onClick={() => handleAction("send", "send")}
                    disabled={actionLoading === "send"}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-base font-semibold shadow-md"
                  >
                    {actionLoading === "send"
                      ? "Se trimite..."
                      : "📧 Trimite Email Premium la Clinică"}
                  </button>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="border-t border-gray-200 pt-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Note Operator
              </h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Note operator despre acest lead..."
              />
              <button
                onClick={handleSaveNotes}
                disabled={actionLoading === "notes"}
                className="mt-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === "notes" ? "Se salvează..." : "💾 Salvează Note"}
              </button>
            </div>

            {/* Audit Trail */}
            {events.length > 0 && (
              <div className="border-t border-gray-200 pt-6 mt-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Istoric Acțiuni
                </h2>
                <div className="space-y-2">
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="bg-gray-50 border border-gray-200 rounded p-3 text-sm"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium text-gray-900">
                            {event.type === "CREATED" ? "Creat" :
                             event.type === "OPERATOR_CALLED" ? "Apel înregistrat" :
                             event.type === "OPERATOR_VERIFIED" ? "Verificat de operator" :
                             event.type === "ASSIGNED" ? "Atribuit clinică" :
                             event.type === "SENT_EMAIL" ? "Email trimis" :
                             event.type === "STATUS_CHANGED" ? "Status schimbat" :
                             event.type}
                          </span>
                          {event.metadata && Object.keys(event.metadata).length > 0 && (
                            <div className="text-xs text-gray-600 mt-1 font-mono">
                              {JSON.stringify(event.metadata, null, 2)}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-gray-500 whitespace-nowrap ml-4">
                          {formatDate(event.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LeadDetailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-600">Se încarcă...</div>
      </div>
    }>
      <LeadDetailPageContent />
    </Suspense>
  );
}
