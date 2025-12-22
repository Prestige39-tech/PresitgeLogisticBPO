import Link from "next/link";

export default function SuccessPage() {
  return (
    <div className="card grid">
      <h2 style={{ margin: 0 }}>Application submitted</h2>
      <p className="small" style={{ margin: 0 }}>
        Thank you — we received your application. If selected, you will be contacted by email or phone.
      </p>
      <div className="row">
        <Link href="/apply"><button className="secondary">Submit another</button></Link>
        <Link href="/"><button>Home</button></Link>
      </div>
    </div>
  );
}
