import { useEffect, useRef } from "react";
import {
  Bold,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
  Underline,
} from "lucide-react";
import { sanitizeRichTextHtml } from "../utils/richText";

const TOOLBAR_ITEMS = [
  { label: "Bold", icon: Bold, command: "bold" },
  { label: "Italic", icon: Italic, command: "italic" },
  { label: "Underline", icon: Underline, command: "underline" },
  { label: "Heading 2", icon: Heading2, command: "formatBlock", value: "h2" },
  { label: "Heading 3", icon: Heading3, command: "formatBlock", value: "h3" },
  { label: "Bulleted list", icon: List, command: "insertUnorderedList" },
  { label: "Numbered list", icon: ListOrdered, command: "insertOrderedList" },
  { label: "Quote", icon: Quote, command: "formatBlock", value: "blockquote" },
];

export default function RichTextEditor({
  value = "",
  onChange,
  placeholder = "Write something...",
  minHeight = "8rem",
  invalid = false,
}) {
  const editorRef = useRef(null);

  useEffect(() => {
    if (!editorRef.current) return;
    const sanitized = sanitizeRichTextHtml(value);
    if (editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized;
    }
  }, [value]);

  const publishChange = () => {
    if (!editorRef.current) return;
    const sanitized = sanitizeRichTextHtml(editorRef.current.innerHTML);
    if (editorRef.current.innerHTML !== sanitized) {
      editorRef.current.innerHTML = sanitized;
    }
    onChange?.(getTextContent(sanitized) ? sanitized : "");
  };

  const runCommand = (command, argument = null) => {
    editorRef.current?.focus();
    if (command === "link") {
      const href = window.prompt("Enter a link URL");
      if (!href) return;
      document.execCommand("createLink", false, href);
    } else {
      document.execCommand(command, false, argument);
    }
    publishChange();
  };

  return (
    <div className={`overflow-hidden rounded-lg border bg-white dark:bg-neutral-800 ${invalid ? "border-red-300" : "border-[var(--border)]"}`}>
      <div className="flex flex-wrap items-center gap-1 border-b border-[var(--border)] bg-neutral-50 p-1.5 dark:bg-neutral-900" role="toolbar" aria-label="Text formatting">
        {TOOLBAR_ITEMS.map(({ label, icon: Icon, command, value: commandValue }) => (
          <button
            key={label}
            type="button"
            aria-label={label}
            title={label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand(command, commandValue)}
            className="inline-flex h-8 w-8 items-center justify-center rounded text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white"
          >
            <Icon size={16} />
          </button>
        ))}
        <span className="mx-1 h-5 border-l border-neutral-300 dark:border-neutral-700" aria-hidden="true" />
        <button
          type="button"
          aria-label="Add link"
          title="Add link"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand("link")}
          className="inline-flex h-8 w-8 items-center justify-center rounded text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white"
        >
          <Link size={16} />
        </button>
        <button
          type="button"
          aria-label="Clear formatting"
          title="Clear formatting"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => runCommand("removeFormat")}
          className="inline-flex h-8 w-8 items-center justify-center rounded text-neutral-600 transition-colors hover:bg-neutral-200 hover:text-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] dark:text-neutral-300 dark:hover:bg-neutral-700 dark:hover:text-white"
        >
          <RemoveFormatting size={16} />
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label="Rich text editor"
        aria-placeholder={placeholder}
        onInput={publishChange}
        onBlur={publishChange}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.currentTarget.blur();
        }}
        data-placeholder={placeholder}
        className="course-rich-text-editor w-full overflow-y-auto px-3 py-2 text-sm text-neutral-900 outline-none dark:text-neutral-100"
        style={{ minHeight }}
      />
      <style>{`
        .course-rich-text-editor:empty::before { content: attr(data-placeholder); color: #a3a3a3; pointer-events: none; }
        .course-rich-text-editor p { margin: 0 0 0.5rem; }
        .course-rich-text-editor h2 { margin: 0.75rem 0 0.5rem; font-size: 1.125rem; font-weight: 700; }
        .course-rich-text-editor h3 { margin: 0.75rem 0 0.5rem; font-size: 1rem; font-weight: 700; }
        .course-rich-text-editor ul, .course-rich-text-editor ol { margin: 0.25rem 0; padding-left: 1.5rem; }
        .course-rich-text-editor ul { list-style: disc; }
        .course-rich-text-editor ol { list-style: decimal; }
        .course-rich-text-editor blockquote { margin: 0.5rem 0; border-left: 3px solid #9ca3af; padding-left: 0.75rem; color: #6b7280; }
        .course-rich-text-editor a { color: var(--color-primary); text-decoration: underline; }
      `}</style>
    </div>
  );
}

function getTextContent(html) {
  const parsed = new DOMParser().parseFromString(html, "text/html");
  return parsed.body.textContent?.trim() || "";
}
