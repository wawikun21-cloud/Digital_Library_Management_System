import { X } from "lucide-react";

export default function Modal({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(10,22,34,0.6)", backdropFilter: "blur(3px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onClose) onClose();
      }}
    >
      <div
        className={`w-full ${maxWidth} rounded-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]`}
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        {title && (
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ borderBottom: "1px solid var(--border-light)" }}
          >
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {title}
            </h2>
            {onClose && (
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors duration-150"
                style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(238,162,58,0.15)";
                  e.currentTarget.style.color = "#EEA23A";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--bg-hover)";
                  e.currentTarget.style.color = "var(--text-secondary)";
                }}
              >
                <X size={18} />
              </button>
            )}
          </div>
        )}
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
