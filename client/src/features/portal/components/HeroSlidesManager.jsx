import { useState } from "react";
import { ImagePlus, Plus } from "lucide-react";
import ConfirmationModal from "../../../components/ConfirmationModal";
import Toast from "../../../components/Toast";
import { useToast } from "../../../hooks/useToast";
import { useAuth } from "../../../hooks/useAuth";
import { useHeroSlides } from "../hooks/useHeroSlides";
import HeroSlideModal from "./HeroSlideModal";
import HeroSlideRow from "./HeroSlideRow";

export default function HeroSlidesManager() {
  const { slides, maxSlides, loading, error, busyId, canAdd, reload, create, update, toggleActive, remove, move } = useHeroSlides();
  const { toast, showToast, hideToast } = useToast();
  const [modal, setModal] = useState({ open: false, slide: null });
  const [pendingDelete, setPendingDelete] = useState(null);

  // ── Per-action permission gates (server enforces the same) ──
  const { hasPermissionAction } = useAuth();
  const canCreate  = hasPermissionAction("manage_settings", "create");
  const canEdit    = hasPermissionAction("manage_settings", "edit");
  const canDelete  = hasPermissionAction("manage_settings", "delete");
  const canReorder = hasPermissionAction("manage_settings", "reorder");

  const run = async (action, successMessage) => {
    try {
      await action();
      if (successMessage) showToast(successMessage, "success");
    } catch (err) {
      showToast(err.message || "Something went wrong.", "error");
    }
  };

  const handleSubmit = async (formData) => {
    if (modal.slide) await update(modal.slide.id, formData);
    else await create(formData);
    showToast(modal.slide ? "Slide updated" : "Slide added", "success");
  };

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold" style={{ color: "var(--text-primary)" }}>Hero carousel</h2>
          <p className="mt-0.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Slides appear at the top of the Student Portal in the order shown here. {slides.length} of {maxSlides} used.
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={() => setModal({ open: true, slide: null })}
            disabled={!canAdd}
            title={canAdd ? undefined : `Limit of ${maxSlides} slides reached`}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            style={{ background: "var(--accent-amber)" }}
          >
            <Plus size={16} /> Add slide
          </button>
        )}
      </div>

      {loading && <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>Loading slides…</p>}

      {!loading && error && (
        <div role="alert" className="flex items-center justify-between gap-3 rounded-xl border p-4 text-[13px]"
          style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
          {error}
          <button type="button" onClick={reload} className="font-semibold" style={{ color: "var(--accent-amber)" }}>Try again</button>
        </div>
      )}

      {!loading && !error && slides.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed px-6 py-10 text-center"
          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
          <ImagePlus size={28} />
          <p className="text-[13px] font-medium" style={{ color: "var(--text-primary)" }}>No slides yet</p>
          <p className="text-[12px]">Students see a default welcome banner until you add a slide.</p>
        </div>
      )}

      {!loading && !error && slides.length > 0 && (
        <ul className="flex flex-col gap-2">
          {slides.map((slide, index) => (
            <HeroSlideRow
              key={slide.id}
              slide={slide}
              index={index}
              total={slides.length}
              busy={busyId === slide.id}
              onMove={canReorder ? (id, dir) => run(() => move(id, dir)) : undefined}
              onToggle={canEdit ? (s) => run(() => toggleActive(s), s.is_active ? "Slide hidden" : "Slide visible") : undefined}
              onEdit={canEdit ? (s) => setModal({ open: true, slide: s }) : undefined}
              onDelete={canDelete ? setPendingDelete : undefined}
            />
          ))}
        </ul>
      )}

      <HeroSlideModal
        isOpen={modal.open}
        slide={modal.slide}
        onClose={() => setModal({ open: false, slide: null })}
        onSubmit={handleSubmit}
      />

      <ConfirmationModal
        isOpen={Boolean(pendingDelete)}
        title="Delete this slide?"
        message={pendingDelete ? `"${pendingDelete.title}" and its image will be removed permanently.` : ""}
        confirmText="Delete slide"
        type="danger"
        onCancel={() => setPendingDelete(null)}
        onConfirm={async () => {
          const target = pendingDelete;
          setPendingDelete(null);
          await run(() => remove(target.id), "Slide deleted");
        }}
      />

      <Toast message={toast.message} type={toast.type} isVisible={toast.visible} onClose={hideToast} />
    </section>
  );
}
