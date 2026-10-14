import { useState } from "react"
import { Loader2, Plus, Trash2, X } from "lucide-react"
import { Field, IconBtn, inputCls } from "./FormControls"

/**
 * Single-select picker for the book's resource type.
 *
 * Mirrors the ChipPicker interaction model (select, create inline, delete
 * inline) but stores one value — the type's name — because
 * lexora_books.resource_type is a single column. Selection toggles off
 * when the chosen chip is clicked again.
 *
 * A value that is no longer in the managed list (a legacy import) is
 * shown as a read-only chip so it is never silently discarded on save.
 */
export default function LexoraResourceTypePicker({
  label = "Resource type",
  id,
  types = [],
  value = "",
  onChange,
  onCreate,
  onDelete,
  creating = false,
  deletingId = "",
  error,
}) {
  const [text, setText] = useState("")
  const chosen = types.find((t) => t.name === value) || null
  const isLegacy = !!value && !chosen

  const create = async () => {
    if (!text.trim() || creating) return
    if (await onCreate(text.trim())) setText("")
  }

  const matches = types.filter((t) =>
    !value || t.name.toLowerCase().includes(text.trim().toLowerCase())
  )

  return (
    <Field label={label} id={id} error={error}
      hint="Shown as a badge on the book card. Leave empty to skip it.">
      <div className="flex min-h-[1.75rem] flex-wrap items-center gap-1.5">
        {isLegacy && (
          <span className="flex items-center gap-1 rounded-full border border-dashed px-3 py-1 text-xs font-medium"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
            {value}
            <span title="This value is no longer a managed resource type">(legacy)</span>
          </span>
        )}
        {chosen ? (
          <span className="flex items-center gap-1 rounded-full py-1 pl-3 pr-1.5 text-xs font-medium"
            style={{ background: "rgba(238,162,58,0.14)", color: "var(--accent-amber)" }}>
            <button type="button" onClick={() => onChange("")} aria-label={`Clear ${chosen.name}`}
              className="rounded-full p-0.5 hover:bg-[rgba(255,255,255,0.12)]">
              <X size={12} />
            </button>
            {chosen.name}
          </span>
        ) : (
          !isLegacy && <span className="py-1 text-xs" style={{ color: "var(--text-muted)" }}>None selected</span>
        )}
      </div>

      {types.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {matches.map((t) => {
            const on = t.name === value
            return (
              <span key={t.id}
                className={`inline-flex items-center rounded-full border transition ${
                  on ? "border-transparent" : "border-dashed"}`}
                style={on
                  ? { background: "rgba(238,162,58,0.14)", borderColor: "transparent" }
                  : { borderColor: "var(--border)" }}
              >
                <button type="button" onClick={() => onChange(on ? "" : t.name)}
                  aria-pressed={on}
                  className={`flex items-center gap-1 rounded-l-full py-1 pl-2.5 pr-1.5 text-xs transition ${
                    on ? "font-semibold text-[color:var(--accent-amber)]" : "text-[color:var(--text-secondary)] hover:text-[color:var(--accent-amber)]"
                  }`}
                >
                  {on ? <X size={11} /> : <Plus size={11} />} {t.name}
                </button>
                <IconBtn
                  label={`Delete resource type ${t.name}`}
                  danger
                  disabled={deletingId !== "" || creating}
                  onClick={() => onDelete(t)}
                >
                  {deletingId === `resource-type-${t.id}`
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Trash2 size={12} />}
                </IconBtn>
              </span>
            )
          })}
        </div>
      )}

      <div className="flex gap-2">
        <input id={id} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Search resource types or add a new one"
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); create() } }}
          className={`${inputCls()} min-w-0 flex-1`} />
        <button type="button" onClick={create} disabled={!text.trim() || creating}
          className="flex shrink-0 items-center gap-1 rounded-lg border border-[color:var(--border)] px-3 text-xs font-semibold text-[color:var(--accent-amber)] transition hover:bg-[rgba(238,162,58,0.08)] disabled:opacity-40">
          {creating ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
          Create
        </button>
      </div>
    </Field>
  )
}
