import { QrCode, Loader2, CheckCircle2, AlertCircle, X } from "lucide-react";

export default function BookAddScan({
  scanActive, scanStatus, scanFeedback,
  videoRef,
  cameras, activeCamIdx,
  setActiveCamIdx,
  stopScanner, startScanner,
  manualIsbn, setManualIsbn,
  fetchByIsbn
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl"
        style={{ background:"rgba(184,122,0,0.08)", border:"1.5px solid rgba(184,122,0,0.2)" }}>
        <QrCode size={18} style={{ color:"var(--accent-amber)", flexShrink:0, marginTop:1 }} />
        <div>
          <p className="text-[13px] font-semibold mb-0.5" style={{ color:"var(--text-primary)" }}>
            Barcode / ISBN Scanner
          </p>
          <p className="text-[12px]" style={{ color:"var(--text-secondary)" }}>
            Point your camera at the book's barcode (back cover). Fields fill automatically on detection.
          </p>
        </div>
      </div>

      {/* Camera viewfinder */}
      <div className="relative w-full rounded-xl overflow-hidden shadow-inner"
        style={{ aspectRatio:"4/3", background:"#0a1622", border:"1.5px solid var(--border)" }}>

        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ display: scanActive ? "block" : "none" }}
          muted
          playsInline
        />

        {/* Overlay when not scanning */}
        {!scanActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <QrCode size={48} className="opacity-20 text-amber-500" />
            <p className="text-[13px] text-white/30 font-medium">
              {scanStatus === "found" ? "Scan successful" : "Camera inactive"}
            </p>
          </div>
        )}

        {/* Scan-line animation while active */}
        {scanActive && (
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner brackets */}
            {[["top-4 left-4","border-t-2 border-l-2"],
              ["top-4 right-4","border-t-2 border-r-2"],
              ["bottom-4 left-4","border-b-2 border-l-2"],
              ["bottom-4 right-4","border-b-2 border-r-2"]
            ].map(([pos, bdr], i) => (
              <div key={i} className={`absolute ${pos} ${bdr} w-8 h-8 rounded-sm`}
                style={{ borderColor:"var(--accent-amber)" }} />
            ))}
            {/* Animated scan line */}
            <div className="absolute left-6 right-6 h-[2px]"
              style={{
                background: "linear-gradient(90deg, transparent, var(--accent-amber), transparent)",
                animation: "scanline 2s ease-in-out infinite",
                top: "50%",
                boxShadow: "0 0 10px var(--accent-amber)"
              }} />
          </div>
        )}

        {/* Camera switch button */}
        {scanActive && cameras.length > 1 && (
          <button
            onClick={() => setActiveCamIdx((activeCamIdx + 1) % cameras.length)}
            className="absolute bottom-3 right-3 flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-bold bg-black/60 text-white backdrop-blur-md border border-white/10 hover:bg-black/80 transition-colors"
          >
            Switch Camera
          </button>
        )}
      </div>

      {/* Status feedback */}
      {scanStatus !== "idle" && (
        <div className="flex items-center gap-2 px-3 py-3 rounded-xl text-[12.5px] font-medium transition-all duration-200"
          style={{
            background: scanStatus === "found"    ? "rgba(45,122,71,0.08)"
                      : scanStatus === "error"    ? "rgba(204,31,31,0.08)"
                      : "rgba(50,102,127,0.08)",
            border: `1.5px solid ${
                      scanStatus === "found"    ? "rgba(45,122,71,0.2)"
                      : scanStatus === "error"  ? "rgba(204,31,31,0.25)"
                      : "rgba(50,102,127,0.2)"}`,
            color:    scanStatus === "found"    ? "#2d7a47"
                    : scanStatus === "error"    ? "#cc1f1f"
                    : "#32667F",
          }}>
          {scanStatus === "found"    && <CheckCircle2 size={16} />}
          {scanStatus === "error"    && <AlertCircle  size={16} />}
          {(scanStatus === "fetching" || scanStatus === "scanning") && <Loader2 size={16} className="animate-spin" />}
          <span>{scanFeedback}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex gap-2">
        {!scanActive ? (
          <button
            onClick={startScanner}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold text-white transition-all duration-150 shadow-md shadow-amber-500/20"
            style={{ background:"var(--accent-amber)" }}
          >
            <QrCode size={16} /> Start Scanning
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150 border-[1.5px] border-border bg-subtle text-secondary"
          >
            <X size={16} /> Stop Camera
          </button>
        )}
      </div>

      <div className="flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-border-light" />
        <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted">or enter ISBN manually</span>
        <div className="flex-1 h-px bg-border-light" />
      </div>

      {/* Manual ISBN input */}
      <div className="flex gap-2">
        <input
          className="flex-1 px-3 py-2.5 rounded-lg text-[13px] border-[1.5px] border-border outline-none transition-all duration-150 focus:border-amber-500"
          style={{ background:"var(--bg-input)", color:"var(--text-primary)" }}
          placeholder="e.g. 978-0132350884"
          value={manualIsbn}
          onChange={e => setManualIsbn(e.target.value)}
          onKeyDown={e => e.key === "Enter" && fetchByIsbn(manualIsbn)}
          aria-label="Manual ISBN input"
        />
        <button
          onClick={() => fetchByIsbn(manualIsbn)}
          disabled={scanStatus === "fetching" || !manualIsbn.trim()}
          className="px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-150"
          style={{
            background: (!manualIsbn.trim() || scanStatus === "fetching") ? "var(--bg-subtle)" : "var(--accent-amber)",
            color:      (!manualIsbn.trim() || scanStatus === "fetching") ? "var(--text-muted)" : "#fff",
          }}
        >
          {scanStatus === "fetching" ? <Loader2 size={16} className="animate-spin" /> : "Look up"}
        </button>
      </div>

      <style>{`
        @keyframes scanline {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(100%); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
