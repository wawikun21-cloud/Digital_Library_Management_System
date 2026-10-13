import { Field } from "./FormControls"

/**
 * Reader restrictions section of the book form.
 *
 * Presentation only: the owning form keeps the values
 * (allow_text_copy / allow_screenshot) and passes updates through
 * onChange, so LexoraBookFormModal stays untouched apart from wiring.
 * Values are stored per book and enforced in the flipbook reader.
 */
export default function LexoraBookReaderSettings({ form, onChange }) {
  const handle = (field) => (event) => onChange(field, event.target.checked)

  return (
    <div className="flex flex-col gap-4">
      <Field
        label="Allow text copying"
        id="bf-allow_text_copy"
        hint="Students can open the reader's Copy & capture panel and copy the text of the page they are reading."
      >
        <Toggle
          id="bf-allow_text_copy"
          checked={!!form.allow_text_copy}
          onChange={handle("allow_text_copy")}
        />
      </Field>

      <Field
        label="Allow screenshots"
        id="bf-allow_screenshot"
        hint="Students can save the page they are reading as a PNG image from the same panel."
      >
        <Toggle
          id="bf-allow_screenshot"
          checked={!!form.allow_screenshot}
          onChange={handle("allow_screenshot")}
        />
      </Field>

      <p className="text-[11px] leading-relaxed text-[color:var(--text-muted)]">
        These switches hide the reader's own copy and screenshot buttons for students. A determined user can
        still capture anything a browser shows, so treat them as a deterrent rather than a lock. Admins and
        librarians can always use both while managing a book.
      </p>
    </div>
  )
}

function Toggle({ id, checked, onChange }) {
  return (
    <label htmlFor={id} className="flex w-fit cursor-pointer items-center gap-2.5">
      <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <span
        aria-hidden="true"
        className={`relative h-5 w-9 rounded-full transition-colors ${
          checked ? "bg-[color:var(--accent-amber)]" : "bg-[color:var(--border)]"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${
            checked ? "left-[18px]" : "left-[2px]"
          }`}
        />
      </span>
      <span className="text-xs font-medium text-[color:var(--text-secondary)]">
        {checked ? "On" : "Off"}
      </span>
    </label>
  )
}
