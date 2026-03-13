import { X, AlertTriangle, CheckCircle } from "lucide-react";

/**
 * Reusable Confirmation Modal Component
 * @param {boolean} isOpen - Whether the modal is visible
 * @param {string} title - Modal title
 * @param {string} message - Modal message
 * @param {string} confirmText - Text for confirm button (default: "Confirm")
 * @param {string} cancelText - Text for cancel button (default: "Cancel")
 * @param {string} type - Type of modal: "danger" (red) or "success" (green) or "warning" (orange)
 * @param {function} onConfirm - Callback when confirm is clicked
 * @param {function} onCancel - Callback when cancel is clicked (optional, defaults to closing modal)
 */
export default function ConfirmationModal({
  isOpen,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  type = "danger",
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) onConfirm();
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  // Style configurations based on type
  const styles = {
    danger: {
      icon: "rgba(220,38,38,0.15)",
      iconColor: "#dc2626",
      confirmBg: "rgba(220,38,38,0.1)",
      confirmBorder: "rgba(220,38,38,0.3)",
      confirmColor: "#dc2626",
      confirmHover: "rgba(220,38,38,0.2)",
    },
    success: {
      icon: "rgba(34,197,94,0.15)",
      iconColor: "#22c55e",
      confirmBg: "rgba(34,197,94,0.1)",
      confirmBorder: "rgba(34,197,94,0.3)",
      confirmColor: "#22c55e",
      confirmHover: "rgba(34,197,94,0.2)",
    },
    warning: {
      icon: "rgba(238,162,58,0.15)",
      iconColor: "#EEA23A",
      confirmBg: "rgba(238,162,58,0.1)",
      confirmBorder: "rgba(238,162,58,0.3)",
      confirmColor: "#b87a1a",
      confirmHover: "rgba(238,162,58,0.2)",
    },
  };

  const currentStyle = styles[type] || styles.danger;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: "rgba(10,22,34,0.6)", backdropFilter: "blur(3px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget && onCancel) onCancel();
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]"
        style={{
          background: "var(--bg-surface)",
          border: "1px solid var(--border)",
          boxShadow: "var(--shadow-xl)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: "1px solid var(--border-light)" }}
        >
          <div className="flex items-center gap-2.5">
            {type === "success" ? (
              <CheckCircle size={20} style={{ color: currentStyle.iconColor }} />
            ) : (
              <AlertTriangle size={20} style={{ color: currentStyle.iconColor }} />
            )}
            <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {title}
            </h2>
          </div>
          {onCancel && (
            <button
              onClick={handleCancel}
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

        {/* Body */}
        <div className="px-6 py-5">
          <div className="flex items-start gap-4">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
              style={{ background: currentStyle.icon }}
            >
              {type === "success" ? (
                <CheckCircle size={20} style={{ color: currentStyle.iconColor }} />
              ) : (
                <AlertTriangle size={20} style={{ color: currentStyle.iconColor }} />
              )}
            </div>
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              {message}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex justify-end gap-3 px-6 py-4 shrink-0"
          style={{ borderTop: "1px solid var(--border-light)" }}
        >
          {cancelText && (
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors duration-150"
              style={{
                background: "var(--bg-surface)",
                color: "var(--text-secondary)",
                border: "1.5px solid var(--border)",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-hover)")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "var(--bg-surface)")}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="px-4 py-2.5 rounded-lg text-[13px] font-semibold transition-colors duration-150"
            style={{
              background: currentStyle.confirmBg,
              color: currentStyle.confirmColor,
              border: `1.5px solid ${currentStyle.confirmBorder}`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = currentStyle.confirmHover)}
            onMouseLeave={(e) => (e.currentTarget.style.background = currentStyle.confirmBg)}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

