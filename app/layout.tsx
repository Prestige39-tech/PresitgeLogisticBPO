import "./globals.css";
import Link from "next/link";

export const metadata = {
  title: "Prestige Logistic BPO Portal",
  description: "Application + Admin dashboard (MVP)",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
            <div className="row">
              <strong>Prestige Logistic BPO</strong>
              <span className="badge">MVP</span>
            </div>
            <div className="row">
              <Link href="/apply" className="badge">Apply</Link>
              <Link href="/admin/login" className="badge">Admin</Link>
              <Link href="/admin/hours" className="badge">All Hours</Link>
              <Link href="/admin/occurrences" className="badge">Occurrences</Link>
            </div>
          </div>
          {children}
          <div style={{ marginTop: 32 }} className="small">
            © {new Date().getFullYear()} Prestige Logistic BPO
          </div>
        </div>
      </body>
    </html>
  );
}
