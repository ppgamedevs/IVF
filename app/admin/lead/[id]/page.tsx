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
  tried_ivf: string;
  timeline: string;
  budget_range: string;
  city: string;
  message: string | null;
  status: string;
  assigned_clinic_id: string | null;
  verified_at: string | null;
  assigned_at: string | null;
  sent_at: string | null;
  notes: string | null;
  created_at: string;
  intent_level: string;
  clinic_name: string | null;
  clinic_email: string | null;
}

function LeadDetailPageContent() {
  const searchParams = useSearchParams();
  const params = useParams();
  const token = searchParams.get("token");
  const leadId = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [selectedClinicId, setSelectedClinicId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
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
      fetch(`/api/admin/clinics?token=${token}`).then((res) => res.json()),
    ])
      .then(([leadData, clinicsData]) => {
        if (leadData?.lead) {
          setLead(leadData.lead);
          setNotes(leadData.lead.notes || "");
          setSelectedClinicId(leadData.lead.assigned_clinic_id || "");
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
      if (data.success && data.lead) {
        setLead((prev) => (prev ? { ...prev, ...data.lead } : null));
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
      "under-10k": "Sub 10.000 lei",
      "10k-20k": "10.000 - 20.000 lei",
      "over-20k": "Peste 20.000 lei",
      "prefer-discuss": "Preferă să discute cu clinica",
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

    const body = `Bună ziua,

Vă trimitem un nou lead pentru FIV:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INFORMAȚII LEAD
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ID Lead: ${formatLeadId(lead.id)}
Data trimiterii: ${new Date(lead.created_at).toLocaleString("ro-RO", {
      dateStyle: "long",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    })}

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

Vârstă: ${ageLabels[lead.age_range] || lead.age_range || "N/A"}
A mai încercat FIV: ${triedIvfLabels[lead.tried_ivf] || lead.tried_ivf || "N/A"}
Termen dorit: ${timelineLabels[lead.timeline] || lead.timeline || "N/A"}
Buget estimativ: ${budgetLabels[lead.budget_range] || lead.budget_range || "N/A"}
Nivel intenție: ${intentLabels[lead.intent_level] || lead.intent_level || "N/A"}

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
            href={`/admin?token=${token}`}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Înapoi la listă
          </Link>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Lead #{formatLeadId(lead.id)}
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  {lead.first_name} {lead.last_name}
                </p>
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
                      {lead.age_range === "under-30"
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
                    </dd>
                  </div>
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
                      Buget estimativ
                    </dt>
                    <dd className="text-sm text-gray-900">
                      {lead.budget_range === "under-10k"
                        ? "Sub 10.000 lei"
                        : lead.budget_range === "10k-20k"
                        ? "10.000 - 20.000 lei"
                        : lead.budget_range === "over-20k"
                        ? "Peste 20.000 lei"
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
                {lead.assigned_at && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Atribuit la:</dt>
                    <dd className="text-gray-900">{formatDate(lead.assigned_at)}</dd>
                  </div>
                )}
                {lead.sent_at && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Trimis la:</dt>
                    <dd className="text-gray-900">{formatDate(lead.sent_at)}</dd>
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
              </dl>
            </div>

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Acțiuni
              </h2>
              <div className="space-y-4">
                {lead.status !== "verified" &&
                  lead.status !== "assigned" &&
                  lead.status !== "sent" && (
                    <button
                      onClick={() => handleAction("verify", "verify")}
                      disabled={actionLoading === "verify"}
                      className="w-full md:w-auto px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {actionLoading === "verify"
                        ? "Se procesează..."
                        : "✓ Marchează ca Verificat"}
                    </button>
                  )}

                <div className="flex flex-col md:flex-row gap-4">
                  <select
                    value={selectedClinicId}
                    onChange={(e) => setSelectedClinicId(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selectează clinică...</option>
                    {clinics.map((clinic) => (
                      <option key={clinic.id} value={clinic.id}>
                        {clinic.name} ({clinic.city})
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() =>
                      handleAction("assign", "assign", {
                        clinic_id: selectedClinicId,
                      })
                    }
                    disabled={
                      actionLoading === "assign" || !selectedClinicId
                    }
                    className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === "assign"
                      ? "Se procesează..."
                      : "📎 Atribuie Clinică"}
                  </button>
                </div>

                {lead.status === "assigned" && (
                  <button
                    onClick={() => handleAction("send", "send")}
                    disabled={actionLoading === "send"}
                    className="w-full md:w-auto px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {actionLoading === "send"
                      ? "Se procesează..."
                      : "✉️ Marchează ca Trimis"}
                  </button>
                )}
              </div>
            </div>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Note Interne
              </h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Adaugă note interne despre acest lead..."
              />
              <button
                onClick={handleSaveNotes}
                disabled={actionLoading === "notes"}
                className="mt-2 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === "notes" ? "Se salvează..." : "💾 Salvează Note"}
              </button>
            </div>
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
