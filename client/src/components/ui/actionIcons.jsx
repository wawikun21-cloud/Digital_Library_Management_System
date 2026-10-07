import { useState } from "react";

const ACTION_STYLES = {
  View: {
    icon: "👁️",
    color: "var(--text-secondary)",
    hoverBg: "var(--bg-hover)",
    hoverColor: "var(--text-primary)",
  },
  Edit: {
    icon: "✏️",
    color: "var(--text-secondary)",
    hoverBg: "var(--bg-hover)",
    hoverColor: "#EEA23A",
  },
  Archive: {
    icon: "🗄️",
    color: "var(--text-secondary)",
    hoverBg: "var(--bg-hover)",
    hoverColor: "#EEA23A",
  },
  Delete: {
    icon: "🗑️",
    color: "var(--text-secondary)",
    hoverBg: "rgba(220,38,38,0.1)",
    hoverColor: "#dc2626",
  },
  Unarchive: {
    icon: "📤",
    color: "var(--text-secondary)",
    hoverBg: "var(--bg-hover)",
    hoverColor: "#22c55e",
  },
};

export function ActionButton({ action, label, onClick }) {
  const [hovered, setHovered] = useState(false);
  const style = ACTION_STYLES[action] || ACTION_STYLES.View;

  return (
    <button
      title={label}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors duration-150"
      style={{
        background: hovered ? style.hoverBg : "transparent",
        color: hovered ? style.hoverColor : style.color,
      }}
    >
      <span className="text-sm">{style.icon}</span>
    </button>
  );
}
