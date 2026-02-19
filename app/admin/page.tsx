"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface Lead {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  city: string;
  timeline: string;
  budget_range: string;
  status: string;
  created_at: string;
}

export default function AdminPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError("Token lipsă");
      setLoading(false);
      return;
    }

    fetch(`/api/admin/leads?token=${token}`)
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
  }, [token]);

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
      new: "bg-gray-100 text-gray-800",
      "new_unverified": "bg-yellow-100 text-yellow-800",
      verified: "bg-blue-100 text-blue-800",
      assigned: "bg-purple-100 text-purple-800",
      sent: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      new: "Nou",
      "new_unverified": "Nou (neverificat)",
      verified: "Verificat",
      assigned: "Atribuit",
      sent: "Trimis",
      rejected: "Respins",
    };
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-medium ${
          styles[status] || styles.new
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Acces Neautorizat
          </h1>
          <p className="text-gray-600">
            Token lipsă. Accesează panoul cu ?token=...
          </p>
        </div>
      </div>
    );
  }

  if (error && error !== "Token lipsă") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Eroare</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">
              Panou de Control - Lead-uri
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Ultimele 100 de lead-uri
            </p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-600">
              Se încarcă...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nume
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Telefon
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Oraș
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Termen
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Buget
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leads.map((lead) => (
                    <tr
                      key={lead.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() =>
                        router.push(`/admin/lead/${lead.id}?token=${token}`)
                      }
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {formatLeadId(lead.id)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {lead.first_name} {lead.last_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {lead.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {lead.city || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {lead.timeline === "asap"
                          ? "Cât mai curând"
                          : lead.timeline === "1-3months"
                          ? "În 1-3 luni"
                          : lead.timeline === "researching"
                          ? "Doar mă informez"
                          : lead.timeline || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {lead.budget_range === "under-10k"
                          ? "Sub 10k"
                          : lead.budget_range === "10k-20k"
                          ? "10k-20k"
                          : lead.budget_range === "over-20k"
                          ? "Peste 20k"
                          : lead.budget_range === "prefer-discuss"
                          ? "Preferă să discute"
                          : lead.budget_range || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(lead.status || "new")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {formatDate(lead.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
