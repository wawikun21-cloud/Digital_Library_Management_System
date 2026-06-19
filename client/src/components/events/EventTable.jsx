import { Calendar, Tag, Image as ImageIcon } from "lucide-react";

export default function EventTable({ events, onView, onEdit, onDelete }) {
  if (!events || events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 bg-surface rounded-2xl border border-dashed border-border">
        <ImageIcon size={48} className="text-muted mb-3 opacity-20" />
        <p className="text-sm font-medium text-secondary">No events found.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--bg-surface)" }}>
      <table className="w-full min-w-[640px]">
        <thead>
          <tr style={{ background: "var(--bg-subtle)", borderBottom: "1.5px solid var(--border-light)" }}>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Image
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Title
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Date
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Category
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Status
            </th>
            <th className="px-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {events.map((ev) => (
            <tr
              key={ev.id}
              className="group transition-colors hover:bg-[var(--bg-subtle)]"
              style={{ borderBottom: "1px solid var(--border-light)" }}
            >
              {/* Image */}
              <td className="px-4 py-3 align-top">
                {ev.image ? (
                  <img src={ev.image} alt={ev.title} className="w-16 h-12 object-cover rounded-lg border" style={{ borderColor: "var(--border)" }} />
                ) : (
                  <div className="w-16 h-12 flex items-center justify-center rounded-lg" style={{ background: "var(--bg-subtle)", color: "var(--text-muted)" }}>
                    <ImageIcon size={20} />
                  </div>
                )}
              </td>
              {/* Title */}
              <td className="px-4 py-3 align-top">
                <p className="text-[13px] font-semibold truncate max-w-[200px]" style={{ color: "var(--text-primary)" }}>
                  {ev.title}
                </p>
                {ev.description && (
                  <p className="text-[11px] mt-1 line-clamp-2" style={{ color: "var(--text-secondary)" }}>
                    {ev.description}
                  </p>
                )}
              </td>
              {/* Date */}
              <td className="px-4 py-3 align-top">
                <div className="flex items-center gap-1.5 text-[12px]" style={{ color: "var(--text-secondary)" }}>
                  <Calendar size={12} />
                  {ev.event_date}
                </div>
              </td>
              {/* Category */}
              <td className="px-4 py-3 align-top">
                {ev.category ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: "rgba(245,158,11,0.1)", color: "#d97706" }}>
                    <Tag size={10} />
                    {ev.category}
                  </span>
                ) : (
                  <span className="text-[12px]" style={{ color: "var(--text-muted)" }}>—</span>
                )}
              </td>
              {/* Status */}
              <td className="px-4 py-3 align-top">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                    ev.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}
                >
                  {ev.status || "Active"}
                </span>
              </td>
              {/* Actions */}
              <td className="px-4 py-3 align-top text-right">
                <div className="flex items-center justify-end gap-1.5">
                  <button
                    onClick={() => onView(ev)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors hover:bg-amber-50"
                    style={{ color: "var(--accent-amber)" }}
                    title="View"
                  >
                    View
                  </button>
                  <button
                    onClick={() => onEdit(ev)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-colors hover:bg-amber-50"
                    style={{ color: "var(--accent-amber)" }}
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => onDelete(ev)}
                    className="px-2.5 py-1 rounded-lg text-[10px] font-semibold text-red-600 transition-colors hover:bg-red-50"
                    title="Delete"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
