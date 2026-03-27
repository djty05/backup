import { useState } from "react";
import { updateReport } from "../api/backendFunctions";

const C = {
  bg: "#faf5ee",
  text: "#3b1320",
  muted: "#8a6070",
  border: "#e8ddd0",
  accent: "#8883d1",
  card: "#fff",
};

const taStyle = {
  width: "100%",
  background: "#faf5ee",
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  padding: "10px 12px",
  color: C.text,
  fontSize: 13,
  lineHeight: 1.6,
  resize: "vertical",
  fontFamily: "'DM Sans', sans-serif",
  boxSizing: "border-box",
};

export default function AnalysisOverrideModal({ report, onClose, onSaved }) {
  const [vibeAnalysis, setVibeAnalysis] = useState(report.vibe_analysis || "");
  const [extensionPitch, setExtensionPitch] = useState(report.extension_pitch || "");
  const [sentiments, setSentiments] = useState((report.top_sentiments || []).join(", "));
  const [topComments, setTopComments] = useState(report.top_comments || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const sentimentArray = sentiments
      .split(",")
      .map(s => s.trim())
      .filter(Boolean);

    await updateReport({
      reportId: report.id,
      data: {
        vibe_analysis: vibeAnalysis,
        extension_pitch: extensionPitch,
        top_sentiments: sentimentArray,
        top_comments: topComments,
      },
    });

    onSaved({
      ...report,
      vibe_analysis: vibeAnalysis,
      extension_pitch: extensionPitch,
      top_sentiments: sentimentArray,
      top_comments: topComments,
    });
    setSaving(false);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 24,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: C.card, borderRadius: 14, padding: 32,
          width: "100%", maxWidth: 560,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          maxHeight: "90vh", overflowY: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, fontFamily: "'Playfair Display', serif", color: C.text }}>
            Override Analysis
          </h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted }}>✕</button>
        </div>

        <p style={{ fontSize: 13, color: C.muted, marginBottom: 24, marginTop: 0 }}>
          Editing analysis for <strong style={{ color: C.text }}>{report.campaign_name}</strong>
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Vibe Analysis
            </label>
            <textarea
              rows={4}
              value={vibeAnalysis}
              onChange={e => setVibeAnalysis(e.target.value)}
              style={taStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Extension Pitch
            </label>
            <textarea
              rows={4}
              value={extensionPitch}
              onChange={e => setExtensionPitch(e.target.value)}
              style={taStyle}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, color: C.muted, fontWeight: 600, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Top Comments
            </label>
            <textarea
              rows={5}
              value={topComments}
              onChange={e => setTopComments(e.target.value)}
              placeholder={"Paste top comments here, e.g.\n\"Where can I get this?!\"\n\"I literally just bought it because of this video 😍\"\n\"Best collab I've seen this year\""}
              style={taStyle}
            />
            <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Copy & paste real comments directly from the post</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 28, justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: `1px solid ${C.border}`,
              borderRadius: 8, padding: "10px 20px", color: C.muted,
              fontSize: 14, cursor: "pointer", fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              background: C.text, border: "none",
              borderRadius: 8, padding: "10px 24px", color: "#faf5ee",
              fontSize: 14, fontWeight: 600, cursor: saving ? "default" : "pointer",
              fontFamily: "'DM Sans', sans-serif", opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}