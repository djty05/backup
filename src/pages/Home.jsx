import { Link } from "react-router-dom";

const C = {
  bg: "#faf5ee",
  text: "#3b1320",
  muted: "#8a6070",
  border: "#e8ddd0",
  accent: "#8883d1",
  card: "#fff",
};

export default function Home() {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.text, padding: "16px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#faf5ee", letterSpacing: -0.5, fontFamily: "'Playfair Display', serif" }}>Good Answer</div>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)", margin: "0 4px" }} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Reports Hub</div>
      </div>

      {/* Main Content */}
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
        <h1 style={{ fontSize: 44, fontWeight: 700, marginBottom: 32, fontFamily: "'Playfair Display', serif", color: C.text }}>
          Campaign Reports
        </h1>
        <p style={{ fontSize: 18, color: C.muted, marginBottom: 16, lineHeight: 1.6 }}>
          Manage your influencer campaign reports.
        </p>
        <p style={{ fontSize: 18, color: C.muted, marginBottom: 56, lineHeight: 1.6 }}>
          Submit new campaigns or review existing reports.
        </p>

        {/* Action Cards */}
        <div style={{ display: "flex", gap: 24, flexDirection: "column", maxWidth: 500, margin: "0 auto" }}>
          {/* Submit Report Card */}
          <Link
            to="/SubmitReport"
            style={{
              background: C.card,
              border: `2px solid ${C.accent}`,
              borderRadius: 12,
              padding: 32,
              textDecoration: "none",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(136, 131, 209, 0.15)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>
              Submit New Report
            </h2>
          </Link>

          {/* Dashboard Card */}
          <Link
            to="/Dashboard"
            style={{
              background: C.card,
              border: `2px solid ${C.text}`,
              borderRadius: 12,
              padding: 32,
              textDecoration: "none",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow = "0 8px 24px rgba(59, 19, 32, 0.15)";
              e.currentTarget.style.transform = "translateY(-4px)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow = "none";
              e.currentTarget.style.transform = "translateY(0)";
            }}
          >
            <h2 style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>
              View Dashboard
            </h2>
            <p style={{ fontSize: 14, color: C.muted }}>
              Review all reports, manage statuses, and track campaign performance
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}