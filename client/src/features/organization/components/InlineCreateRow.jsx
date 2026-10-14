// ─────────────────────────────────────────────────────────
//  features/organization/components/InlineCreateRow.jsx
//
//  Folder-style inline "new item" row inside the organization
//  tree (mirrors LMS-SOP's InlineCreateRow): type a name, confirm
//  with Enter/Check, cancel with Escape/X. No blur-cancel — the
//  "More options" button would lose its click to a blur first.
//  The server's refusal (e.g. duplicate department code) surfaces
//  inside the row, which then stays open for a retry.
// ─────────────────────────────────────────────────────────

import { useState, useRef, useEffect } from "react";
import { Check, X, SlidersHorizontal, Loader2, AlertCircle } from "lucide-react";

const MAX_NAME_LENGTH = 255;

export default function InlineCreateRow({
  icon: Icon,
  label = "item",
  defaultValue = "",
  loading = false,
  error = "",
  onConfirm,
  onCancel,
  onMoreOptions,
}) {
  const [name, setName] = useState(defaultValue);
  const inputRef = useRef(null);

  useEffect(() => {
    const node = inputRef.current;
    if (node) {
      node.focus();
      node.select();
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || loading) return;
    onConfirm(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-1.5 rounded-lg px-3 py-2"
      style={{ background: "var(--bg-subtle)", border: "1px solid var(--border-light)" }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
          style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
        >
          {Icon ? <Icon size={14} aria-hidden="true" /> : null}
        </span>

        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
          onKeyDown={handleKeyDown}
          disabled={loading}
          maxLength={MAX_NAME_LENGTH}
          aria-label={`${label} name`}
          placeholder={`Enter ${label.toLowerCase()} name…`}
          className="rp-field min-w-0 flex-1 px-2.5 py-1.5 text-[13px]"
        />

        {onMoreOptions && (
          <button
            type="button"
            onClick={onMoreOptions}
            disabled={loading}
            title="More options — code, description, status"
            aria-label={`More options for new ${label.toLowerCase()}`}
            className="rp-icon-btn"
          >
            <SlidersHorizontal size={13} aria-hidden="true" />
          </button>
        )}

        <button
          type="submit"
          disabled={!name.trim() || loading}
          title={`Create ${label}`}
          aria-label={`Create ${label}`}
          className="rp-icon-btn"
          style={{ color: "#2d7a47" }}
        >
          {loading ? <Loader2 size={14} className="animate-spin" aria-hidden="true" /> : <Check size={14} aria-hidden="true" />}
        </button>

        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          title="Cancel"
          aria-label={`Cancel ${label} creation`}
          className="rp-icon-btn"
        >
          <X size={14} aria-hidden="true" />
        </button>
      </div>

      {error && (
        <p
          className="flex items-center gap-1.5 pl-10 text-[11px] font-semibold"
          role="alert"
          style={{ color: "var(--accent-danger)" }}
        >
          <AlertCircle size={11} aria-hidden="true" />
          {error}
        </p>
      )}
    </form>
  );
}
