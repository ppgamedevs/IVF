"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useSearchParams } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";

interface Lead {
  id: string;
  status: string;
  created_at: string;
  city: string;
  timeline: string;
  budget_range: string;
  phone: string;
  verified_at?: string;
  sent_at?: string;
}

export default function OperatorPage() {
  const t = useTranslations("operator");
  const locale = useLocale();
  const searchParams = useSearchParams();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const token = searchParams.get("token");

  useEffect(() => {
    if (!token) {
      setError(t("unauthorized"));
      setLoading(false);
      return;
    }

    fetchLeads();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function fetchLeads() {
    try {
      const response = await fetch(`/api/operator/leads?token=${token}`);
      if (!response.ok) {
        if (response.status === 401) {
          setError(t("unauthorized"));
        } else {
          setError(t("error"));
        }
        return;
      }
      const data = await response.json();
      setLeads(data.leads || []);
    } catch {
      setError(t("error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(leadId: string) {
    if (!token) return;
    setActionLoading(leadId);
    try {
      const response = await fetch(`/api/leads/${leadId}/verify?token=${token}`, {
        method: "POST",
      });
      if (response.ok) {
        alert(t("verifySuccess"));
        fetchLeads();
      } else {
        alert(t("error"));
      }
    } catch {
      alert(t("error"));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSend(leadId: string) {
    if (!token) return;
    setActionLoading(leadId);
    try {
      const response = await fetch(`/api/leads/${leadId}/send?token=${token}`, {
        method: "POST",
      });
      if (response.ok) {
        alert(t("sendSuccess"));
        fetchLeads();
      } else {
        alert(t("error"));
      }
    } catch {
      alert(t("error"));
    } finally {
      setActionLoading(null);
    }
  }

  function getStatusLabel(status: string): string {
    switch (status) {
      case "new_unverified":
        return t("newUnverified");
      case "verified":
        return t("verified");
      case "sent_to_clinic":
        return t("sent");
      default:
        return status;
    }
  }

  function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString(locale === "ro" ? "ro-RO" : "en-GB", {
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  if (loading) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white flex items-center justify-center">
          <p className="text-medical-muted">Loading...</p>
        </main>
        <Footer />
      </>
    );
  }

  if (error) {
    return (
      <>
        <Header />
        <main className="min-h-screen bg-white flex items-center justify-center">
          <p className="text-red-600">{error}</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="min-h-screen bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          <h1 className="text-2xl sm:text-3xl font-bold text-medical-heading mb-2">{t("title")}</h1>
          <p className="text-medical-muted mb-6">{t("subtitle")}</p>

          {leads.length === 0 ? (
            <p className="text-medical-muted">{t("noLeads")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-medical-border">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-medical-border px-4 py-2 text-left text-sm font-semibold text-medical-heading">
                      {t("status")}
                    </th>
                    <th className="border border-medical-border px-4 py-2 text-left text-sm font-semibold text-medical-heading">
                      {t("createdAt")}
                    </th>
                    <th className="border border-medical-border px-4 py-2 text-left text-sm font-semibold text-medical-heading">
                      {t("city")}
                    </th>
                    <th className="border border-medical-border px-4 py-2 text-left text-sm font-semibold text-medical-heading">
                      {t("timeline")}
                    </th>
                    <th className="border border-medical-border px-4 py-2 text-left text-sm font-semibold text-medical-heading">
                      {t("budget")}
                    </th>
                    <th className="border border-medical-border px-4 py-2 text-left text-sm font-semibold text-medical-heading">
                      {t("phone")}
                    </th>
                    <th className="border border-medical-border px-4 py-2 text-left text-sm font-semibold text-medical-heading">
                      Actiuni
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-slate-50">
                      <td className="border border-medical-border px-4 py-2 text-sm">
                        {getStatusLabel(lead.status)}
                      </td>
                      <td className="border border-medical-border px-4 py-2 text-sm text-medical-muted">
                        {formatDate(lead.created_at)}
                      </td>
                      <td className="border border-medical-border px-4 py-2 text-sm">{lead.city}</td>
                      <td className="border border-medical-border px-4 py-2 text-sm">{lead.timeline}</td>
                      <td className="border border-medical-border px-4 py-2 text-sm">{lead.budget_range}</td>
                      <td className="border border-medical-border px-4 py-2 text-sm">
                        <a href={`tel:${lead.phone}`} className="text-primary-600 hover:underline">
                          {lead.phone}
                        </a>
                      </td>
                      <td className="border border-medical-border px-4 py-2">
                        <div className="flex gap-2">
                          {lead.status === "new_unverified" && (
                            <button
                              onClick={() => handleVerify(lead.id)}
                              disabled={actionLoading === lead.id}
                              className="px-3 py-1 text-xs font-medium text-white bg-primary-600 rounded hover:bg-primary-700 disabled:opacity-50"
                            >
                              {t("verify")}
                            </button>
                          )}
                          {lead.status === "verified" && (
                            <button
                              onClick={() => handleSend(lead.id)}
                              disabled={actionLoading === lead.id}
                              className="px-3 py-1 text-xs font-medium text-white bg-green-600 rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              {t("send")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
