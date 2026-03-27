import { useState, useEffect } from "react";
import { uploadToGoogleDrive } from "../api/backendFunctions";

const C = {
  bg: "#faf5ee",
  text: "#3b1320",
  muted: "#8a6070",
  border: "#e8ddd0",
  accent: "#8883d1",
  card: "#fff",
  secondary: "#f3ede3",
};

export default function TalentUpload() {
  const [step, setStep] = useState(1); // 1=details, 2=upload, 3=uploading, 4=done
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [files, setFiles] = useState([]);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState(null);

  // Pre-fill from URL params e.g. ?creator=jessicasmith&brand=BondiSands&campaign=SummerGlow
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const campaignFromUrl = params.get("campaign") || "";
  const creatorFromUrl = params.get("creator") || "";
  const brandFromUrl = params.get("brand") || "";

  const [campaign] = useState(campaignFromUrl);

  const handleFiles = (incoming) => {
    const imageFiles = Array.from(incoming).filter(f => f.type.startsWith("image/"));
    setFiles(prev => [...prev, ...imageFiles]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleStep1 = (e) => {
    e.preventDefault();
    const n = creatorFromUrl || name;
    const b = brandFromUrl || brand;
    if (!n || !b) {
      setError("Please fill in your name and the brand name.");
      return;
    }
    setError(null);
    setStep(2);
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      setError("Please add at least one screenshot.");
      return;
    }
    setError(null);
    setStep(3);

    try {
      const creatorName = creatorFromUrl || name;
      const brandName = brandFromUrl || brand;

      // Convert files to base64
      const fileData = await Promise.all(files.map(f => new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: f.name, base64: reader.result, mimeType: f.type });
        reader.readAsDataURL(f);
      })));

      await uploadToGoogleDrive({
        campaignName: campaign || `${brandName} Campaign`,
        brandName,
        creatorName,
        deliverableName: "Talent Screenshots",
        files: fileData,
      });

      setStep(4);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again or send your screenshots directly to your manager.");
      setStep(2);
    }
  };

  const prefilledCreator = !!creatorFromUrl;
  const prefilledBrand = !!brandFromUrl;



  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ background: C.text, padding: "16px 32px", display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontWeight: 800, fontSize: 16, color: "#faf5ee", letterSpacing: -0.5, fontFamily: "'Playfair Display', serif" }}>Good Answer</div>
        <div style={{ width: 1, height: 16, background: "rgba(255,255,255,0.2)", margin: "0 4px" }} />
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", letterSpacing: 1, textTransform: "uppercase" }}>Talent Asset Upload</div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
        <div style={{ width: "100%", maxWidth: 480 }}>

          {/* Step 1: Who are you */}
          {step === 1 && (
            <form onSubmit={handleStep1}>
              <div style={{ textAlign: "center", marginBottom: 36 }}>
                <div style={{ fontSize: 40, marginBottom: 16 }}>👋</div>
                <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>
                  {prefilledCreator ? `Hey ${creatorFromUrl}!` : "Hey! Let's get your screenshots uploaded."}
                </h1>
                <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.6 }}>
                  {campaign
                    ? `We need your screenshots for the <strong>${campaign}</strong> campaign with ${brandFromUrl || brand}.`
                    : "Just drop your screenshots below and we'll take care of the rest."}
                </p>
              </div>

              {error && <div style={{ background: "#fdf0f0", border: `1px solid #f5c0c0`, borderRadius: 8, padding: "11px 14px", marginBottom: 18, color: "#b03030", fontSize: 14 }}>{error}</div>}

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {!prefilledCreator && (
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 500 }}>Your name / handle</label>
                    <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. @jessicasmith"
                      style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }} />
                  </div>
                )}
                {!prefilledBrand && (
                  <div>
                    <label style={{ display: "block", fontSize: 13, color: C.muted, marginBottom: 6, fontWeight: 500 }}>Brand name</label>
                    <input value={brand} onChange={e => setBrand(e.target.value)} placeholder="e.g. Bondi Sands"
                      style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: "11px 14px", color: C.text, fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "'DM Sans', sans-serif" }} />
                  </div>
                )}
              </div>

              <button type="submit"
                style={{ marginTop: 24, width: "100%", background: C.text, border: "none", borderRadius: 8, padding: "14px", color: "#faf5ee", fontWeight: 600, fontSize: 15, cursor: "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Continue →
              </button>
            </form>
          )}

          {/* Step 2: Upload */}
          {step === 2 && (
            <div>
              <div style={{ textAlign: "center", marginBottom: 32 }}>
                <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>Upload your screenshots</h1>
                <p style={{ color: C.muted, fontSize: 14 }}>
                  Include all stats screenshots — feed posts, reels, stories, TikToks. The more the better.
                </p>
              </div>

              {error && <div style={{ background: "#fdf0f0", border: `1px solid #f5c0c0`, borderRadius: 8, padding: "11px 14px", marginBottom: 18, color: "#b03030", fontSize: 14 }}>{error}</div>}

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById("talent-files").click()}
                style={{ border: `2px dashed ${dragging ? C.accent : C.border}`, borderRadius: 14, padding: "40px 20px", textAlign: "center", cursor: "pointer", background: dragging ? "#f5f1eb" : C.card, transition: "all 0.2s", marginBottom: 16 }}
              >
                <input id="talent-files" type="file" accept="image/*" multiple style={{ display: "none" }} onChange={e => handleFiles(e.target.files)} />
                <div style={{ fontSize: 36, marginBottom: 12 }}>📸</div>
                <div style={{ color: C.muted, fontSize: 14 }}>Tap to select screenshots, or drag and drop</div>
                <div style={{ color: C.muted, fontSize: 12, marginTop: 6 }}>JPG, PNG accepted</div>
              </div>

              {/* Preview grid */}
              {files.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, color: C.muted, marginBottom: 10 }}>{files.length} screenshot{files.length !== 1 ? "s" : ""} ready to upload</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
                    {files.map((f, i) => (
                      <div key={i} style={{ position: "relative", paddingBottom: "100%", background: C.secondary, borderRadius: 8, overflow: "hidden" }}>
                        <img src={URL.createObjectURL(f)} alt=""
                          style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={(e) => { e.stopPropagation(); setFiles(prev => prev.filter((_, j) => j !== i)); }}
                          style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.5)", border: "none", borderRadius: "50%", width: 20, height: 20, color: "#fff", fontSize: 10, cursor: "pointer", lineHeight: 1 }}>✕</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button onClick={handleSubmit} disabled={files.length === 0}
                style={{ width: "100%", background: files.length === 0 ? C.secondary : C.text, border: "none", borderRadius: 8, padding: "14px", color: files.length === 0 ? C.muted : "#faf5ee", fontWeight: 600, fontSize: 15, cursor: files.length === 0 ? "not-allowed" : "pointer", fontFamily: "'DM Sans', sans-serif" }}>
                Send {files.length > 0 ? `${files.length} screenshot${files.length !== 1 ? "s" : ""}` : "screenshots"} →
              </button>
            </div>
          )}

          {/* Step 3: Uploading */}
          {step === 3 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ width: 52, height: 52, margin: "0 auto 24px", border: `3px solid ${C.border}`, borderTop: `3px solid ${C.text}`, borderRadius: "50%", animation: "spin 0.9s linear infinite" }} />
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, fontFamily: "'Playfair Display', serif" }}>Uploading...</h2>
              <p style={{ color: C.muted, fontSize: 14 }}>Filing your screenshots now, won't be long.</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}

          {/* Step 4: Done */}
          {step === 4 && (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <div style={{ fontSize: 56, marginBottom: 20 }}>🎉</div>
              <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 10, fontFamily: "'Playfair Display', serif" }}>All done!</h2>
              <p style={{ color: C.muted, fontSize: 15, lineHeight: 1.6 }}>
                Your screenshots have been filed. The Good Answer team will take it from here — no need to send anything else.
              </p>
              <p style={{ color: C.muted, fontSize: 13, marginTop: 20 }}>You can close this window.</p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}