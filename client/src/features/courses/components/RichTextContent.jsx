import { sanitizeRichTextHtml } from "../utils/richText";

export default function RichTextContent({ value, className = "" }) {
  if (!value) return <span>—</span>;

  return (
    <div
      className={`course-rich-text-content ${className}`}
      dangerouslySetInnerHTML={{ __html: sanitizeRichTextHtml(value) }}
    />
  );
}
