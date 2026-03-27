import { useState, useEffect } from "react";
import { getReportBySlug } from "../api/backendFunctions";

const C = {
  bg: "#faf5ee",
  text: "#3b1320",
  muted: "#8a6070",
  border: "#e8ddd0",
  accent: "#8883d1",
  card: "#fff",
  secondary: "#f3ede3",
};

export default function Report() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const slug = new URLSearchParams(window.location.search).get("slug");
    if (!slug) {
      setError("No report slug provided");
      setLoading(false);
      return;
    }

    getReportBySlug({ slug })
      .then(res => {
        const report = res.data?.report || null;
        if (!report) throw new Error("Report not found");
        setReport(report);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || "Failed to load report");
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 48, height: 48, margin: "0 auto 20px", border: "3px solid " + C.border, borderTop: "3px solid " + C.text, borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
          <p style={{ color: C.muted }}>Loading report...</p>
          <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
        </div>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div style={{ minHeight: "100vh", background: C.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
        <div style={{ textAlign: "center", color: C.text }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10, fontFamily: "'Playfair Display', serif" }}>Report not found</h1>
          <p style={{ color: C.muted }}>{error}</p>
        </div>
      </div>
    );
  }

  const formatMetricLabel = (key) => {
    if (key === "comments_count") return "Comments";
    return key.replace(/_/g, " ").split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const PLACEMENT_METRICS = {
    "Reel":                ["total_views", "total_reach", "likes", "comments_count", "shares", "saves", "engagement_rate"],
    "Feed Post":           ["total_views", "total_reach", "likes", "comments_count", "shares", "saves", "engagement_rate"],
    "Story":               ["total_views", "total_reach", "shares", "comments_count", "link_clicks"],
    "TikTok Video":        ["total_views", "total_reach", "likes", "comments_count", "shares", "saves", "engagement_rate"],
    "YouTube Integration": ["total_views", "total_reach", "likes", "comments_count", "engagement_rate"],
    "YouTube Dedicated":   ["total_views", "total_reach", "likes", "comments_count", "engagement_rate"],
    "YouTube Short":       ["total_views", "total_reach", "likes", "comments_count", "engagement_rate"],
    "Snap":                ["total_views", "total_reach", "shares", "comments_count", "link_clicks", "story_taps_forward", "story_taps_back"],
  };

  const getMetricsForAsset = (asset) => {
    const allowedKeys = PLACEMENT_METRICS[asset.type] || Object.keys(asset.metrics || {});
    const isStory = asset.type === "Story" || asset.type === "Snap";
    return Object.entries(asset.metrics || {})
      .filter(([key, val]) => allowedKeys.includes(key) && val !== null && val !== undefined && val !== 0)
      .map(([key, val]) => ({
        key,
        label: (key === "comments_count" && isStory) ? "Replies" : formatMetricLabel(key),
        displayVal: typeof val === "number" ? (val % 1 !== 0 ? val.toFixed(2) : val.toLocaleString()) : "—",
        isRate: key.includes("rate"),
      }));
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.text, padding: "16px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <img src="https://media.base44.com/images/public/69b9ee2e21d1a8f05796536b/4bfaa5b98_GOODANSWERLONGLOGO3750x938px1.png" alt="Good Answer" style={{ height: 28, width: "auto" }} />
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)", margin: "0 4px" }} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Campaign Report</div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => window.print()}
          className="no-print"
          style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 6, padding: "7px 14px", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}
        >
          ↓ Download PDF
        </button>
      </div>
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          h1 { font-size: 20px !important; margin-bottom: 8px !important; }
          h2 { font-size: 14px !important; margin-bottom: 10px !important; }
          h3 { font-size: 12px !important; margin-bottom: 6px !important; }
          p { font-size: 12px !important; margin-bottom: 8px !important; }
          div { font-size: 12px !important; }
          [style*="padding: 28px"] { padding: 12px !important; }
          [style*="padding: 24px"] { padding: 12px !important; }
          [style*="padding: 20px"] { padding: 10px !important; }
          [style*="padding: 16px"] { padding: 8px !important; }
          [style*="gap: 20"] { gap: 10px !important; }
          [style*="gap: 16"] { gap: 8px !important; }
          [style*="gap: 12"] { gap: 6px !important; }
          [style*="marginBottom: 32"] { margin-bottom: 12px !important; }
          [style*="marginBottom: 28"] { margin-bottom: 10px !important; }
          [style*="marginBottom: 20"] { margin-bottom: 8px !important; }
          [style*="margin: 44px"] { margin: 20px auto !important; padding: 12px 12px !important; }
        }
      `}</style>

      <div style={{ maxWidth: 900, margin: "0 auto", padding: "44px 24px" }}>
        {/* Campaign Header */}
        <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: 28, marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 4, fontFamily: "'Playfair Display', serif", color: C.text }}>
                {report.campaign_name}
              </h1>
              <p style={{ fontSize: 14, color: C.muted, marginBottom: 12 }}>
                {report.brand_name} · {report.creator_name}
              </p>
              {report.xero_quote_ref && (
                <p style={{ fontSize: 12, color: C.muted }}>{report.xero_quote_ref}</p>
              )}
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 12, color: C.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Status</div>
              <div style={{ fontSize: 16, fontWeight: 600, color: report.status === "Approved" ? "#3a8a4a" : "#dd7d4f" }}>
                {report.status}
              </div>
            </div>
          </div>

          {/* Platforms & Placements */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            {(report.platforms || []).map(tag => (
              <span key={tag} style={{ background: C.text, color: "#faf5ee", borderRadius: 4, padding: "3px 10px", fontSize: 11, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", letterSpacing: 0.3 }}>
                {tag}
              </span>
            ))}
            {(report.platforms || []).length > 0 && (report.placement_types || []).length > 0 && (
              <span style={{ color: C.border, fontSize: 14, margin: "0 2px" }}>·</span>
            )}
            {(report.placement_types || []).map(tag => (
              <span key={tag} style={{ background: "#ede9f8", border: "1px solid #d0cdf0", color: C.accent, borderRadius: 4, padding: "3px 10px", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Metrics by Deliverable */}
        {(() => {
          let assets = [];
          if (report?.asset_metrics_json) {
            try { assets = JSON.parse(report.asset_metrics_json); } catch (e) {}
          }
          if (assets.length === 0 && report?.asset_metrics?.length > 0) {
            assets = report.asset_metrics;
          }
          if (assets.length === 0) return null;
          return (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, fontFamily: "'Playfair Display', serif" }}>Performance by Deliverable</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {assets.map((asset, idx) => {
                  const metrics = getMetricsForAsset(asset);
                  const contentLink = (report.content_links || [])[idx];
                  const assetLabel = asset.label || contentLink?.label || (asset.platform && asset.type ? asset.platform + " / " + asset.type : asset.type || "Deliverable " + (idx + 1));
                  return (
                    <div key={idx} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: 20 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: C.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                          {assetLabel}
                        </div>
                        {contentLink?.url && (
                          <a href={contentLink.url} target="_blank" rel="noopener noreferrer"
                            style={{ color: C.accent, textDecoration: "none", fontSize: 12, fontWeight: 600, flexShrink: 0, marginLeft: 12 }}>
                            View Post →
                          </a>
                        )}
                      </div>
                      {metrics.length > 0 ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                          {metrics.map(metric => (
                            <div key={metric.key} style={{ background: C.secondary, borderRadius: 8, padding: "12px 10px", textAlign: "center" }}>
                              <div style={{ fontSize: 11, color: C.muted, marginBottom: 5, fontWeight: 500 }}>{metric.label}</div>
                              <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>
                                {metric.displayVal}{metric.isRate ? "%" : ""}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: C.muted }}>No metrics extracted for this deliverable</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Summary Metrics */}
        {(() => {
          const totalEngagements = ["likes", "comments_count", "shares", "saves"]
            .reduce((sum, k) => sum + (report[k] || 0), 0);

          const calculatedEngagementRate = report.total_views && report.total_views > 0
            ? Math.round((totalEngagements / report.total_views) * 10000) / 100
            : null;

          const summaryMetrics = [
            { label: "Total Views", value: report.total_views },
            { label: "Total Reach", value: report.total_reach },
            { label: "Total Engagements", value: totalEngagements || null },
            { label: "Engagement Rate", value: calculatedEngagementRate, isRate: true },
          ].filter(m => m.value !== null && m.value !== undefined);

          if (summaryMetrics.length === 0) return null;
          return (
            <div style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 16, fontFamily: "'Playfair Display', serif" }}>Summary</h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12 }}>
                {summaryMetrics.map(metric => (
                  <div key={metric.label} style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: 16, textAlign: "center" }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 6, fontWeight: 500 }}>{metric.label}</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: C.text }}>
                      {typeof metric.value === "number"
                        ? (metric.value % 1 !== 0 ? metric.value.toFixed(2) : metric.value.toLocaleString())
                        : "—"}{metric.isRate ? "%" : ""}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Supporting Files */}
        {report.uploaded_file_urls && report.uploaded_file_urls.length > 0 && (
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 10, padding: 16, marginBottom: 32 }}>
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/api/functions/downloadFilesAsZip", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ reportId: report.id }),
                  });
                  if (!res.ok) throw new Error("Download failed");
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = "report-files.zip";
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                } catch (err) {
                  alert("Failed to download files: " + err.message);
                }
              }}
              style={{ background: "none", border: "none", color: C.accent, fontSize: 14, fontWeight: 600, cursor: "pointer", padding: 0, fontFamily: "'DM Sans', sans-serif", textAlign: "left" }}
            >
              📄 Download Supporting Files ({report.uploaded_file_urls.length}) →
            </button>
          </div>
        )}

        {/* AI Analysis */}
        {(report.vibe_analysis || report.extension_pitch) && (
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: 24 }}>
            {report.vibe_analysis && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>Vibe Analysis</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{report.vibe_analysis}</p>
              </div>
            )}
            {report.extension_pitch && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>Extension Pitch</h3>
                <p style={{ fontSize: 14, color: C.muted, lineHeight: 1.6 }}>{report.extension_pitch}</p>
              </div>
            )}
          </div>
        )}

        {/* Top Comments */}
        {report.top_comments && (
          <div style={{ background: C.card, border: "1px solid " + C.border, borderRadius: 12, padding: 24, marginTop: 24 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: C.text, marginBottom: 12, marginTop: 0, fontFamily: "'Playfair Display', serif" }}>Top Comments</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {report.top_comments.split("\n").filter(l => l.trim()).map((line, i) => (
                <div key={i} style={{ fontSize: 14, color: C.muted, lineHeight: 1.5, paddingLeft: 12, borderLeft: "2px solid " + C.border }}>
                  {line.trim()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PAGE BREAK */}
        <div style={{ borderTop: "1px solid " + C.border, margin: "24px 0" }} />
      </div>

      {/* AGENCY UPSELL SECTION */}
      <div className="no-print" style={{ background: C.bg, color: C.text, padding: "0 24px 60px" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 36, fontWeight: 700, marginBottom: 20, fontFamily: "'Playfair Display', serif", color: C.text }}>About Good Answer</h2>
            <div>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: C.muted, marginBottom: 24 }}>
                We've spent 15+ years in the trenches, cracking the code on content, growth, and strategy. From viral edits to sharp negotiations, we know what works.
              </p>
              <p style={{ fontSize: 16, lineHeight: 1.7, color: C.muted, marginBottom: 24 }}>
                We play the long game, choosing collaborations wisely to keep our roster booked, busy, and built to last. With rock-solid processes and a results-driven mindset, we hit KPIs, meet deadlines, and set the standard for professionalism.
              </p>
              <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
                <a href="https://www.instagram.com/goodanswer.agency" target="_blank" rel="noopener noreferrer"
                  style={{ background: C.text, border: "none", borderRadius: 20, padding: "10px 20px", color: "#faf5ee", fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                  See our work →
                </a>
                <a href="https://www.goodanswer.com.au/roster" target="_blank" rel="noopener noreferrer"
                  style={{ background: "transparent", border: "1.5px solid " + C.text, borderRadius: 20, padding: "10px 20px", color: C.text, fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: "'DM Sans', sans-serif", cursor: "pointer" }}>
                  Talent Roster →
                </a>
              </div>
            </div>
          </div>

          {/* Latest Work Section */}
          {(() => {
            const rawVideos = report.portfolio_videos?.length
              ? report.portfolio_videos
              : (report.portfolio_video_urls || []).map(url => ({ url, handle: "" }));

            const portfolioVideos = rawVideos.filter(v => v?.url);
            if (portfolioVideos.length === 0) return null;

            const getPlatform = (url) => {
              if (url.includes("tiktok.com")) return "TikTok";
              if (url.includes("instagram.com")) return "Instagram";
              return "Video";
            };

            const getHandle = (entry) => {
              if (entry.handle) return entry.handle.startsWith("@") ? entry.handle : "@" + entry.handle;
              const tiktokMatch = entry.url?.match(/tiktok\.com\/@([a-zA-Z0-9_.]+)/);
              if (tiktokMatch) return "@" + tiktokMatch[1];
              return null;
            };

            const getEmbedUrl = (url) => {
              if (url.includes("instagram.com")) {
                const match = url.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
                if (match) return "https://www.instagram.com/p/" + match[1] + "/embed/";
              }
              if (url.includes("tiktok.com")) {
                const match = url.match(/video\/(\d+)/);
                if (match) return "https://www.tiktok.com/embed/v2/" + match[1];
              }
              return null;
            };

            return (
              <div>
                <h3 style={{ fontSize: 22, fontWeight: 600, marginBottom: 20, fontFamily: "'Playfair Display', serif", color: C.text }}>Who's Next?</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
                  {portfolioVideos.slice(0, 3).map((entry, idx) => {
                    const handle = getHandle(entry);
                    const embedUrl = getEmbedUrl(entry.url);
                    return (
                      <div key={idx} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                        {embedUrl ? (
                          <div style={{ borderRadius: 16, overflow: "hidden", background: "#000" }}>
                            <iframe
                              src={embedUrl}
                              style={{ width: "100%", aspectRatio: "9/16", border: "none", display: "block" }}
                              scrolling="no"
                              allowFullScreen
                              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                            />
                          </div>
                        ) : (
                          <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                            <div style={{ background: C.text, borderRadius: 16, aspectRatio: "9/16", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                              <div style={{ fontSize: 32, marginBottom: 8 }}>▶</div>
                              <div style={{ color: "#faf5ee", fontSize: 13, fontWeight: 600 }}>{getPlatform(entry.url)}</div>
                            </div>
                          </a>
                        )}
                        {handle && <p style={{ fontSize: 12, fontWeight: 600, color: C.text, textTransform: "uppercase", letterSpacing: 0.5, margin: 0 }}>{handle}</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Thank You Section */}
      <div style={{ minHeight: "auto", background: C.text, color: "#faf5ee", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center" }}>
        <div>
          <h2 style={{ fontSize: 42, fontWeight: 700, marginBottom: 20, fontFamily: "'Playfair Display', serif" }}>Thank you</h2>
          <p style={{ fontSize: 18, marginBottom: 24, color: "rgba(255,255,255,0.9)" }}>We can't wait to work with you again soon!</p>
          <a href="https://www.goodanswer.com.au" target="_blank" rel="noopener noreferrer" style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 40, display: "block", textDecoration: "none" }}>goodanswer.com.au</a>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", maxWidth: 400, margin: "0 auto" }}>
            Confidential: Intended for the recipient only. Do not share, copy, or distribute without explicit permission.
          </p>
        </div>
      </div>
    </div>
  );
}