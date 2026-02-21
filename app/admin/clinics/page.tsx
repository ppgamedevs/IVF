"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

const ADMIN_TOKEN_KEY = "fivmatch_admin_token";

interface Clinic {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city_coverage: string[] | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function ClinicsPageContent() {
  const searchParams = useSearchParams();
  const tokenFromUrl = searchParams.get("token");
  const token = tokenFromUrl || (typeof window !== "undefined" ? sessionStorage.getItem(ADMIN_TOKEN_KEY) : null);

  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", city: "" });

  useEffect(() => {
    if (tokenFromUrl && typeof window !== "undefined") {
      sessionStorage.setItem(ADMIN_TOKEN_KEY, tokenFromUrl);
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [tokenFromUrl]);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/admin/clinics?token=${token}`)
      .then((res) => (res.status === 403 ? null : res.json()))
      .then((data) => {
        if (data?.clinics) setClinics(data.clinics);
        else setError("Eroare la încărcare");
        setLoading(false);
      })
      .catch(() => {
        setError("Eroare la încărcare");
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !form.name.trim() || !form.email.trim()) return;
    setSaving(true);
    fetch(`/api/admin/clinics?token=${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        city: form.city.trim() || undefined,
        active: true,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.clinic) {
          setClinics((prev) => [...prev, data.clinic]);
          setForm({ name: "", email: "", phone: "", city: "" });
        } else alert(data.error || "Eroare la salvare");
        setSaving(false);
      })
      .catch(() => {
        alert("Eroare la salvare");
        setSaving(false);
      });
  };

  const setInactive = (id: string) => {
    if (!token || !confirm("Dezactivezi această clinică? Nu va mai apărea în lista de atribuire.")) return;
    fetch(`/api/admin/clinics/${id}?token=${token}`, { method: "DELETE" })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setClinics((prev) => prev.map((c) => (c.id === id ? { ...c, active: false } : c)));
        else alert(data.error || "Eroare");
      });
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600">Token lipsă. Accesează panoul cu linkul de admin.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Link href="/admin" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Lead-uri
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Clinici</h1>
        </div>

        {/* Form: add clinic */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Adaugă clinică</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nume *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="ex. Clinica XYZ"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email contact *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                placeholder="contact@clinica.ro"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                placeholder="+40 21 123 4567"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Oraș</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                placeholder="ex. București"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 text-sm font-medium"
              >
                {saving ? "Se salvează..." : "Salvează clinică"}
              </button>
            </div>
          </form>
        </div>

        {/* List */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 px-6 py-4 border-b">Lista clinici ({clinics.length})</h2>
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-500">Se încarcă...</div>
          ) : error ? (
            <div className="px-6 py-8 text-center text-red-600">{error}</div>
          ) : clinics.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-500">Nicio clinică. Adaugă una mai sus.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {clinics.map((c) => (
                <li key={c.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">{c.name}</p>
                    <p className="text-sm text-gray-600">
                      {c.email}
                      {c.phone ? ` · ${c.phone}` : ""}
                      {c.city_coverage?.length ? ` · ${c.city_coverage.join(", ")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!c.active && (
                      <span className="text-xs px-2 py-1 bg-gray-200 text-gray-600 rounded">Inactivă</span>
                    )}
                    {c.active && (
                      <button
                        type="button"
                        onClick={() => setInactive(c.id)}
                        className="text-xs text-red-600 hover:text-red-800"
                      >
                        Dezactivează
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminClinicsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 p-8">Se încarcă...</div>}>
      <ClinicsPageContent />
    </Suspense>
  );
}
