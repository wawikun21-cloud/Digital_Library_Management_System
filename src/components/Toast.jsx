import { useEffect, useState } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

/**
 * Reusable Toast Component
 * @param {string} message - Toast message
 * @param {string} type - Type: "success" | "error" | "info"
 * @param {boolean} isVisible - Whether toast is visible
 * @param {function} onClose - Callback to close toast
 * @param {number} duration - Auto-close duration in ms (default: 3000)
 */
export default function Toast({ message, type = "info", isVisible, onClose, duration = 3000 }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShow(true);
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(() => {
          if (onClose) onClose();
        }, 300); // Wait for fade out animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible && !show) return null;

  const styles = {
    success: {
      bg: "#1a4a35",
      borderColor: "rgba(52, 211, 153, 0.3)",
      iconColor: "#34d399",
    },
    error: {
      bg: "#4a1a1a",
      borderColor: "rgba(248, 113, 113, 0.3)",
      iconColor: "#f87171",
    },
    info: {
      bg: "#132F45",
      borderColor: "rgba(238, 162, 58, 0.3)",
      iconColor: "#EEA23A",
    },
  };

  const currentStyle = styles[type] || styles.info;

  const icons = {
    success: <CheckCircle size={18} />,
    error: <AlertCircle size={18} />,
    info: <Info size={18} />,
  };

  return (
    <div
      className={`fixed bottom-6 right-6 z-[70] flex items-center gap-3 px-5 py-3 rounded-xl transition-all duration-300 ${
        show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
      }`}
      style={{
        background: currentStyle.bg,
        border: `1px solid ${currentStyle.borderColor}`,
        color: "#fff",
        boxShadow: "var(--shadow-xl)",
      }}
    >
      <span style={{ color: currentStyle.iconColor }}>{icons[type]}</span>
      <span className="text-[13.5px] font-medium">{message}</span>
      {onClose && (
        <button
          onClick={() => {
            setShow(false);
            setTimeout(() => onClose(), 300);
          }}
          className="ml-2 flex items-center justify-center w-6 h-6 rounded-lg transition-colors duration-150"
          style={{ background: "rgba(255,255,255,0.1)" }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.2)")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

/**
 * Hook for managing toast state
 * @returns {object} - { showToast, toastConfig }
 */
export function useToast() {
  const [toast, setToast] = useState({ visible: false, message: "", type: "info" });

  const showToast = (message, type = "info") => {
    setToast({ visible: true, message, type });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, visible: false }));
  };

  return { showToast, toastConfig: toast, hideToast };
}

