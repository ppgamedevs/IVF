import "../globals.css";

export const dynamic = "force-dynamic";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ro">
      <body className="antialiased">{children}</body>
    </html>
  );
}
