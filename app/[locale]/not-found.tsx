export default function NotFound() {
  return (
    <html>
      <body className="font-sans antialiased bg-white text-medical-heading">
        <div className="min-h-screen flex items-center justify-center px-4">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-primary-600 mb-4">404</h1>
            <p className="text-xl text-medical-muted mb-8">
              Page not found / Pagina nu a fost găsită
            </p>
            <a
              href="/ro"
              className="inline-flex items-center px-6 py-3 text-base font-semibold text-white bg-primary-600 rounded-xl hover:bg-primary-700 transition-colors"
            >
              ← Acasă / Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
