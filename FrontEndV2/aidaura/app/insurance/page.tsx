"use client";
import { useRef, useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";

// Extend window type for dynamically loaded pdf.js
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pdfjsLib: any;
  }
}

const FIELDS = [
  { key: "insurer_name", label: "Insurance Provider", full: true },
  { key: "member_name", label: "Member Name" },
  { key: "member_id", label: "Member ID" },
  { key: "group_number", label: "Group Number" },
  { key: "plan_name", label: "Plan Name", full: true },
  { key: "plan_type", label: "Plan Type" },
  { key: "copay", label: "Co-pay" },
  { key: "deductible", label: "Deductible" },
  { key: "rx_bin", label: "RX BIN" },
  { key: "rx_pcn", label: "RX PCN" },
  { key: "phone", label: "Phone", full: true },
  { key: "effective_date", label: "Effective Date" },
];

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

async function pdfToImageDataURL(pdfDataUrl: string): Promise<string> {
  try {
    if (!window.pdfjsLib) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        script.onload = () => resolve("");
        script.onerror = () => reject(new Error("pdf.js load failed"));
        document.head.appendChild(script);
      });
      window.pdfjsLib.GlobalWorkerOptions.workerSrc =
        "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    const pdfjsLib = window.pdfjsLib;
    const base64 = pdfDataUrl.split(",")[1];
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2.0 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return pdfDataUrl;
  }
}

function getMediaType(file: File): string {
  const mime = file.type.toLowerCase();
  if (mime === "image/png") return "image/png";
  if (mime === "image/gif") return "image/gif";
  if (mime === "image/webp") return "image/webp";
  return "image/jpeg";
}

