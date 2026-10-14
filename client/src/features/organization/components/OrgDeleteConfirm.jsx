// ─────────────────────────────────────────────────────────
//  features/organization/components/OrgDeleteConfirm.jsx
//
//  Shared delete confirmation for organization rows. The server
//  refuses deletes that are still referenced (school with
//  departments, department with categories…) — when it does, the
//  reason is shown AS the dialog body with a Close action, so the
//  operator learns why instead of a silent failure.
// ─────────────────────────────────────────────────────────

import ConfirmationModal from "../../../components/ConfirmationModal";

export default function OrgDeleteConfirm({
  deleting,
  title,
  message,
  error,
  onConfirm,
  onCancel,
}) {
  const open = Boolean(deleting);
  const refuseMessage = Boolean(error);

  return (
    <ConfirmationModal
      isOpen={open}
      title={title}
      message={refuseMessage ? error : message}
      confirmText={refuseMessage ? "Close" : "Delete"}
      type="danger"
      onConfirm={() => {
        if (refuseMessage) onCancel();
        else onConfirm();
      }}
      onCancel={onCancel}
    />
  );
}
