import Link from "next/link";

export default function NotFound() {
  return (
    <html lang="ro">
      <head>
        <title>Pagina nu a fost găsită | FIV Match - Clinici FIV Romania</title>
        <meta name="robots" content="noindex, follow" />
      </head>
      <body className="font-sans antialiased bg-white text-medical-heading">
        <div className="min-h-screen flex items-center justify-center px-4 py-12">
          <div className="text-center max-w-md">
            <h1 className="text-6xl font-bold text-primary-600 mb-4">404</h1>
            <p className="text-xl text-medical-muted mb-2">
              Pagina nu a fost găsită
            </p>
            <p className="text-medical-muted mb-8">
              Page not found
            </p>
            <nav className="flex flex-col sm:flex-row gap-3 justify-center items-center flex-wrap">
              <Link
                href="/ro"
                className="inline-flex items-center px-6 py-3 text-base font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors"
              >
                Acasă (RO)
              </Link>
              <Link
                href="/en"
                className="inline-flex items-center px-6 py-3 text-base font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors"
              >
                Home (EN)
              </Link>
              <Link
                href="/ro#lead-form"
                className="inline-flex items-center px-6 py-3 text-base font-medium text-primary-600 border border-primary-600 rounded-xl hover:bg-primary-50 transition-colors"
              >
                Formular solicitare
              </Link>
              <Link
                href="/ro/privacy"
                className="inline-flex items-center px-6 py-3 text-base font-medium text-medical-muted hover:text-primary-600 transition-colors"
              >
                Confidențialitate
              </Link>
              <Link
                href="/ro/terms"
                className="inline-flex items-center px-6 py-3 text-base font-medium text-medical-muted hover:text-primary-600 transition-colors"
              >
                Termeni
              </Link>
            </nav>
          </div>
        </div>
      </body>
    </html>
  );
}