export default function InsurancePage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [modalOpen, setModalOpen] = useState(false);
  const [view, setView] = useState("choose");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [analysisState, setAnalysisState] = useState("idle");
  const [insuranceData, setInsuranceData] = useState<Record<string, string> | null>(null);
  const [analysisRaw, setAnalysisRaw] = useState("");
  const [analysisError, setAnalysisError] = useState("");

  const [manualOpen, setManualOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [groupNumber, setGroupNumber] = useState("");
  const [manualError, setManualError] = useState("");

  const [householdIncome, setHouseholdIncome] = useState("");
  const [familySize, setFamilySize] = useState("");
  const [householdError, setHouseholdError] = useState("");

  const [insuranceDone, setInsuranceDone] = useState(false);

  const stopStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => { return () => stopStream(); }, []);

  const closeModal = () => {
    stopStream();
    setModalOpen(false);
    setView("choose");
    setPreviewSrc(null);
    setBase64Data(null);
    setCameraError(null);
    setAnalysisState("idle");
    setInsuranceData(null);
    setAnalysisRaw("");
    setAnalysisError("");
  };

  const analyzeImage = useCallback(async (imageDataUrl: string, mediaType = "image/jpeg") => {
    setAnalysisState("analyzing");
    setInsuranceData(null);
    setAnalysisRaw("");
    setAnalysisError("");

    const base64 = imageDataUrl.includes(",") ? imageDataUrl.split(",")[1] : imageDataUrl;
    if (!base64 || base64.length < 100) {
      setAnalysisState("error");
      setAnalysisError("Image data is empty or too small to process.");
      return;
    }

    try {
      const resp = await fetch("http://localhost:5000/api/insurance/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image_base64: base64 }),
      });

      if (!resp.ok) {
        const errBody = await resp.text();
        throw new Error(`API error ${resp.status}: ${errBody.slice(0, 200)}`);
      }

      const parsed = await resp.json();
      if (parsed.error) throw new Error(parsed.error);

      setInsuranceData(parsed);
      sessionStorage.setItem("aidaura_insurance_data", JSON.stringify(parsed));
      setAnalysisState("done");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setAnalysisError(msg);
      setAnalysisState("error");
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    try {
      let dataUrl = await readFileAsDataURL(file);
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      let mediaType = "image/jpeg";
      if (isPdf) {
        dataUrl = await pdfToImageDataURL(dataUrl);
      } else {
        mediaType = getMediaType(file);
      }
      setBase64Data(dataUrl as string);
      setPreviewSrc(dataUrl as string);
      setView("preview");
      await analyzeImage(dataUrl, mediaType);
    } catch (err) {
      setAnalysisState("error");
      setAnalysisError("Could not read the selected file. Please try a different image.");
    }
  };

  const startCamera = useCallback(async () => {
    setCameraError(null);
    setView("camera");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setCameraError(
        msg.includes("Permission")
          ? "Camera permission denied. Please allow camera access and try again."
          : "Could not access camera. Please use file upload instead."
      );
    }
  }, []);

  if (!mounted) return null;

  const capturePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    stopStream();
    setBase64Data(dataUrl);
    setPreviewSrc(dataUrl);
    setView("preview");
    analyzeImage(dataUrl, "image/jpeg");
  };

  const handleSubmit = async () => {
    if (!householdIncome.trim() || !familySize.trim()) {
      setHouseholdError("Please fill in household income and family size before continuing.");
      document.getElementById("household-section")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    sessionStorage.setItem("aidaura_household_income", householdIncome.trim());
    sessionStorage.setItem("aidaura_family_size", familySize.trim());

    if (base64Data) {
      try {
        const resp = await fetch("http://localhost:5000/api/insurance/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_base64: base64Data }),
        });
        const data = await resp.json();
        sessionStorage.setItem("aidaura_extract_result", JSON.stringify(data));
      } catch (err) {
        console.error("Failed to call /extract:", err);
      }
    }


    router.push("/emergency");
  };

  const handleManualSubmit = async () => {
    if (!memberId.trim() || !groupNumber.trim()) {
      setManualError("Both fields are required.");
      return;
    }

    sessionStorage.setItem("aidaura_member_id", memberId.trim());
    sessionStorage.setItem("aidaura_group_number", groupNumber.trim());

    setInsuranceDone(true);
    setManualOpen(false);
  };

  const filledCount = insuranceData ? FIELDS.filter((f) => insuranceData[f.key]).length : 0;

  const handleUseCard = () => {
    setInsuranceDone(true);
    closeModal();
  };

  return (
    <div style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif", background: "#f8f6f6", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f8f6f6; }
        @keyframes popIn { from { opacity: 0; transform: scale(.88) translateY(16px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        .action-card {
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 20px;
          cursor: pointer;
          transition: all 0.25s ease;
          outline: none;
          position: relative;
        }
        .action-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(37,99,235,0.07), rgba(16,185,129,0.07));
          opacity: 0;
          transition: opacity 0.25s ease;
          border-radius: inherit;
        }
        .action-card:hover::before {
          opacity: 1;
        }
        .action-card:active::before {
          background: linear-gradient(135deg, rgba(37,99,235,0.15), rgba(16,185,129,0.15));
          opacity: 1;
        }
        .action-card:hover {
          border-color: #2563eb;
          box-shadow: 0 8px 30px rgba(37,99,235,0.15);
          transform: translateY(-2px);
        }
        .action-card:active {
          transform: translateY(0px);
          box-shadow: 0 4px 16px rgba(37,99,235,0.2);
        }
        .btn-primary {
          background: linear-gradient(90deg, #2563eb, #10b981);
          color: white;
          font-weight: 700;
          font-size: 1rem;
          border: none;
          border-radius: 14px;
          padding: 14px 32px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          transition: all 0.2s;
          font-family: inherit;
        }
        .btn-primary:hover { opacity: 0.92; transform: scale(1.02); }
        .btn-primary:active { transform: scale(0.98); }
        .btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
        input, select {
          font-family: inherit;
          font-size: 0.875rem;
          color: #0f172a;
          outline: none;
        }
        input:focus, select:focus {
          border-color: #60a5fa !important;
        }
        .modal-choose-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          padding: 24px;
          border-radius: 20px;
          border: 2px dashed #e2e8f0;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          font-family: inherit;
        }
        .modal-choose-btn:hover {
          border-color: #60a5fa;
          background: #eff6ff;
        }
        .icon-circle {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .back-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: none;
          border: none;
          color: #64748b;
          font-size: 0.875rem;
          cursor: pointer;
          font-family: inherit;
          padding: 0;
          margin-bottom: 12px;
        }
        .back-btn:hover { color: #0f172a; }
        .field-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
        }
        .field-cell {
          padding: 12px 16px;
          border-right: 1px solid #f1f5f9;
          border-bottom: 1px solid #f1f5f9;
        }
        .field-cell.full { grid-column: span 2; }
        .field-label {
          font-size: 10px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: #94a3b8;
          margin-bottom: 4px;
        }
        .field-value {
          font-size: 0.875rem;
          font-weight: 600;
          font-family: 'DM Mono', monospace;
          color: #0f172a;
        }
        .field-value.empty {
          color: #cbd5e1;
          font-weight: 400;
          font-style: italic;
          font-family: inherit;
        }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      {/* Header */}
      <header style={{ background: "white", borderBottom: "1px solid #e2e8f0", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div onClick={() => router.push('/')} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #2563eb, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(37,99,235,0.35)" }}>
            <span style={{ fontFamily: '"Kaushan Script", cursive', fontSize: '1.05rem', color: 'white', lineHeight: 1 }}>A3</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: "1.1rem", color: "#0f172a" }}>Aid<span style={{ background: "linear-gradient(90deg, #2563eb, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Aura</span></span>
        </div>
      </header>

      {/* Main */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 24px", animation: "fadeIn 0.5s ease both" }}>
        <div style={{ maxWidth: 800, width: "100%", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(2rem, 5vw, 3rem)", fontWeight: 800, color: "#0f172a", marginBottom: 12 }}>
            Enter Insurance Information
          </h2>
          <p style={{ fontSize: "1.1rem", color: "#64748b", marginBottom: 40 }}>
            We'll use your information to show your best coverage
          </p>

          {/* Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 48 }}>
            <button className="action-card" onClick={() => { setModalOpen(true); setView("choose"); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", gap: 20 }}>
              {insuranceDone && (
                <div style={{ position: "absolute", top: 12, right: 12, background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(16,185,129,0.4)" }}>
                  <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} /></svg>
                </div>
              )}
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: insuranceDone ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))" : "linear-gradient(135deg, rgba(37,99,235,0.1), rgba(16,185,129,0.1))", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>
                <svg width="32" height="32" fill="none" stroke={insuranceDone ? "#10b981" : "#2563eb"} viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: insuranceDone ? "#059669" : "#0f172a" }}>Upload file</div>
                <div style={{ fontSize: "0.85rem", color: insuranceDone ? "#10b981" : "#94a3b8", marginTop: 6 }}>{insuranceDone ? "Card saved ✓" : "Upload a file or scan with camera"}</div>
              </div>
            </button>

            <button className="action-card" onClick={() => { setManualOpen(true); setMemberId(""); setGroupNumber(""); setManualError(""); }} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "48px 32px", gap: 20 }}>
              {insuranceDone && (
                <div style={{ position: "absolute", top: 12, right: 12, background: "linear-gradient(135deg, #10b981, #059669)", borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 8px rgba(16,185,129,0.4)" }}>
                  <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} /></svg>
                </div>
              )}
              <div style={{ width: 72, height: 72, borderRadius: "50%", background: insuranceDone ? "linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.15))" : "linear-gradient(135deg, rgba(37,99,235,0.1), rgba(16,185,129,0.1))", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="32" height="32" fill="none" stroke={insuranceDone ? "#10b981" : "#2563eb"} viewBox="0 0 24 24"><path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1.1rem", color: insuranceDone ? "#059669" : "#0f172a" }}>Manually input information</div>
                <div style={{ fontSize: "0.85rem", color: insuranceDone ? "#10b981" : "#94a3b8", marginTop: 6 }}>{insuranceDone ? "Details saved ✓" : "Enter details yourself!"}</div>
              </div>
            </button>
          </div>

          {/* Household Section */}
          <div id="household-section" style={{ maxWidth: 600, margin: "0 auto 40px" }}>
            <div style={{ background: "white", borderRadius: 16, border: "1px solid #ede9e9", boxShadow: "0 1px 6px rgba(0,0,0,0.03)", overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px", background: "linear-gradient(90deg, #eff6ff, #f0fdf4)", borderBottom: "1px solid #e9f5f0" }}>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#6b7280", letterSpacing: "0.02em" }}>Household Information</div>
                </div>
              </div>

              <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Annual Household Income <span style={{ color: "#f87171" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#94a3b8", fontWeight: 600, fontSize: "0.875rem", pointerEvents: "none" }}>$</span>
                    <input
                      type="number"
                      min="0"
                      value={householdIncome}
                      onChange={(e) => { setHouseholdIncome(e.target.value); setHouseholdError(""); }}
                      placeholder="e.g. 55000"
                      style={{ width: "100%", paddingLeft: 28, paddingRight: 16, paddingTop: 12, paddingBottom: 12, borderRadius: 12, border: "2px solid #e2e8f0", fontSize: "0.875rem", transition: "border-color 0.2s" }}
                    />
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 6 }}>Enter your total annual gross income</p>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>
                    Family Size <span style={{ color: "#f87171" }}>*</span>
                  </label>
                  <div style={{ position: "relative" }}>
                    <select
                      value={familySize}
                      onChange={(e) => { setFamilySize(e.target.value); setHouseholdError(""); }}
                      style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e2e8f0", fontSize: "0.875rem", appearance: "none", background: "white", cursor: "pointer", transition: "border-color 0.2s" }}
                    >
                      <option value="">Select family size…</option>
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <option key={n} value={String(n)}>
                          {n} {n === 1 ? "person (just me)" : n === 2 ? "people (couple / parent + child)" : "people"}
                        </option>
                      ))}
                      <option value="9+">9+ people</option>
                    </select>
                    <svg style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} width="16" height="16" fill="none" stroke="#94a3b8" viewBox="0 0 24 24"><path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "#94a3b8", marginTop: 6 }}>Include all dependents covered by this plan</p>
                </div>
              </div>

              {householdIncome && familySize && (
                <div style={{ margin: "0 24px 20px", padding: "12px 16px", borderRadius: 14, background: "#f0fdf4", border: "1px solid #d1fae5", display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <svg style={{ flexShrink: 0, marginTop: 2 }} width="16" height="16" fill="none" stroke="#059669" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  <p style={{ fontSize: "0.8rem", color: "#065f46" }}>
                    <strong>Got it!</strong> Household income of <strong>${Number(householdIncome).toLocaleString()}</strong> for <strong>{familySize} {Number(familySize) === 1 ? "person" : "people"}</strong> — we'll use this to find your best coverage options and check subsidy eligibility.
                  </p>
                </div>
              )}

              {householdError && (
                <div style={{ margin: "0 24px 20px", padding: "12px 16px", borderRadius: 14, background: "#fef2f2", border: "1px solid #fecaca", display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", color: "#dc2626" }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  {householdError}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button className="btn-primary" onClick={handleSubmit} style={{ fontSize: "1.1rem", padding: "16px 40px" }}>
              Continue
              <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ textAlign: "center", padding: "20px", fontSize: "0.8rem", color: "#94a3b8", borderTop: "1px solid #e2e8f0", background: "white" }}>
        © 2026 AidAura. All rights reserved.
      </footer>

      <input ref={fileInputRef} type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleFileChange} />
      <canvas ref={canvasRef} style={{ display: "none" }} />

      {/* ═══ UPLOAD MODAL ═══ */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", padding: 16 }} onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div style={{ position: "relative", background: "white", borderRadius: 28, boxShadow: "0 25px 60px rgba(0,0,0,0.2)", width: "100%", maxWidth: 480, overflow: "hidden", maxHeight: "90vh", overflowY: "auto", animation: "popIn .35s cubic-bezier(.16,1,.3,1) both" }}>
            <button onClick={closeModal} style={{ position: "sticky", top: 16, float: "right", marginRight: 16, zIndex: 10, width: 32, height: 32, borderRadius: "50%", background: "#f1f5f9", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="14" height="14" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
            </button>

            {/* CHOOSE VIEW */}
            {view === "choose" && (
              <div style={{ padding: 32, clear: "both" }}>
                <div style={{ textAlign: "center", marginBottom: 32 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg, #2563eb, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 24px rgba(37,99,235,0.3)" }}>
                    <svg width="26" height="26" fill="none" stroke="white" viewBox="0 0 24 24"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  </div>
                  <h3 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>Add Insurance Card</h3>
                  <p style={{ fontSize: "0.875rem", color: "#64748b" }}>Choose how you'd like to provide your card</p>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <button className="modal-choose-btn" onClick={() => fileInputRef.current?.click()}>
                    <div className="icon-circle" style={{ background: "#eff6ff" }}>
                      <svg width="28" height="28" fill="none" stroke="#2563eb" viewBox="0 0 24 24"><path d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }}>Upload File</div>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>JPG, PNG, or PDF</div>
                    </div>
                  </button>
                  <button className="modal-choose-btn" onClick={startCamera}>
                    <div className="icon-circle" style={{ background: "#f0fdf4" }}>
                      <svg width="28" height="28" fill="none" stroke="#059669" viewBox="0 0 24 24">
                        <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                        <path d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                      </svg>
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontWeight: 600, color: "#0f172a", fontSize: "0.9rem" }}>Take Photo</div>
                      <div style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 4 }}>Use your camera</div>
                    </div>
                  </button>
                </div>
                <p style={{ textAlign: "center", fontSize: "0.78rem", color: "#94a3b8", marginTop: 24, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
                  <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  Your card data is encrypted and never stored
                </p>
              </div>
            )}

            {/* CAMERA VIEW */}
            {view === "camera" && (
              <div style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ padding: "24px 24px 12px", clear: "both" }}>
                  <button className="back-btn" onClick={() => { stopStream(); setView("choose"); setCameraError(null); }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                    Back
                  </button>
                  <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a" }}>Scan Insurance Card</h3>
                  <p style={{ fontSize: "0.875rem", color: "#64748b", marginTop: 4 }}>Position your card within the frame</p>
                </div>
                {cameraError ? (
                  <div style={{ margin: "0 24px 24px", padding: 16, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 14, fontSize: "0.875rem", color: "#dc2626" }}>
                    {cameraError}
                    <button onClick={() => fileInputRef.current?.click()} style={{ display: "block", marginTop: 12, color: "#2563eb", fontWeight: 600, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "0.875rem" }}>Use file upload instead →</button>
                  </div>
                ) : (
                  <>
                    <div style={{ position: "relative", margin: "0 24px", borderRadius: 20, overflow: "hidden", background: "black", aspectRatio: "16/9" }}>
                      <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                        <div style={{ width: "85%", aspectRatio: "1.586/1", borderRadius: 14, border: "2.5px solid rgba(99,220,180,0.9)", boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }} />
                      </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "center", padding: "20px 0" }}>
                      <button onClick={capturePhoto} style={{ width: 64, height: 64, borderRadius: "50%", background: "white", border: "4px solid #2dd4bf", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(0,0,0,0.15)", transition: "transform 0.15s" }}>
                        <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg, #2563eb, #10b981)" }} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* PREVIEW VIEW */}
            {view === "preview" && previewSrc && (
              <div style={{ padding: 24, clear: "both" }}>
                <button className="back-btn" onClick={() => { setPreviewSrc(null); setBase64Data(null); setAnalysisState("idle"); setInsuranceData(null); setView("choose"); }}>
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M15 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                  Retake / Choose different
                </button>
                <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Confirm your card</h3>
                <p style={{ fontSize: "0.875rem", color: "#64748b", marginBottom: 16 }}>Make sure all text is clearly visible</p>

                <div style={{ borderRadius: 16, overflow: "hidden", border: "2px solid #f1f5f9", marginBottom: 16, background: "#f8fafc" }}>
                  <img src={previewSrc} alt="Insurance card preview" style={{ width: "100%", objectFit: "contain", maxHeight: 192 }} />
                </div>

                {/* Analysis output */}
                <div style={{ borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden", marginBottom: 16 }}>
                  {analysisState === "analyzing" && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 16px", gap: 12 }}>
                      <svg className="spin" width="32" height="32" fill="none" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" stroke="#dbeafe" strokeWidth="4" />
                        <path fill="#2563eb" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      <p style={{ fontWeight: 600, color: "#0f172a" }}>Analyzing your insurance card…</p>
                      <p style={{ fontSize: "0.875rem", color: "#64748b" }}>Extracting member details with AI</p>
                    </div>
                  )}

                  {analysisState === "error" && (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 16px", gap: 8 }}>
                      <svg width="28" height="28" fill="none" stroke="#f87171" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                      <p style={{ fontWeight: 600, color: "#dc2626", fontSize: "0.875rem" }}>Analysis failed</p>
                      <p style={{ fontSize: "0.78rem", color: "#94a3b8", textAlign: "center" }}>{analysisError || "Could not connect to AI service"}</p>
                    </div>
                  )}

                  {analysisState === "done" && (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: "linear-gradient(90deg, #eff6ff, #f0fdf4)", borderBottom: "1px solid #f1f5f9" }}>
                        <svg width="16" height="16" fill="none" stroke="#2563eb" viewBox="0 0 24 24"><path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                        <span style={{ fontSize: "0.875rem", fontWeight: 700, color: "#0f172a" }}>Extracted Information</span>
                        <span style={{ marginLeft: "auto", fontSize: "10px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", background: "linear-gradient(90deg, #2563eb, #10b981)", color: "white", padding: "2px 8px", borderRadius: 9999 }}>
                          {filledCount} fields found
                        </span>
                      </div>

                      {!insuranceData && analysisRaw && (
                        <div style={{ padding: 16, fontSize: "0.78rem", fontFamily: "monospace", color: "#475569", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{analysisRaw}</div>
                      )}

                      {insuranceData && (
                        <div className="field-grid">
                          {FIELDS.map(({ key, label, full }) => {
                            const val = insuranceData[key];
                            return (
                              <div key={key} className={`field-cell${full ? " full" : ""}`}>
                                <div className="field-label">{label}</div>
                                <div className={`field-value${val ? "" : " empty"}`}>{val || "Not found"}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {insuranceData?.notes && (
                        <div style={{ padding: "10px 16px", background: "#fffbeb", borderTop: "1px solid #fef3c7", fontSize: "0.78rem", color: "#92400e" }}>
                          <strong>Note:</strong> {insuranceData.notes}
                        </div>
                      )}
                    </>
                  )}
                </div>

                {(analysisState === "done" || analysisState === "error") && (
                  <ul style={{ listStyle: "none", marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                    {["Member name is visible", "Member ID is readable", "Insurance provider name is clear"].map((item) => (
                      <li key={item} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.875rem", color: "#475569" }}>
                        <div style={{ width: 20, height: 20, borderRadius: "50%", background: "#ccfbf1", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <svg width="12" height="12" fill="none" stroke="#059669" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} /></svg>
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  className="btn-primary"
                  onClick={handleUseCard}
                  disabled={analysisState === "analyzing"}
                  style={{ width: "100%", justifyContent: "center", background: "linear-gradient(90deg, #2563eb, #10b981)" }}
                >
                  {analysisState === "analyzing" ? (
                    <><svg className="spin" width="20" height="20" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.25)" strokeWidth="4" /><path fill="white" d="M4 12a8 8 0 018-8v8z" /></svg>Analyzing…</>
                  ) : (
                    <>Use this card <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 7l5 5m0 0l-5 5m5-5H6" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg></>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══ MANUAL INPUT MODAL ═══ */}
      {manualOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)", padding: 16 }} onClick={(e) => { if (e.target === e.currentTarget) setManualOpen(false); }}>
          <div style={{ position: "relative", background: "white", borderRadius: 24, boxShadow: "0 25px 60px rgba(0,0,0,0.2)", width: "100%", maxWidth: 420, overflow: "hidden", animation: "popIn .35s cubic-bezier(.16,1,.3,1) both" }}>

            {/* Gradient header strip */}
            <div style={{ background: "linear-gradient(90deg, #eff6ff, #f0fdf4)", borderBottom: "1px solid #e9f5f0", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: "1rem", color: "#0f172a" }}>Insurance Details</div>
                <div style={{ fontSize: "0.78rem", color: "#64748b", marginTop: 2 }}>Enter the information from your insurance card</div>
              </div>
              <button onClick={() => setManualOpen(false)} style={{ width: 30, height: 30, borderRadius: "50%", background: "rgba(0,0,0,0.06)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="13" height="13" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
              </button>
            </div>

            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>Member ID <span style={{ color: "#f87171" }}>*</span></label>
                  <input type="text" value={memberId} onChange={(e) => { setMemberId(e.target.value); setManualError(""); }} placeholder="e.g. KZZ479W08435" style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e2e8f0", fontFamily: "monospace", fontSize: "0.875rem" }} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#374151", marginBottom: 8 }}>Group Number <span style={{ color: "#f87171" }}>*</span></label>
                  <input type="text" value={groupNumber} onChange={(e) => { setGroupNumber(e.target.value); setManualError(""); }} placeholder="e.g. GA6085M024" style={{ width: "100%", padding: "12px 16px", borderRadius: 12, border: "2px solid #e2e8f0", fontFamily: "monospace", fontSize: "0.875rem" }} />
                </div>

                {manualError && (
                  <p style={{ fontSize: "0.875rem", color: "#dc2626", display: "flex", alignItems: "center", gap: 6 }}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M12 4a8 8 0 100 16 8 8 0 000-16z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                    {manualError}
                  </p>
                )}
              </div>

              <p style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: 16, display: "flex", alignItems: "flex-start", gap: 6 }}>
                <svg style={{ flexShrink: 0, marginTop: 2 }} width="13" height="13" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
                Member ID and Group Number are on the front of your insurance card.
              </p>

              <button
                className="btn-primary"
                onClick={handleManualSubmit}
                style={{ width: "100%", justifyContent: "center", marginTop: 20, background: "linear-gradient(90deg, #2563eb, #10b981)" }}
              >
                Save
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} /></svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
