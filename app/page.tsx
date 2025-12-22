import Link from "next/link";

export default function Home() {
  return (
    <div className="card grid">
      <h2 style={{ margin: 0 }}>Welcome</h2>
      <p style={{ margin: 0 }} className="small">
        Use this portal to submit applications and for admins to review candidates.
      </p>
      <div className="row">
        <Link href="/apply"><button>Go to Application</button></Link>
        <Link href="/admin/login"><button className="secondary">Admin Login</button></Link>
      </div>
    </div>
  );
}
