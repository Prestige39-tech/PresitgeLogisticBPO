import ApplicationForm from "@/components/ApplicationForm";

export default function ApplyPage() {
  return (
    <div className="grid">
      <div className="card">
        <h2 style={{ marginTop: 0 }}>Contractor Application</h2>
        <p className="small" style={{ marginTop: 0 }}>
          Remote (1099). Minimum internet requirement: <b>100 Mbps download</b> and <b>100 Mbps upload</b>.
          Resume and at least two references are required.
        </p>
        <div className="hr" />
        <ApplicationForm />
      </div>
    </div>
  );
}
