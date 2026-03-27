import { useState, useEffect } from "react";
import { base44 } from "../api/base44Client";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Link } from "react-router-dom";

const C = {
  bg: "#faf5ee",
  text: "#3b1320",
  muted: "#8a6070",
  border: "#e8ddd0",
  accent: "#8883d1",
  card: "#fff",
};

const PLATFORMS = ["Instagram", "TikTok", "YouTube", "Facebook", "Snapchat"];
const PLACEMENT_TYPES = ["Feed Post", "Reel", "Story", "TikTok Video", "YouTube Integration", "YouTube Dedicated", "YouTube Short", "Snap"];

const emptyDeliverable = () => ({
  id: Date.now(),
  name: "",
  platforms: [],
  placement_types: [],
  post_urls: [],
  uploadedFiles: [],
  uploadedFileUrls: [],
  uploading: false,
});

export default function SubmitReport() {
  useEffect(() => {
    base44.auth.isAuthenticated().then(auth => {
      if (!auth) base44.auth.redirectToLogin(window.location.href);
    });
  }, []);

  const reportIdFromUrl = new URLSearchParams(window.location.search).get("reportId");
  const parentReportIdFromUrl = new URLSearchParams(window.location.search).get("parentReportId");
  const [existingReport, setExistingReport] = useState(null);
  const [parentReport, setParentReport] = useState(null);
  const [loadingReport, setLoadingReport] = useState(!!(reportIdFromUrl || parentReportIdFromUrl));

  const [campaign, setCampaign] = useState({
    campaign_title: "", campaign_name: "", brand_name: "", creator_name: "",
    xero_quote_ref: "", bonus_posts_noted: "", is_paid: true, has_future_bursts: false,
  });

  const parseCampaignTitle = (title) => {
    const xParts = title.split(/\s+[xX]\s+/);
    const creator_name = xParts[0]?.trim() || "";
    const rest = xParts[1] || "";
    const pipeParts = rest.split("|");
    const brand_name = pipeParts[0]?.trim() || "";
    return { campaign_name: title.trim(), creator_name, brand_name };
  };

  const [deliverables, setDeliverables] = useState([emptyDeliverable()]);
  const [currentDeliverable, setCurrentDeliverable] = useState(0);
  const [globalStep, setGlobalStep] = useState("campaign");
  const [deliverableStep, setDeliverableStep] = useState("details");
  const [error, setError] = useState(null);
  const [reportSlug, setReportSlug] = useState(null);
  const [extractionNotes, setExtractionNotes] = useState("");
  const [includePortfolio, setIncludePortfolio] = useState(false);
  const [portfolioVideos, setPortfolioVideos] = useState([{ url: "", handle: "" }, { url: "", handle: "" }, { url: "", handle: "" }]);

  useEffect(() => {
    if (parentReportIdFromUrl) {
      base44.entities.CampaignReport.get(parentReportIdFromUrl).then(parent => {
        if (!parent) throw new Error("Parent report not found");
        setParentReport(parent);
        // Count existing bursts to determine burst number
        base44.entities.CampaignReport.filter({ parent_report_id: parentReportIdFromUrl }).then(siblings => {
          const nextBurst = (siblings?.length || 0) + 2;
          setCampaign(p => ({
            ...p,
            campaign_title: parent.campaign_name,
            campaign_name: parent.campaign_name,
            brand_name: parent.brand_name,
            creator_name: parent.creator_name,
            xero_quote_ref: parent.xero_quote_ref || "",
            is_paid: parent.is_paid !== false,
            burst_number: nextBurst,
            parent_report_id: parentReportIdFromUrl,
          }));
          if (parent.portfolio_videos?.length > 0) {
            setIncludePortfolio(true);
            const loaded = parent.portfolio_videos.map(v => typeof v === 'object' ? v : { url: v, handle: "" });
            setPortfolioVideos([...loaded, ...Array(Math.max(0, 3 - loaded.length)).fill({ url: "", handle: "" })]);
          }
          setLoadingReport(false);
        });
      }).catch(err => {
        setError("Failed to load parent report: " + err.message);
        setLoadingReport(false);
      });
    }

    if (reportIdFromUrl) {
      base44.entities.CampaignReport.get(reportIdFromUrl).then(report => {
        if (!report) { setLoadingReport(false); return; }
        setExistingReport(report);
        if (report.status === 'Sent') { setGlobalStep("locked"); setLoadingReport(false); return; }
        setCampaign(p => ({
          ...p,
          campaign_title: report.campaign_name,
          campaign_name: report.campaign_name,
          brand_name: report.brand_name,
          creator_name: report.creator_name,
          xero_quote_ref: report.xero_quote_ref || "",
          bonus_posts_noted: report.bonus_posts_noted || "",
          is_paid: report.is_paid !== false,
          has_future_bursts: report.has_future_bursts || false,
          parent_report_id: report.parent_report_id || null,
          burst_number: report.burst_number || 1,
        }));
        let assets = report.asset_metrics || [];
        if (assets.length === 0 && report.asset_metrics_json) {
          try { assets = JSON.parse(report.asset_metrics_json); } catch (e) {}
        }
        if (assets.length > 0) {
          const loaded = assets.map((a, i) => ({
            id: Date.now() + i,
            name: a.label || "",
            platforms: a.platform ? [a.platform] : [],
            placement_types: a.type ? [a.type] : [],
            post_urls: [(report.content_links || [])[i]?.url || ""],
            uploadedFiles: [],
            uploadedFileUrls: [],
            uploading: false,
          }));
          setDeliverables(loaded);
        }
        if (report.portfolio_videos?.length > 0) {
          setIncludePortfolio(true);
          const vids = report.portfolio_videos.map(v => typeof v === 'object' ? v : { url: v, handle: "" });
          setPortfolioVideos([...vids, ...Array(Math.max(0, 3 - vids.length)).fill({ url: "", handle: "" })]);
        }
        setLoadingReport(false);
      }).catch(err => {
        setError("Failed to load report: " + err.message);
        setLoadingReport(false);
      });
    }
  }, []);

  const d = deliverables[currentDeliverable];

  const updateDeliverable = (patch) => {
    setDeliverables(prev => prev.map((item, i) => i === currentDeliverable ? { ...item, ...patch } : item));
  };

  const handleAddDeliverable = () => {
    setDeliverables(prev => [...prev, emptyDeliverable()]);
    setCurrentDeliverable(deliverables.length);
    setDeliverableStep("details");
    setError(null);
  };

  const handleFinalSubmit = async () => {
    setGlobalStep("processing");
    setError(null);

    try {
      const allPlatforms = [...new Set(deliverables.flatMap(d => d.platforms))];
      const allPlacements = [...new Set(deliverables.flatMap(d => d.placement_types))];
      const allUploadedUrls = deliverables.flatMap(d => d.uploadedFileUrls || []);
      const hasFiles = allUploadedUrls.length > 0;

      // One content link per deliverable (1:1 with asset_metrics) - avoids index mismatch
      const allContentLinks = deliverables.map((d) => ({
        platform: d.platforms[0] || "",
        url: d.post_urls.find(u => u) || "",
        label: d.name || d.platforms[0] || "",
      }));

      const campaignData = {
        campaign_name: campaign.campaign_name,
        brand_name: campaign.brand_name,
        creator_name: campaign.creator_name,
        is_paid: campaign.is_paid,
        has_future_bursts: campaign.has_future_bursts || false,
        xero_quote_ref: campaign.xero_quote_ref,
        bonus_posts_noted: campaign.bonus_posts_noted,
        ...(campaign.parent_report_id ? { parent_report_id: campaign.parent_report_id, burst_number: campaign.burst_number } : { burst_number: 1 }),
        platforms: allPlatforms,
        platform: allPlatforms[0] || "",
        placement_types: allPlacements,
        placement_type: allPlacements[0] || "",
        content_links: allContentLinks,
        content_link: allContentLinks[0]?.url || "",
        uploaded_file_urls: allUploadedUrls,
      };

      if (includePortfolio) {
        const filtered = portfolioVideos.filter(v => v.url);
        if (filtered.length > 0) {
          campaignData.portfolio_videos = filtered;
        }
      }

      let reportId;

      if (existingReport) {
        await base44.entities.CampaignReport.update(existingReport.id, campaignData);
        reportId = existingReport.id;
        setReportSlug(existingReport.report_slug);
      } else {
        const slug = `${campaign.campaign_name}-${campaign.creator_name}-${Date.now()}`
          .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
        
        const newReport = await base44.entities.CampaignReport.create({
          ...campaignData,
          report_slug: slug,
          status: hasFiles ? "Processing" : "Needs Review",
        });
        reportId = newReport.id;
        setReportSlug(slug);
      }

      if (hasFiles) {
        const { extractReportData } = await import("../api/backendFunctions");
        extractReportData({
          reportId,
          deliverables: deliverables.map((d) => ({
            name: d.name,
            platforms: d.platforms,
            placement_types: d.placement_types,
            uploadedFileUrls: d.uploadedFileUrls || [],
            post_url: d.post_urls.find(u => u) || "",
          })),
          postUrl: deliverables[0]?.post_urls?.find(u => u) || "",
          platforms: allPlatforms,
          portfolioVideos: includePortfolio ? portfolioVideos : [],
        }).catch(() => {});
      }

      setGlobalStep("done");
    } catch (err) {
      console.error(err);
      setError(err?.message || err?.response?.data?.message || "Something went wrong. Please try again.");
      setGlobalStep("review");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.text, padding: "16px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <img src="https://media.base44.com/images/public/69b9ee2e21d1a8f05796536b/4bfaa5b98_GOODANSWERLONGLOGO3750x938px1.png" alt="Good Answer" style={{ height: 28, width: "auto" }} />
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)", margin: "0 4px" }} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Campaign Report Submission</div>
        {globalStep === "deliverable" && (
          <div style={{ marginLeft: "auto", fontSize: 12, color: "#444" }}>
            Deliverable {currentDeliverable + 1} of {deliverables.length}
          </div>
        )}
      </div>

      <div style={{ maxWidth: 580, margin: "0 auto", padding: "44px 24px" }}>

        {loadingReport && (
          <div style={{ textAlign: "center", padding: "72px 0" }}>
            <div style={{ width: 48, height: 48, margin: "0 auto 28px", border: `3px solid ${C.border}`, borderTop: `3px solid ${C.text}`, borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
            <p style={{ color: C.muted }}>Loading report...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {!loadingReport && (
          <>
        {/* STEP: LOCKED */}
        {globalStep === "locked" && (
          <div style={{ textAlign: "center", padding: "72px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 20 }}>🔒</div>
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, fontFamily: "'Playfair Display', serif", color: C.text }}>Report Locked</h2>
            <p style={{ color: C.muted, fontSize: 14 }}>This report has been marked as <strong>Sent</strong> and cannot be edited.</p>
          </div>
        )}

        {/* STEP: CAMPAIGN */}
        {globalStep === "campaign" && (
          <form onSubmit={(e) => {
            e.preventDefault();
            if (!campaign.campaign_title || !campaign.brand_name || !campaign.creator_name) {
              setError("Please enter a campaign name in the correct format.");
              return;
            }
            setError(null);
            setGlobalStep("deliverable");
          }}>
            <h1 style={h1}>Campaign Details</h1>
            <p style={sub}>Start with the basics — you'll add each deliverable next.</p>
            {error && <Err>{error}</Err>}
            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <label style={labelStyle}>Campaign Name *</label>
                <input
                  value={campaign.campaign_title}
                  onChange={e => {
                    const parsed = parseCampaignTitle(e.target.value);
                    setCampaign(p => ({ ...p, campaign_title: e.target.value, ...parsed }));
                  }}
                  placeholder="e.g. Jessica Smith X Bondi Sands | Summer 2026"
                  style={inputStyle}
                />
                <div style={{ fontSize: 11, color: "#444", marginTop: 4 }}>Format: Talent Name X Brand Name | Campaign or Timing Detail</div>
                {campaign.creator_name && campaign.brand_name && (
                  <div style={{ fontSize: 12, color: "#555", marginTop: 6, display: "flex", gap: 12 }}>
                    <span>👤 {campaign.creator_name}</span>
                    <span>🏷️ {campaign.brand_name}</span>
                  </div>
                )}
              </div>
              {/* Paid / Organic toggle */}
              <div>
                <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={campaign.is_paid}
                    onChange={e => setCampaign(p => ({ ...p, is_paid: e.target.checked }))}
                    style={{ width: 18, height: 18, cursor: "pointer", accentColor: C.accent }}
                  />
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Paid campaign</span>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Uncheck if this is an organic / gifted collaboration</div>
                  </div>
                </label>
              </div>
              {/* Future bursts */}
              {!campaign.parent_report_id && (
                <div>
                  <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={campaign.has_future_bursts}
                      onChange={e => setCampaign(p => ({ ...p, has_future_bursts: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: "pointer", accentColor: C.accent }}
                    />
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>More bursts coming</span>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Check if there will be additional content rounds for this campaign</div>
                    </div>
                  </label>
                </div>
              )}
              {campaign.parent_report_id && (
                <div style={{ background: "#ede9f8", border: "1px solid #d0cdf0", borderRadius: 8, padding: "10px 14px", fontSize: 13, color: C.accent }}>
                  🔁 Burst {campaign.burst_number} — linked to <strong>{parentReport?.campaign_name}</strong>
                </div>
              )}
              <Field label="Xero Quote / Invoice Ref" value={campaign.xero_quote_ref}
                onChange={v => setCampaign(p => ({ ...p, xero_quote_ref: v }))}
                placeholder="e.g. INV-0042" hint="Used to cross-check deliverables before report is approved" />
              <div>
                <label style={labelStyle}>Bonus Posts / Team Notes</label>
                <textarea value={campaign.bonus_posts_noted}
                  onChange={e => setCampaign(p => ({ ...p, bonus_posts_noted: e.target.value }))}
                  placeholder="e.g. Creator added an extra story not in original quote..."
                  rows={2} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
              </div>
            </div>
            <button type="submit" style={primaryBtn}>Add Deliverables →</button>
          </form>
        )}

        {/* STEP: DELIVERABLE */}
        {globalStep === "deliverable" && (
          <div>
            {deliverables.length > 1 && (
              <div style={{ display: "flex", gap: 6, marginBottom: 28, flexWrap: "wrap", alignItems: "center" }}>
                {deliverables.map((del, i) => (
                  <button key={del.id} onClick={() => { setCurrentDeliverable(i); setDeliverableStep("details"); }}
                    style={{ background: i === currentDeliverable ? "#1e1b4b" : "#141414", border: `1px solid ${i === currentDeliverable ? "#6366f1" : "#222"}`, borderRadius: 20, padding: "5px 14px", color: i === currentDeliverable ? "#a5b4fc" : "#555", fontSize: 12, cursor: "pointer" }}>
                    {del.name || `Deliverable ${i + 1}`}
                  </button>
                ))}
              </div>
            )}

            {deliverableStep === "details" && (
              <div>
                <h1 style={h1}>Deliverable {currentDeliverable + 1}</h1>
                <p style={sub}>What did the creator post?</p>
                {error && <Err>{error}</Err>}
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  <Field label="Deliverable Name" value={d.name}
                    onChange={v => updateDeliverable({ name: v })}
                    placeholder="e.g. Instagram Reel, TikTok Hero Video, Story Series" hint="A label to identify this deliverable in the report" />
                  <div>
                    <label style={labelStyle}>Platform(s) * <Muted>select all that apply</Muted></label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {PLATFORMS.map(p => (
                        <Chip key={p} label={p} selected={d.platforms.includes(p)} onClick={() => {
                          const newPlatforms = d.platforms.includes(p) ? d.platforms.filter(v => v !== p) : [...d.platforms, p];
                          const newUrls = newPlatforms.map((_, i) => typeof d.post_urls[i] === 'string' ? d.post_urls[i] : "");
                          updateDeliverable({ platforms: newPlatforms, post_urls: newUrls });
                        }} />
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Placement Type *</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {PLACEMENT_TYPES.map(p => (
                        <button key={p} type="button" onClick={() => updateDeliverable({ placement_types: [p] })}
                          style={{ background: d.placement_types[0] === p ? "#ede9f8" : C.card, border: `1.5px solid ${d.placement_types[0] === p ? C.accent : C.border}`, borderRadius: 6, padding: "7px 14px", color: d.placement_types[0] === p ? C.accent : C.muted, fontSize: 13, cursor: "pointer", fontWeight: d.placement_types[0] === p ? 600 : 400, fontFamily: "'DM Sans', sans-serif" }}>
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Post URLs <Muted>one per platform</Muted></label>
                    {d.platforms.map((platform, idx) => (
                       <input
                         key={platform}
                         type="text"
                         value={typeof d.post_urls[idx] === 'string' ? d.post_urls[idx] : ""}
                         onChange={e => {
                           const newUrls = [...d.post_urls];
                           newUrls[idx] = e.target.value;
                           updateDeliverable({ post_urls: newUrls });
                         }}
                         placeholder={`https://www.${platform.toLowerCase()}.com/...`}
                         style={{ ...inputStyle, marginBottom: 8 }}
                       />
                     ))}
                    {d.platforms.length === 0 && (
                      <div style={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>Select platforms first to add URLs</div>
                    )}
                  </div>
                </div>
                <button type="button" onClick={() => {
                  if (d.platforms.length === 0) { setError("Select at least one platform."); return; }
                  if (d.placement_types.length === 0) { setError("Select a placement type."); return; }
                  setError(null);
                  setDeliverableStep("upload");
                }} style={primaryBtn}>Upload Data →</button>
              </div>
            )}

            {deliverableStep === "upload" && (
              <div>
                <h1 style={h1}>Upload Data</h1>
                <p style={sub}>Upload stats screenshots, Foam reports, or any data files for this {[...d.platforms, ...d.placement_types].join(" / ") || "deliverable"}. The AI will read all of them to extract metrics.</p>
                {error && <Err>{error}</Err>}

                {/* Drop zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={async (e) => {
                    e.preventDefault();
                    const incoming = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith("image/") || f.type === "application/pdf");
                    if (incoming.length === 0) return;
                    updateDeliverable({ uploading: true, uploadError: null });
                    try {
                      const results = await Promise.all(incoming.map(file => base44.integrations.Core.UploadFile({ file })));
                      const newUrls = results.map(r => r.file_url);
                      updateDeliverable({
                        uploadedFiles: [...(d.uploadedFiles || []), ...incoming],
                        uploadedFileUrls: [...(d.uploadedFileUrls || []), ...newUrls],
                        uploading: false,
                      });
                    } catch (err) {
                      updateDeliverable({ uploading: false, uploadError: "Upload failed: " + err.message });
                    }
                  }}
                  onClick={() => !d.uploading && document.getElementById(`upload-input-${currentDeliverable}`).click()}
                  style={{ border: `2px dashed ${C.border}`, borderRadius: 14, padding: "36px 20px", textAlign: "center", cursor: d.uploading ? "default" : "pointer", background: C.card, marginBottom: 16 }}
                >
                  <input
                    id={`upload-input-${currentDeliverable}`}
                    type="file"
                    accept="image/*,application/pdf"
                    multiple
                    style={{ display: "none" }}
                    onChange={async (e) => {
                      const incoming = Array.from(e.target.files);
                      if (incoming.length === 0) return;
                      updateDeliverable({ uploading: true, uploadError: null });
                      e.target.value = "";
                      try {
                        const results = await Promise.all(incoming.map(file => base44.integrations.Core.UploadFile({ file })));
                        const newUrls = results.map(r => r.file_url);
                        updateDeliverable({
                          uploadedFiles: [...(d.uploadedFiles || []), ...incoming],
                          uploadedFileUrls: [...(d.uploadedFileUrls || []), ...newUrls],
                          uploading: false,
                        });
                      } catch (err) {
                        updateDeliverable({ uploading: false, uploadError: "Upload failed: " + err.message });
                      }
                    }}
                  />
                  {d.uploading ? (
                    <div>
                      <div style={{ width: 32, height: 32, margin: "0 auto 12px", border: `3px solid ${C.border}`, borderTop: `3px solid ${C.text}`, borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
                      <div style={{ color: C.muted, fontSize: 14 }}>Uploading {d.uploadedFiles?.length > 0 ? `(${d.uploadedFiles.length} done so far)` : ""}...</div>
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: 32, marginBottom: 10 }}>📂</div>
                      <div style={{ color: C.muted, fontSize: 14 }}>Click or drag & drop files here</div>
                      <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Screenshots, Foam reports — JPG, PNG, PDF accepted</div>
                    </div>
                  )}
                </div>

                {d.uploadError && <Err>{d.uploadError}</Err>}

                {/* Uploaded files list */}
                {(d.uploadedFiles || []).length > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 13, color: "#3a8a4a", marginBottom: 8 }}>✓ {d.uploadedFiles.length} file{d.uploadedFiles.length !== 1 ? "s" : ""} uploaded</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {d.uploadedFiles.map((f, idx) => (
                        <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#f0f8f0", border: "1px solid #b8ddb8", borderRadius: 8, padding: "8px 12px" }}>
                          <span style={{ fontSize: 13, color: C.text }}>{f.name}</span>
                          <button type="button" onClick={() => {
                            updateDeliverable({
                              uploadedFiles: d.uploadedFiles.filter((_, i) => i !== idx),
                              uploadedFileUrls: d.uploadedFileUrls.filter((_, i) => i !== idx),
                            });
                          }} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 16, lineHeight: 1 }}>✕</button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
                  <button onClick={() => setDeliverableStep("details")} style={secondaryBtn} disabled={d.uploading}>← Back</button>
                  <button onClick={() => setDeliverableStep("confirm")} style={{ ...primaryBtn, marginTop: 0, flex: 2 }} disabled={d.uploading}>
                    {d.uploading ? "Uploading..." : "Done with this deliverable →"}
                  </button>
                </div>
              </div>
            )}

            {deliverableStep === "confirm" && (
              <div>
                <h1 style={h1}>{d.name || `Deliverable ${currentDeliverable + 1}`} saved ✓</h1>
                <p style={{ ...sub, marginBottom: 24 }}>What would you like to do next?</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <button onClick={handleAddDeliverable}
                    style={{ background: C.card, border: `1.5px solid ${C.accent}`, borderRadius: 8, padding: "14px", color: C.accent, fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                    ＋ Add another deliverable
                  </button>
                  <button onClick={() => setGlobalStep("portfolio")} style={{ ...primaryBtn, marginTop: 0 }}>
                    All deliverables added — Next →
                  </button>
                  <button onClick={() => setDeliverableStep("upload")}
                    style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 13, paddingTop: 4 }}>
                    ← Edit uploaded files
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP: PORTFOLIO */}
        {globalStep === "portfolio" && (
          <div>
            <h1 style={h1}>Include Portfolio Videos?</h1>
            <p style={sub}>Optionally add Instagram or TikTok links to showcase the creator's latest work at the end of the report.</p>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 28 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={includePortfolio}
                  onChange={(e) => setIncludePortfolio(e.target.checked)}
                  style={{ width: 20, height: 20, cursor: "pointer" }}
                />
                <span style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Yes, add portfolio videos to this report</span>
              </label>
            </div>

            {includePortfolio && (
              <div style={{ marginBottom: 28 }}>
                <label style={labelStyle}>Portfolio Videos</label>
                <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>Add up to 3 Instagram or TikTok links with the creator's handle</p>
                {[0, 1, 2].map((idx) => (
                  <div key={idx} style={{ marginBottom: 16, background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 600 }}>Video {idx + 1}</div>
                    <input
                      type="text"
                      value={portfolioVideos[idx]?.url || ""}
                      onChange={(e) => {
                        const newVideos = [...portfolioVideos];
                        newVideos[idx] = { ...newVideos[idx], url: e.target.value };
                        setPortfolioVideos(newVideos);
                      }}
                      placeholder="https://www.instagram.com/reel/... or https://www.tiktok.com/@.../video/..."
                      style={{ ...inputStyle, marginBottom: 8 }}
                    />
                    <input
                      type="text"
                      value={portfolioVideos[idx]?.handle || ""}
                      onChange={(e) => {
                        const newVideos = [...portfolioVideos];
                        newVideos[idx] = { ...newVideos[idx], handle: e.target.value };
                        setPortfolioVideos(newVideos);
                      }}
                      placeholder="Creator handle, e.g. @clairemurfet"
                      style={inputStyle}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setGlobalStep("review")} style={secondaryBtn}>← Back</button>
              <button onClick={() => setGlobalStep("review")} style={{ ...primaryBtn, marginTop: 0, flex: 2 }}>
                Continue to Review →
              </button>
            </div>
          </div>
        )}

        {/* STEP: REVIEW */}
        {globalStep === "review" && (
          <div>
            <h1 style={h1}>Review & Submit</h1>
            <p style={sub}>Check everything looks right before generating the report.</p>
            {error && <Err>{error}</Err>}
            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: C.muted, marginBottom: 10, textTransform: "uppercase", letterSpacing: 1 }}>Campaign</div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4, fontFamily: "'Playfair Display', serif" }}>{campaign.campaign_name}</div>
              <div style={{ fontSize: 14, color: C.muted }}>{campaign.brand_name} · {campaign.creator_name}</div>
              {campaign.xero_quote_ref && <div style={{ fontSize: 13, color: C.muted, marginTop: 6 }}>Xero: {campaign.xero_quote_ref}</div>}
              {campaign.bonus_posts_noted && <div style={{ fontSize: 13, color: "#dd7d4f", marginTop: 6 }}>⚠️ {campaign.bonus_posts_noted}</div>}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Deliverables — drag to reorder</div>
            <DragDropContext onDragEnd={(result) => {
              if (!result.destination) return;
              const reordered = Array.from(deliverables);
              const [removed] = reordered.splice(result.source.index, 1);
              reordered.splice(result.destination.index, 0, removed);
              setDeliverables(reordered);
            }}>
              <Droppable droppableId="deliverables">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
                    {deliverables.map((del, i) => (
                      <Draggable key={del.id} draggableId={String(del.id)} index={i}>
                        {(provided) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, display: "flex", alignItems: "center", justifyContent: "space-between", ...provided.draggableProps.style }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <span {...provided.dragHandleProps} style={{ cursor: "grab", color: C.muted, fontSize: 16, userSelect: "none" }}>⠿</span>
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{del.name || `Deliverable ${i + 1}`}</div>
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                                  {[...del.platforms, ...del.placement_types].map(t => <Tag key={t}>{t}</Tag>)}
                                </div>
                              </div>
                            </div>
                            <div style={{ fontSize: 12, color: C.muted, textAlign: "right" }}>
                              {(del.uploadedFiles || []).length > 0
                                ? <div style={{ color: "#3a8a4a" }}>✓ {del.uploadedFiles.length} file{del.uploadedFiles.length !== 1 ? "s" : ""}</div>
                                : <div>No files</div>}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {includePortfolio && portfolioVideos.filter(v => v.url).length > 0 && (
              <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 28 }}>
                <div style={{ fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>Portfolio Videos</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {portfolioVideos.filter(v => v.url).map((v, i) => (
                    <span key={i} style={{ fontSize: 13, color: C.text }}>
                      {v.handle || "No handle"} ✓
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => { setGlobalStep("portfolio"); }} style={secondaryBtn}>← Edit</button>
              <button onClick={handleFinalSubmit} style={{ ...primaryBtn, marginTop: 0, flex: 2 }}>Generate Report →</button>
            </div>
          </div>
        )}

        {/* STEP: PROCESSING */}
        {globalStep === "processing" && (
          <div style={{ textAlign: "center", padding: "72px 0" }}>
            <div style={{ width: 48, height: 48, margin: "0 auto 28px", border: `3px solid ${C.border}`, borderTop: `3px solid ${C.text}`, borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
            <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 10, fontFamily: "'Playfair Display', serif", color: C.text }}>Building your report...</h2>
            <p style={{ color: C.muted, fontSize: 14, maxWidth: 320, margin: "0 auto" }}>AI is reading your screenshots, extracting metrics, and generating the analysis.</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {/* STEP: DONE */}
        {globalStep === "done" && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{ fontSize: 52, marginBottom: 20 }}>✅</div>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10, fontFamily: "'Playfair Display', serif", color: C.text }}>Report created!</h2>
            <p style={{ color: C.muted, fontSize: 14, marginBottom: 6 }}>
              Status is <strong style={{ color: "#dd7d4f" }}>Needs Review</strong> — verify deliverables against Xero before sending to client.
            </p>
            {extractionNotes && (
              <div style={{ background: "#fff8ee", border: "1px solid #f0ddb0", borderRadius: 10, padding: "12px 16px", margin: "16px auto", maxWidth: 400, textAlign: "left", fontSize: 13, color: C.muted }}>
                <strong style={{ color: "#dd7d4f" }}>AI Notes:</strong> {extractionNotes}
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center", marginTop: 28 }}>
              <a href={`/Report?slug=${reportSlug}`} target="_blank"
                style={{ ...primaryBtn, marginTop: 0, display: "inline-block", textDecoration: "none" }}>
                View Report →
              </a>
              <button onClick={() => window.location.reload()} style={{ background: "none", border: "none", color: C.accent, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>
                Submit another report
              </button>
              <Link to="/Dashboard" style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 14, fontFamily: "'DM Sans', sans-serif", textDecoration: "none" }}>
                ← Back to Dashboard
              </Link>
            </div>
          </div>
        )}

        </>
        )}

      </div>
    </div>
  );
}

const h1 = { fontSize: 26, fontWeight: 700, marginBottom: 6, marginTop: 0, fontFamily: "'Playfair Display', serif", color: C.text };
const sub = { color: C.muted, fontSize: 14, marginBottom: 28, marginTop: 0, fontFamily: "'DM Sans', sans-serif" };
const labelStyle = { display: "block", fontSize: 13, color: C.muted, marginBottom: 8, fontWeight: 500, fontFamily: "'DM Sans', sans-serif" };
const inputStyle = { width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" };
const primaryBtn = { marginTop: 24, width: "100%", background: C.text, border: "none", borderRadius: 8, padding: "14px", color: "#faf5ee", fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };
const secondaryBtn = { marginTop: 24, background: "transparent", border: `1px solid ${C.border}`, borderRadius: 8, padding: "14px 20px", color: C.muted, fontWeight: 500, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" };

function Field({ label, value, onChange, placeholder, hint }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      {hint && <div style={{ fontSize: 11, color: C.muted, marginTop: 4, fontFamily: "'DM Sans', sans-serif" }}>{hint}</div>}
    </div>
  );
}

function Chip({ label, selected, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ background: selected ? "#ede9f8" : C.card, border: `1.5px solid ${selected ? C.accent : C.border}`, borderRadius: 6, padding: "7px 14px", color: selected ? C.accent : C.muted, fontSize: 13, cursor: "pointer", fontWeight: selected ? 600 : 400, fontFamily: "'DM Sans', sans-serif" }}>
      {label}
    </button>
  );
}

function Tag({ children }) {
  return (
    <span style={{ background: "#ede9f8", border: `1px solid #d0cdf0`, color: C.accent, borderRadius: 4, padding: "3px 10px", fontSize: 11, fontFamily: "'DM Sans', sans-serif" }}>{children}</span>
  );
}

function Err({ children }) {
  return <div style={{ background: "#fdf0f0", border: "1px solid #f5c0c0", borderRadius: 8, padding: "11px 14px", marginBottom: 18, color: "#b03030", fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}>{children}</div>;
}

function Muted({ children }) {
  return <span style={{ color: C.muted, fontWeight: 400, fontSize: 12 }}> — {children}</span>;
}