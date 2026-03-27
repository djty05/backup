import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { updateReportStatus, deleteReport, updateReport, regenAnalysis } from "../api/backendFunctions";
import AnalysisOverrideModal from "../components/AnalysisOverrideModal";
import { base44 } from "../api/base44Client";

const C = {
  bg: "#faf5ee",
  text: "#3b1320",
  muted: "#8a6070",
  border: "#e8ddd0",
  accent: "#8883d1",
  card: "#fff",
};

const statusColors = {
  "Processing": "#dd7d4f",
  "Needs Review": "#dd7d4f",
  "Approved": "#3a8a4a",
  "Sent": "#3a8a4a",
};

export default function Dashboard() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      if (!auth) base44.auth.redirectToLogin(window.location.href);
    });
  }, []);
  const [statusFilter, setStatusFilter] = useState("all");
  const [brandFilter, setBrandFilter] = useState("all");
  const [talentFilter, setTalentFilter] = useState("all");
  const [paidFilter, setPaidFilter] = useState("all");
  const [performanceSort, setPerformanceSort] = useState("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedId, setCopiedId] = useState(null);
  const [regenningId, setRegenningId] = useState(null);
  const [overrideReport, setOverrideReport] = useState(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const reports = await base44.entities.CampaignReport.list('-created_date', 200);
        setReports(reports || []);
      } catch (err) {
        console.error("Failed to fetch reports:", err);
      }
      setLoading(false);
    };
    fetchReports();

    const interval = setInterval(fetchReports, 5000);
    return () => clearInterval(interval);
  }, []);

  const updateStatus = async (reportId, newStatus) => {
    try {
      await updateReportStatus({ reportId, status: newStatus });
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: newStatus } : r));
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const getShareLink = (slug) => {
    const baseUrl = window.location.origin;
    return `${baseUrl}/Report?slug=${slug}`;
  };

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleRegenAnalysis = async (reportId) => {
    setRegenningId(reportId);
    try {
      await regenAnalysis({ reportId });
    } catch (err) {
      console.error("Failed to regen analysis:", err);
    }
    setRegenningId(null);
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm("Are you sure? This cannot be undone.")) return;
    try {
      await deleteReport({ reportId });
      setReports(prev => prev.filter(r => r.id !== reportId));
    } catch (err) {
      console.error("Failed to delete report:", err);
    }
  };



  const getPerformanceScore = (report) => {
    return (report.total_views || 0) + (report.engagement_rate || 0) * 100 + (report.likes || 0);
  };

  let filteredReports = reports.filter(r => {
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    const matchBrand = brandFilter === "all" || r.brand_name === brandFilter;
    const matchTalent = talentFilter === "all" || r.creator_name === talentFilter;
    const matchPaid = paidFilter === "all" || (paidFilter === "paid" ? r.is_paid !== false : r.is_paid === false);
    const matchSearch = searchQuery === "" || 
      r.campaign_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.brand_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.creator_name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStatus && matchBrand && matchTalent && matchPaid && matchSearch;
  });

  if (performanceSort === "best") {
    filteredReports.sort((a, b) => (b.total_views || 0) - (a.total_views || 0));
  } else if (performanceSort === "worst") {
    filteredReports.sort((a, b) => (b.engagement_rate || 0) - (a.engagement_rate || 0));
  }

  // Group burst reports under their parent
  const burstReports = filteredReports.filter(r => r.parent_report_id);
  const burstsByParent = {};
  burstReports.forEach(r => {
    if (!burstsByParent[r.parent_report_id]) burstsByParent[r.parent_report_id] = [];
    burstsByParent[r.parent_report_id].push(r);
  });
  const rootReports = filteredReports.filter(r => !r.parent_report_id);

  const uniqueBrands = [...new Set(reports.map(r => r.brand_name))].sort();
  const uniqueTalents = [...new Set(reports.map(r => r.creator_name))].sort();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, margin: "0 auto 20px", border: `3px solid ${C.border}`, borderTop: `3px solid ${C.text}`, borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
          <p style={{ color: C.muted }}>Loading reports...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.text, padding: "16px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <img src="https://media.base44.com/images/public/69b9ee2e21d1a8f05796536b/4bfaa5b98_GOODANSWERLONGLOGO3750x938px1.png" alt="Good Answer" style={{ height: 28, width: "auto" }} />
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)", margin: "0 4px" }} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Reports Dashboard</div>
        <div style={{ marginLeft: "auto", fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
          {filteredReports.length} report{filteredReports.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "44px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 0, fontFamily: "'Playfair Display', serif" }}>All Reports</h1>
          <Link to="/SubmitReport" style={{ background: C.text, border: "none", borderRadius: 8, padding: "12px 20px", color: "#faf5ee", fontWeight: 600, fontSize: 14, cursor: "pointer", textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}>
            + New Report
          </Link>
        </div>

        {/* Topline Summary */}
        {(() => {
          const sentReports = reports.filter(r => r.total_views || r.engagement_rate);
          if (sentReports.length === 0) return null;

          const totalViews = sentReports.reduce((sum, r) => sum + (r.total_views || 0), 0);
          const ratesWithData = sentReports.filter(r => r.engagement_rate);
          const avgEngagement = ratesWithData.length
            ? (ratesWithData.reduce((sum, r) => sum + r.engagement_rate, 0) / ratesWithData.length).toFixed(2)
            : null;
          const topCampaignByViews = [...sentReports].sort((a, b) => (b.total_views || 0) - (a.total_views || 0))[0];
          const topCampaignByEngagement = ratesWithData.length
            ? [...ratesWithData].sort((a, b) => b.engagement_rate - a.engagement_rate)[0]
            : null;

          // Top deliverable by views and engagement across all reports
          const allDeliverables = sentReports.flatMap(r => {
            let assets = r.asset_metrics || [];
            if (assets.length === 0 && r.asset_metrics_json) {
              try { assets = JSON.parse(r.asset_metrics_json); } catch (e) {}
            }
            return assets.map(a => ({ ...a, report: r }));
          });
          const delWithViews = allDeliverables.filter(a => a.metrics?.total_views > 0);
          const delWithER = allDeliverables.filter(a => a.metrics?.engagement_rate > 0);
          const topDelByViews = delWithViews.sort((a, b) => (b.metrics?.total_views || 0) - (a.metrics?.total_views || 0))[0];
          const topDelByER = delWithER.sort((a, b) => (b.metrics?.engagement_rate || 0) - (a.metrics?.engagement_rate || 0))[0];

          return (
            <div style={{ marginBottom: 32 }}>
              {/* Row 1: stat cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
                <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px" }}>
                  <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 500 }}>Avg Views</div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: C.text }}>{Math.round(totalViews / sentReports.length).toLocaleString()}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>across {sentReports.length} report{sentReports.length !== 1 ? "s" : ""}</div>
                </div>
                {avgEngagement && (
                  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px" }}>
                    <div style={{ fontSize: 11, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 500 }}>Avg Engagement Rate</div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: C.text }}>{avgEngagement}%</div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>across {ratesWithData.length} report{ratesWithData.length !== 1 ? "s" : ""}</div>
                  </div>
                )}
              </div>
              {/* Row 2: leaderboard cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
                {topCampaignByViews && (
                  <div style={{ background: "#ede9f8", border: `1px solid #d0cdf0`, borderRadius: 10, padding: "16px 20px" }}>
                    <div style={{ fontSize: 11, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>🏆 Top Campaign — Views</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{topCampaignByViews.creator_name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{topCampaignByViews.campaign_name}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>{(topCampaignByViews.total_views || 0).toLocaleString()} views</div>
                  </div>
                )}
                {topDelByViews && (
                  <div style={{ background: "#ede9f8", border: `1px solid #d0cdf0`, borderRadius: 10, padding: "16px 20px" }}>
                    <div style={{ fontSize: 11, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>🏆 Top Deliverable — Views</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{topDelByViews.label}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{topDelByViews.report?.campaign_name}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>{(topDelByViews.metrics?.total_views || 0).toLocaleString()} views</div>
                  </div>
                )}
                {topCampaignByEngagement && (
                  <div style={{ background: "#ede9f8", border: `1px solid #d0cdf0`, borderRadius: 10, padding: "16px 20px" }}>
                    <div style={{ fontSize: 11, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>🏆 Top Campaign — Engagement</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{topCampaignByEngagement.creator_name}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{topCampaignByEngagement.campaign_name}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>{topCampaignByEngagement.engagement_rate}% ER</div>
                  </div>
                )}
                {topDelByER && (
                  <div style={{ background: "#ede9f8", border: `1px solid #d0cdf0`, borderRadius: 10, padding: "16px 20px" }}>
                    <div style={{ fontSize: 11, color: C.accent, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, fontWeight: 600 }}>🏆 Top Deliverable — Engagement</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 2 }}>{topDelByER.label}</div>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 4 }}>{topDelByER.report?.campaign_name}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: C.accent }}>{topDelByER.metrics?.engagement_rate}% ER</div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Search Bar */}
        <div style={{ marginBottom: 24 }}>
          <input
            type="text"
            placeholder="Search by campaign, brand, or talent..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              background: C.card,
              border: `1px solid ${C.border}`,
              borderRadius: 8,
              padding: "11px 14px",
              color: C.text,
              fontSize: 14,
              fontFamily: "'DM Sans', sans-serif",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 8, marginBottom: 28, flexWrap: "wrap" }}>
          {/* Status Filter */}
          {["all", "Processing", "Needs Review", "Sent"].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              style={{
                background: statusFilter === status ? C.text : C.card,
                border: `1px solid ${statusFilter === status ? C.text : C.border}`,
                borderRadius: 6,
                padding: "8px 14px",
                color: statusFilter === status ? "#faf5ee" : C.muted,
                fontSize: 13,
                cursor: "pointer",
                fontWeight: statusFilter === status ? 600 : 400,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {status === "all" ? "All Statuses" : status}
            </button>
          ))}

          {/* Brand Filter */}
          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            style={{
              background: C.card,
              border: `1px solid ${brandFilter === "all" ? C.border : C.accent}`,
              borderRadius: 6,
              padding: "8px 12px",
              color: C.text,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: brandFilter === "all" ? 400 : 600,
            }}
          >
            <option value="all">All Brands</option>
            {uniqueBrands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>

          {/* Talent Filter */}
          <select
            value={talentFilter}
            onChange={(e) => setTalentFilter(e.target.value)}
            style={{
              background: C.card,
              border: `1px solid ${talentFilter === "all" ? C.border : C.accent}`,
              borderRadius: 6,
              padding: "8px 12px",
              color: C.text,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: talentFilter === "all" ? 400 : 600,
            }}
          >
            <option value="all">All Talent</option>
            {uniqueTalents.map(talent => (
              <option key={talent} value={talent}>{talent}</option>
            ))}
          </select>

          {/* Paid Filter */}
          <select
            value={paidFilter}
            onChange={(e) => setPaidFilter(e.target.value)}
            style={{
              background: C.card,
              border: `1px solid ${paidFilter === "all" ? C.border : C.accent}`,
              borderRadius: 6,
              padding: "8px 12px",
              color: C.text,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: paidFilter === "all" ? 400 : 600,
            }}
          >
            <option value="all">Paid &amp; Organic</option>
            <option value="paid">Paid Only</option>
            <option value="organic">Organic Only</option>
          </select>

          {/* Performance Sort */}
          <select
            value={performanceSort}
            onChange={(e) => setPerformanceSort(e.target.value)}
            style={{
              background: C.card,
              border: `1px solid ${performanceSort === "none" ? C.border : C.accent}`,
              borderRadius: 6,
              padding: "8px 12px",
              color: C.text,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: performanceSort === "none" ? 400 : 600,
            }}
          >
            <option value="none">Sort by Performance</option>
            <option value="best">Top Views</option>
            <option value="worst">Top Engagement</option>
          </select>
        </div>

        {/* Reports Table */}
        {filteredReports.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", background: C.card, borderRadius: 12, border: `1px solid ${C.border}` }}>
            <p style={{ color: C.muted, fontSize: 15 }}>No reports found.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {rootReports.map(report => (
              <React.Fragment key={report.id}>
              <div
                style={{
                  background: C.card,
                  border: `1px solid ${C.border}`,
                  borderRadius: 10,
                  padding: 20,
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr 1fr auto auto",
                  gap: 20,
                  alignItems: "center",
                }}
              >
                {/* Campaign */}
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 500 }}>Campaign</div>
                  <Link to={`/Report?slug=${report.report_slug}`} style={{ fontSize: 15, fontWeight: 600, color: C.accent, textDecoration: "none" }}>
                    {report.campaign_name}
                  </Link>
                  <div style={{ marginTop: 6, display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {report.created_by && (
                      <span style={{ background: "#f0ede8", border: `1px solid ${C.border}`, borderRadius: 4, padding: "2px 8px", fontSize: 11, color: C.muted, fontWeight: 500 }}>
                        👤 {report.created_by.split("@")[0]}
                      </span>
                    )}
                    {report.is_paid !== false ? (
                      <span style={{ background: "#e8f5e9", border: "1px solid #a5d6a7", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#2e7d32", fontWeight: 600 }}>💰 Paid</span>
                    ) : (
                      <span style={{ background: "#fce4ec", border: "1px solid #f48fb1", borderRadius: 4, padding: "2px 8px", fontSize: 11, color: "#c2185b", fontWeight: 600 }}>🌿 Organic</span>
                    )}
                  </div>
                </div>

                {/* Xero & Placements */}
                <div>
                  {report.xero_quote_ref && (
                    <>
                      <div style={{ fontSize: 11, color: C.muted, marginBottom: 4, textTransform: "uppercase", fontWeight: 500 }}>Xero Ref</div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>{report.xero_quote_ref}</div>
                    </>
                  )}
                  {report.platforms && report.platforms.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 8 }}>
                      {report.platforms.slice(0, 2).map(p => (
                        <span key={p} style={{ background: "#ede9f8", color: C.accent, borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>
                          {p}
                        </span>
                      ))}
                      {report.platforms.length > 2 && (
                        <span style={{ fontSize: 11, color: C.muted }}>+{report.platforms.length - 2}</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Performance */}
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, textTransform: "uppercase", fontWeight: 500 }}>Performance</div>
                  {report.total_views ? (
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{report.total_views.toLocaleString()} views</div>
                  ) : (
                    <div style={{ fontSize: 13, color: C.muted }}>—</div>
                  )}
                  {report.engagement_rate ? (
                    <div style={{ fontSize: 13, color: C.accent, marginTop: 2 }}>{report.engagement_rate}% ER</div>
                  ) : null}
                </div>

                {/* Status */}
                <div>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 8, textTransform: "uppercase", fontWeight: 500 }}>Status</div>
                  {report.status === 'Sent' ? (
                    <div style={{ fontSize: 14, fontWeight: 700, color: statusColors['Sent'], padding: "8px 10px" }}>✓ Sent</div>
                  ) : (
                    <select
                      value={report.status}
                      onChange={e => updateStatus(report.id, e.target.value)}
                      style={{
                        background: C.card,
                        border: `1px solid ${C.border}`,
                        borderRadius: 6,
                        padding: "8px 10px",
                        color: statusColors[report.status] || C.text,
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: "pointer",
                        fontFamily: "'DM Sans', sans-serif",
                      }}
                    >
                      <option value="Processing">Processing</option>
                      <option value="Needs Review">Needs Review</option>
                      <option value="Sent">Sent</option>
                    </select>
                  )}
                </div>

                {/* Share Link */}
                <div style={{ textAlign: "right" }}>
                  <button
                    onClick={() => copyToClipboard(getShareLink(report.report_slug), report.id)}
                    style={{ background: C.accent, border: "none", borderRadius: 6, padding: "8px 12px", color: "#fff", fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {copiedId === report.id ? "✓ Copied" : "Copy Link"}
                  </button>
                </div>

                {/* Actions */}
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setOverrideReport(report)}
                    disabled={report.status === 'Sent'}
                    style={{ background: "transparent", border: `1px solid ${C.accent}`, borderRadius: 6, padding: "8px 12px", color: C.accent, fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    ✏️ Override
                  </button>
                  <button
                    onClick={() => handleRegenAnalysis(report.id)}
                    disabled={regenningId === report.id || report.status === 'Sent'}
                    style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", color: C.muted, fontSize: 12, cursor: regenningId === report.id ? "default" : "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", opacity: regenningId === report.id ? 0.5 : 1 }}
                  >
                    {regenningId === report.id ? "Regenerating..." : "↻ Analysis"}
                  </button>
                  <Link
                    to={`/SubmitReport?reportId=${report.id}`}
                    style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", color: C.text, fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none", display: "inline-block" }}
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(report.id)}
                    disabled={report.status === 'Sent'}
                    style={{ background: "transparent", border: `1px solid #f5c0c0`, borderRadius: 6, padding: "8px 12px", color: "#b03030", fontSize: 12, cursor: report.status === 'Sent' ? "default" : "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", opacity: report.status === 'Sent' ? 0.3 : 1 }}
                  >
                    Delete
                  </button>
                  <a
                    href={`/Report?slug=${report.report_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ background: "transparent", border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px", color: C.text, fontSize: 12, cursor: "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none", display: "inline-block" }}
                  >
                    View →
                  </a>
                </div>
              </div>

              {/* Burst children */}
              {(burstsByParent[report.id] || []).sort((a, b) => (a.burst_number || 2) - (b.burst_number || 2)).map(burst => (
                <div
                  key={burst.id}
                  style={{
                    background: "#faf5ff",
                    border: `1px solid #d0cdf0`,
                    borderRadius: 10,
                    padding: 16,
                    marginLeft: 32,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 1fr auto auto",
                    gap: 20,
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: 11, color: C.accent, marginBottom: 4, textTransform: "uppercase", fontWeight: 600 }}>↳ Burst {burst.burst_number || "?"}</div>
                    <Link to={`/Report?slug=${burst.report_slug}`} style={{ fontSize: 14, fontWeight: 600, color: C.accent, textDecoration: "none" }}>
                      {burst.campaign_name}
                    </Link>
                  </div>
                  <div>
                    {burst.platforms && burst.platforms.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                        {burst.platforms.slice(0, 2).map(p => (
                          <span key={p} style={{ background: "#ede9f8", color: C.accent, borderRadius: 4, padding: "2px 8px", fontSize: 11 }}>{p}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    {burst.total_views ? <div style={{ fontSize: 13, fontWeight: 600 }}>{burst.total_views.toLocaleString()} views</div> : <div style={{ fontSize: 12, color: C.muted }}>—</div>}
                    {burst.engagement_rate ? <div style={{ fontSize: 12, color: C.accent }}>{burst.engagement_rate}% ER</div> : null}
                  </div>
                  <div>
                    {burst.status === 'Sent' ? (
                      <div style={{ fontSize: 13, fontWeight: 700, color: statusColors['Sent'] }}>✓ Sent</div>
                    ) : (
                      <select value={burst.status} onChange={e => updateStatus(burst.id, e.target.value)}
                        style={{ background: "#faf5ff", border: `1px solid #d0cdf0`, borderRadius: 6, padding: "6px 10px", color: statusColors[burst.status] || C.text, fontWeight: 600, fontSize: 12, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                        <option value="Processing">Processing</option>
                        <option value="Needs Review">Needs Review</option>
                        <option value="Sent">Sent</option>
                      </select>
                    )}
                  </div>
                  <div>
                    <button onClick={() => copyToClipboard(getShareLink(burst.report_slug), burst.id)}
                      style={{ background: C.accent, border: "none", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 11, cursor: "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif" }}>
                      {copiedId === burst.id ? "✓ Copied" : "Copy Link"}
                    </button>
                  </div>
                  <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                    <Link to={`/SubmitReport?reportId=${burst.id}`}
                      style={{ background: "transparent", border: `1px solid #d0cdf0`, borderRadius: 6, padding: "6px 10px", color: C.text, fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none", display: "inline-block" }}>
                      Edit
                    </Link>
                    <button onClick={() => handleDelete(burst.id)} disabled={burst.status === 'Sent'}
                      style={{ background: "transparent", border: `1px solid #f5c0c0`, borderRadius: 6, padding: "6px 10px", color: "#b03030", fontSize: 11, cursor: burst.status === 'Sent' ? "default" : "pointer", fontWeight: 600, fontFamily: "'DM Sans', sans-serif", opacity: burst.status === 'Sent' ? 0.3 : 1 }}>
                      Delete
                    </button>
                    <a href={`/Report?slug=${burst.report_slug}`} target="_blank" rel="noopener noreferrer"
                      style={{ background: "transparent", border: `1px solid #d0cdf0`, borderRadius: 6, padding: "6px 10px", color: C.text, fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", textDecoration: "none", display: "inline-block" }}>
                      View →
                    </a>
                  </div>
                </div>
              ))}

              {/* Add burst button */}
              {report.has_future_bursts && (
                <div key={report.id + "-add-burst"} style={{ marginLeft: 32 }}>
                  <Link
                    to={`/SubmitReport?parentReportId=${report.id}`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#ede9f8", border: "1px dashed #b0addf", borderRadius: 8, padding: "8px 16px", color: C.accent, fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif" }}
                  >
                    + Add Burst {(burstsByParent[report.id]?.length || 0) + 2}
                  </Link>
                </div>
              )}
              </React.Fragment>
            ))}
          </div>
        )}


      </div>

      {overrideReport && (
        <AnalysisOverrideModal
          report={overrideReport}
          onClose={() => setOverrideReport(null)}
          onSaved={(updated) => {
            setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
            setOverrideReport(null);
          }}
        />
      )}
    </div>
  );
}