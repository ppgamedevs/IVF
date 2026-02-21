"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export const dynamic = "force-dynamic";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  city: string;
  urgency_level: string | null;
  lead_tier: string;
  operator_status: string;
  voucher_status: string | null;
  female_age_exact: number | null;
  best_contact_method: string | null;
  operator_verified_at: string | null;
  sent_to_clinic_at: string | null;
  created_at: string;
  updated_at: string;
  clinic_name: string | null;
  clinic_email: string | null;
}

function AdminPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [tierFilter, setTierFilter] = useState<string>("");
  const [cityFilter, setCityFilter] = useState<string>("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("");
  const [voucherFilter, setVoucherFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 100, total: 0, totalPages: 1 });

  const loadLeads = useCallback(() => {
    if (!token) {
      setError("Token lipsă");
      setLoading(false);
      return;
    }

    setLoading(true);
    const qs = new URLSearchParams({ token });
    if (statusFilter) qs.append("status", statusFilter);
    if (tierFilter) qs.append("tier", tierFilter);
    if (cityFilter) qs.append("city", cityFilter);
    if (urgencyFilter) qs.append("urgency", urgencyFilter);
    if (voucherFilter) qs.append("voucher", voucherFilter);
    if (searchFilter) qs.append("search", searchFilter);
    qs.append("page", String(pagination.page));
    qs.append("limit", String(pagination.limit));

    fetch(`/api/admin/leads?${qs}`)
      .then((res) => {
        if (res.status === 403) {
          setError("Acces neautorizat");
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.leads) {
          setLeads(data.leads);
          if (data.pagination) {
            setPagination(data.pagination);
          }
        } else {
          setError("Eroare la încărcarea lead-urilor");
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError("Eroare la încărcarea lead-urilor");
        setLoading(false);
      });
  }, [token, statusFilter, tierFilter, cityFilter, urgencyFilter, voucherFilter, searchFilter, pagination.page, pagination.limit]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("ro-RO", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Bucharest",
    });
  };

  const formatLeadId = (uuid: string) => {
    return uuid.replace(/-/g, "").slice(0, 8).toUpperCase();
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      NEW: "bg-gray-100 text-gray-800",
      CALLED_NO_ANSWER: "bg-yellow-100 text-yellow-800",
      INVALID: "bg-red-100 text-red-800",
      LOW_INTENT_NURTURE: "bg-orange-100 text-orange-800",
      VERIFIED_READY: "bg-blue-100 text-blue-800",
      SENT_TO_CLINIC: "bg-green-100 text-green-800",
    };
    const labels: Record<string, string> = {
      NEW: "Nou",
      CALLED_NO_ANSWER: "Apel fără răspuns",
      INVALID: "Invalid",
      LOW_INTENT_NURTURE: "Intenție scăzută",
      VERIFIED_READY: "Verificat gata",
      SENT_TO_CLINIC: "Trimis la clinică",
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${
          styles[status] || styles.NEW
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  const getTierBadge = (tier: string) => {
    const styles: Record<string, string> = {
      A: "bg-green-600 text-white font-bold",
      B: "bg-blue-600 text-white",
      C: "bg-yellow-600 text-white",
      D: "bg-gray-600 text-white",
    };
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${styles[tier] || styles.D}`}>
        Tier {tier}
      </span>
    );
  };

  const urgencyLabels: Record<string, string> = {
    ASAP_0_30: "ASAP",
    SOON_1_3: "1-3 luni",
    MID_3_6: "3-6 luni",
    LATER_6_12: "6-12 luni",
    INFO_ONLY: "Info",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">Se încarcă...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Panou Operator - Lead-uri</h1>
          <p className="text-sm text-gray-600">Total: {pagination.total} lead-uri</p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Toate</option>
                <option value="NEW">Nou</option>
                <option value="CALLED_NO_ANSWER">Apel fără răspuns</option>
                <option value="VERIFIED_READY">Verificat gata</option>
                <option value="LOW_INTENT_NURTURE">Intenție scăzută</option>
                <option value="INVALID">Invalid</option>
                <option value="SENT_TO_CLINIC">Trimis la clinică</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tier</label>
              <select
                value={tierFilter}
                onChange={(e) => {
                  setTierFilter(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Toate</option>
                <option value="A">Tier A</option>
                <option value="B">Tier B</option>
                <option value="C">Tier C</option>
                <option value="D">Tier D</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Urgență</label>
              <select
                value={urgencyFilter}
                onChange={(e) => {
                  setUrgencyFilter(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Toate</option>
                <option value="ASAP_0_30">ASAP (0-30 zile)</option>
                <option value="SOON_1_3">În curând (1-3 luni)</option>
                <option value="MID_3_6">Medie (3-6 luni)</option>
                <option value="LATER_6_12">Mai târziu (6-12 luni)</option>
                <option value="INFO_ONLY">Doar informare</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Voucher</label>
              <select
                value={voucherFilter}
                onChange={(e) => {
                  setVoucherFilter(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Toate</option>
                <option value="NONE">Fără</option>
                <option value="APPLIED">Aplicat</option>
                <option value="APPROVED_ASSMB">Aprobat ASSMB</option>
                <option value="APPROVED_NATIONAL">Aprobat Național</option>
                <option value="APPROVED_OTHER">Aprobat alt</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Oraș</label>
              <input
                type="text"
                value={cityFilter}
                onChange={(e) => {
                  setCityFilter(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
                placeholder="ex. București"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Căutare</label>
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => {
                  setSearchFilter(e.target.value);
                  setPagination({ ...pagination, page: 1 });
                }}
                placeholder="Nume, email, telefon"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>
        </div>

        {/* Tier D info: new leads stay D until operator verifies */}
        <p className="text-sm text-gray-500 mb-2">
          Lead-urile noi apar ca <strong>Tier D</strong> până când le verifici (în detaliu lead: butonul „Verifică Gata”). După verificare, tier-ul devine A, B sau C.
        </p>

        {/* Leads Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nume</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefon</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Oraș</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Urgență</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vârstă</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tier</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Clinică</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actualizat</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => router.push(`/admin/lead/${lead.id}?token=${token}`)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-600">
                      {formatLeadId(lead.id)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lead.first_name} {lead.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.city}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.urgency_level ? urgencyLabels[lead.urgency_level] || lead.urgency_level : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.female_age_exact ? `${lead.female_age_exact} ani` : "—"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTierBadge(lead.lead_tier)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(lead.operator_status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {lead.clinic_name ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                          {lead.clinic_name}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(lead.updated_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {leads.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              Nu s-au găsit lead-uri cu filtrele selectate.
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Pagina {pagination.page} din {pagination.totalPages}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination({ ...pagination, page: Math.max(1, pagination.page - 1) })}
                  disabled={pagination.page === 1}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPagination({ ...pagination, page: Math.min(pagination.totalPages, pagination.page + 1) })}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Următor
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 p-8"><div className="max-w-7xl mx-auto">Se încarcă...</div></div>}>
      <AdminPageContent />
    </Suspense>
  );
}
