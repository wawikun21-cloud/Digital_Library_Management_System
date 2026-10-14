// ─────────────────────────────────────────────────────────
//  features/organization/hooks/useOrganizationTreeActions.js
//
//  Controller for the overview tree's inline creation: which
//  parent row has the inline row open, which parent opened the
//  full modal, and the server's refusal message. One inline row
//  at a time (starting a new one moves it). State + API calls
//  only — the page wires toast, refresh and expansion.
// ─────────────────────────────────────────────────────────

import { useState, useCallback } from "react";
import { useOrganizationMutations } from "./useOrganizationMutations";

export function useOrganizationTreeActions({ canCreate = false, onCreated } = {}) {
  const [creatingFor, setCreatingFor] = useState(null); // { kind, parentId }
  const [modal, setModal] = useState(null);             // { kind, parentId }
  const [inlineError, setInlineError] = useState("");
  const [saving, setSaving] = useState(false);

  const {
    createDepartmentUnder,
    createCategoryUnder,
  } = useOrganizationMutations();

  const startCreate = useCallback((kind, parentId) => {
    setInlineError("");
    setCreatingFor({ kind, parentId });
  }, []);

  const cancelCreate = useCallback(() => {
    setCreatingFor(null);
    setInlineError("");
  }, []);

  /** Inline confirm. Returns false and keeps the row open on refusal. */
  const submitCreate = useCallback(
    async (kind, parentId, name) => {
      setSaving(true);
      setInlineError("");
      try {
        const result =
          kind === "department"
            ? await createDepartmentUnder(parentId, name)
            : await createCategoryUnder(parentId, name);
        if (result.success) {
          setCreatingFor(null);
          onCreated?.(parentId, kind);
          return true;
        }
        setInlineError(result.error || "Failed to create");
        return false;
      } finally {
        setSaving(false);
      }
    },
    [createDepartmentUnder, createCategoryUnder, onCreated]
  );

  /** "More options" — hand off to the full modal for this parent. */
  const openModal = useCallback((kind, parentId) => {
    setCreatingFor(null);
    setInlineError("");
    setModal({ kind, parentId });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  return {
    canCreate,
    creatingFor,
    modal,
    inlineError,
    saving,
    startCreate,
    cancelCreate,
    submitCreate,
    openModal,
    closeModal,
  };
}
