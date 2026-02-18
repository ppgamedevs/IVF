import { useTranslations } from "next-intl";

const icons = [
  <svg key="clinics" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 0h.008v.008h-.008V7.5z" /></svg>,
  <svg key="gdpr" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>,
  <svg key="free" className="w-6 h-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" /></svg>,
];

const trustKeys = [
  { labelKey: "partnerClinics", descKey: "partnerClinicsDesc" },
  { labelKey: "gdprCompliant", descKey: "gdprCompliantDesc" },
  { labelKey: "freeService", descKey: "freeServiceDesc" },
] as const;

export default function TrustBar() {
  const t = useTranslations("trust");

  return (
    <section className="bg-white border-y border-medical-border">
      <div className="container-wide section-padding !py-10 sm:!py-12">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
          {trustKeys.map((item, i) => (
            <div key={item.labelKey} className="flex items-center gap-4 justify-center">
              <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                {icons[i]}
              </div>
              <div>
                <p className="font-semibold text-medical-heading text-sm">{t(item.labelKey)}</p>
                <p className="text-sm text-medical-muted">{t(item.descKey)}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
