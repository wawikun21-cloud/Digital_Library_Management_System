/**
 * Compact on/off switch used across the permission grids.
 * Generic UI — nothing here knows about roles or permissions.
 */
export default function Toggle({ checked, onCheckedChange, disabled = false, size = "sm", ...rest }) {
  const track = size === "sm" ? { width: 30, height: 16 } : { width: 38, height: 20 };
  const knob = size === "sm" ? 12 : 16;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest["aria-label"] || undefined}
      disabled={disabled}
      onClick={() => !disabled && onCheckedChange?.(!checked)}
      className="relative shrink-0 rounded-full transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40"
      style={{
        ...track,
        background: checked ? "#EEA23A" : "var(--bg-hover)",
        border: `1px solid ${checked ? "#EEA23A" : "var(--border)"}`,
      }}
    >
      <span
        className="absolute top-1/2 rounded-full bg-white shadow-sm transition-all duration-150"
        style={{
          height: knob,
          width: knob,
          transform: "translateY(-50%)",
          left: checked ? `calc(100% - ${knob + 3}px)` : 3,
        }}
      />
    </button>
  );
}
