/**
 * features/landing/components/CopiesBlock.jsx
 *
 * Physical-copies list for the detail panel. Extracted from the in-file
 * `CopiesBlock` (declared inside the component body) of the former
 * landing/landingpage.jsx.
 */

import { useState, useEffect } from "react";
import CopyStatusPill from "./CopyStatusPill";
import { fetchPublicCopies } from "../api/publicSearchApi";
import { sortCopies } from "../utils/bookDisplay";

export default function CopiesBlock({ bookId }) {
  const [copies, setCopies]   = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bookId) {
      setCopies([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetchPublicCopies(bookId)
      .then(d => {
        if (d.success) {
          setCopies(d.data || []);
        } else {
          console.warn("Failed to load copies:", d.error);
          setCopies([]);
        }
      })
      .catch(() => setCopies([]))
      .finally(() => setLoading(false));
  }, [bookId]);

  if (loading) {
    return (
      <div className="col-span-2 flex items-center justify-center py-6 text-[13px]" style={{ color: "var(--warm-gray)" }}>
        Loading copies…
      </div>
    );
  }

  if (copies.length === 0) {
    return (
      <div className="col-span-2 flex items-center justify-center py-6 text-[13px]" style={{ color: "var(--warm-gray)" }}>
        No physical copies recorded
      </div>
    );
  }

  const sortedCopies = sortCopies(copies);

  return (
    <div className="col-span-2 flex flex-col gap-2 p-4 rounded-xl border" style={{ background: "var(--white)", borderColor: "#e8e0d5" }}>
      <div className="flex items-center gap-2 text-[12px] font-semibold" style={{ color: "var(--navyblue)" }}>
        <span>📚</span> Physical Copies ({copies.length})
      </div>
      <div className="space-y-1.5 max-h-40 overflow-y-auto">
        {sortedCopies.map(copy => (
          <div key={copy.id || copy.accession_number} className="flex items-center justify-between px-3 py-2 rounded-lg text-[13px]"
               style={{ background: "rgba(248,250,252,0.7)", border: "1px solid #e2e8f0" }}>
            <div className="flex items-center gap-2 font-mono font-semibold" style={{ color: "var(--navyblue)" }}>
              <span style={{ color: "#d97706", fontSize: "0.85em" }}>🏷️</span>
              {copy.accession_number}
              {copy.date_acquired && (
                <span style={{ color: "var(--warm-gray)", fontSize: "0.8em" }}>
                  · {new Date(copy.date_acquired).getFullYear()}
                </span>
              )}
            </div>
            <CopyStatusPill status={copy.status} />
          </div>
        ))}
      </div>
    </div>
  );
}
