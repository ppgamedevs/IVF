import { useTranslations } from "next-intl";

const benefitIcons = [
  <svg key="time" className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
  <svg key="personalized" className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>,
  <svg key="trusted" className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" /></svg>,
  <svg key="free" className="w-7 h-7" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" /></svg>,
];

const benefitKeys = ["saveTime", "personalized", "trustedPartners", "noCost"] as const;

export default function Benefits() {
  const t = useTranslations("benefits");

  return (
    <section id="cum-functioneaza" className="bg-medical-bg scroll-mt-20">
      <div className="section-padding">
        <div className="container-wide">
          <div className="text-center mb-14">
            <h2 className="text-2xl sm:text-3xl font-bold text-medical-heading mb-4">{t("title")}</h2>
            <p className="text-medical-muted text-lg max-w-2xl mx-auto">{t("subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {benefitKeys.map((key, i) => (
              <div
                key={key}
                className="bg-white rounded-2xl p-8 border border-medical-border hover:border-primary-200 transition-colors duration-200 hover:shadow-sm"
              >
                <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-primary-50 text-primary-600 mb-5">
                  {benefitIcons[i]}
                </div>
                <h3 className="text-lg font-semibold text-medical-heading mb-2">{t(`${key}Title`)}</h3>
                <p className="text-medical-muted leading-relaxed">{t(`${key}Desc`)}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
