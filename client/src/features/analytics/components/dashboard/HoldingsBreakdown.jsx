/**
 * features/analytics/components/dashboard/HoldingsBreakdown.jsx
 *
 * Holdings breakdown table (NEMCO vs LEXORA per program/category).
 * Extracted from the former pages/Dashboard.jsx (was `HoldingsBreakdown`).
 */

import { memo } from "react";
import { BookOpen, Library } from "lucide-react";
import { NEMCO_COLOR, LEXORA_COLOR } from "../../constants/dashboardPalette";
import ChartError from "../chart/ChartError";
import SkeletonRows from "../chart/SkeletonRows";

// FIX F: default data=[]
const HoldingsBreakdown = memo(function HoldingsBreakdown({ data = [], loading, error }) {
  const safeData    = Array.isArray(data) ? data : [];
  const totalNemco  = safeData.reduce((s, r) => s + (r.nemco  ?? 0), 0);
  const totalLexora = safeData.reduce((s, r) => s + (r.lexora ?? 0), 0);
  const grandTotal  = totalNemco + totalLexora;

  return (
    <div className="rounded-2xl overflow-hidden"
      style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "var(--shadow-sm)" }}>

      {/* Header */}
      <div className="px-5 py-3.5 flex items-center justify-between flex-wrap gap-3"
        style={{ borderBottom: "2px solid var(--border)" }}>
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(19,47,69,0.1)" }}>
            <Library size={13} style={{ color: NEMCO_COLOR }} />
          </div>
           <h2 className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--text-secondary)" }}>
             Holdings Breakdown by Program / Category
           </h2>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(19,47,69,0.05)", border: "1px solid rgba(19,47,69,0.1)" }}>
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Grand Total</span>
            <span className="text-[13px] font-extrabold tabular-nums" style={{ color: "var(--text-primary)" }}>
              {grandTotal.toLocaleString()}
            </span>
          </div>
          <div className="w-px h-5 flex-shrink-0" style={{ background: "var(--border-light)" }} />
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(19,47,69,0.07)", border: "1px solid rgba(19,47,69,0.14)" }}>
            <BookOpen size={11} style={{ color: NEMCO_COLOR }} />
             <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: NEMCO_COLOR }}>SCHOOL</span>
             <span className="text-[12px] font-extrabold tabular-nums" style={{ color: NEMCO_COLOR }}>
               {totalNemco.toLocaleString()}
             </span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
            style={{ background: "rgba(50,102,127,0.08)", border: "1px solid rgba(50,102,127,0.18)" }}>
            <Library size={11} style={{ color: LEXORA_COLOR }} />
            <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: LEXORA_COLOR }}>LEXORA</span>
            <span className="text-[13px] font-extrabold tabular-nums" style={{ color: LEXORA_COLOR }}>
              {totalLexora.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Table */}
      {error ? (
        <ChartError message={error} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-subtle)" }}>
                <th className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)", width: 42, borderBottom: "2px solid var(--border)" }}>#</th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)", borderBottom: "2px solid var(--border)" }}>Program / Category</th>
                <th colSpan={2} className="py-0 text-center text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: NEMCO_COLOR, borderBottom: "2px solid var(--border)", borderLeft: `2px solid ${NEMCO_COLOR}22` }}>
                  <div className="flex items-center justify-center gap-1.5 px-4 py-3"
                    style={{ borderBottom: `3px solid ${NEMCO_COLOR}` }}>
                    <BookOpen size={11} /> SCHOOL
                  </div>
                </th>
                <th colSpan={2} className="py-0 text-center text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: LEXORA_COLOR, borderBottom: "2px solid var(--border)", borderLeft: `2px solid ${LEXORA_COLOR}22` }}>
                  <div className="flex items-center justify-center gap-1.5 px-4 py-3"
                    style={{ borderBottom: `3px solid ${LEXORA_COLOR}` }}>
                    <Library size={11} /> LEXORA
                  </div>
                </th>
                <th className="px-5 py-3 text-right text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--text-muted)", borderBottom: "2px solid var(--border)", borderLeft: "1px solid var(--border-light)" }}>Total</th>
              </tr>
              <tr style={{ background: "var(--bg-subtle)" }}>
                <th style={{ borderBottom: "1px solid var(--border-light)" }} />
                <th style={{ borderBottom: "1px solid var(--border-light)" }} />
                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-center"
                  style={{ color: NEMCO_COLOR, opacity: 0.75, borderBottom: "1px solid var(--border-light)", borderLeft: `2px solid ${NEMCO_COLOR}22` }}>Count</th>
                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-center"
                  style={{ color: NEMCO_COLOR, opacity: 0.75, borderBottom: "1px solid var(--border-light)" }}>Share</th>
                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-center"
                  style={{ color: LEXORA_COLOR, opacity: 0.75, borderBottom: "1px solid var(--border-light)", borderLeft: `2px solid ${LEXORA_COLOR}22` }}>Count</th>
                <th className="px-4 py-2 text-[9px] font-bold uppercase tracking-widest text-center"
                  style={{ color: LEXORA_COLOR, opacity: 0.75, borderBottom: "1px solid var(--border-light)" }}>Share</th>
                <th style={{ borderBottom: "1px solid var(--border-light)", borderLeft: "1px solid var(--border-light)" }} />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <SkeletonRows />
              ) : safeData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-[12px]" style={{ color: "var(--text-muted)" }}>
                    No holdings data available
                  </td>
                </tr>
              ) : (
                safeData.map((row, idx) => {
                  const rowTotal    = (row.nemco ?? 0) + (row.lexora ?? 0);
                  const nemcoShare  = rowTotal > 0 ? (((row.nemco ?? 0) / rowTotal) * 100).toFixed(1) : "0.0";
                  const lexoraShare = rowTotal > 0 ? (((row.lexora ?? 0) / rowTotal) * 100).toFixed(1) : "0.0";
                  const isEven      = idx % 2 === 0;

                  return (
                    <tr key={row.category}
                      style={{ background: isEven ? "var(--bg-surface)" : "var(--bg-subtle)", transition: "background 0.12s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                      onMouseLeave={e => (e.currentTarget.style.background = isEven ? "var(--bg-surface)" : "var(--bg-subtle)")}>
                      <td className="px-5 py-3.5 text-[11px] font-semibold tabular-nums"
                        style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border-light)" }}>{idx + 1}</td>
                      <td className="px-4 py-3.5" style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold uppercase tracking-wide"
                          style={{ background: "rgba(50,102,127,0.08)", color: "var(--text-primary)", border: "1px solid rgba(50,102,127,0.14)" }}>
                          {row.category}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center"
                        style={{ borderBottom: "1px solid var(--border-light)", borderLeft: `2px solid ${NEMCO_COLOR}22` }}>
                        <span className="inline-block px-3 py-1 rounded-lg text-[12px] font-extrabold tabular-nums"
                          style={{ background: (row.nemco ?? 0) > 0 ? "rgba(19,47,69,0.07)" : "transparent", color: (row.nemco ?? 0) > 0 ? NEMCO_COLOR : "var(--text-muted)" }}>
                          {(row.nemco ?? 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center" style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <span className="text-[11px] font-semibold tabular-nums"
                          style={{ color: (row.nemco ?? 0) > 0 ? NEMCO_COLOR : "var(--text-muted)", opacity: (row.nemco ?? 0) > 0 ? 0.75 : 0.4 }}>
                          {nemcoShare}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center"
                        style={{ borderBottom: "1px solid var(--border-light)", borderLeft: `2px solid ${LEXORA_COLOR}22` }}>
                        <span className="inline-block px-3 py-1 rounded-lg text-[12px] font-extrabold tabular-nums"
                          style={{ background: (row.lexora ?? 0) > 0 ? "rgba(50,102,127,0.08)" : "transparent", color: (row.lexora ?? 0) > 0 ? LEXORA_COLOR : "var(--text-muted)" }}>
                          {(row.lexora ?? 0).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center" style={{ borderBottom: "1px solid var(--border-light)" }}>
                        <span className="text-[11px] font-semibold tabular-nums"
                          style={{ color: (row.lexora ?? 0) > 0 ? LEXORA_COLOR : "var(--text-muted)", opacity: (row.lexora ?? 0) > 0 ? 0.75 : 0.4 }}>
                          {lexoraShare}%
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right"
                        style={{ borderBottom: "1px solid var(--border-light)", borderLeft: "1px solid var(--border-light)" }}>
                        <span className="text-[12px] font-extrabold tabular-nums" style={{ color: "var(--text-primary)" }}>
                          {rowTotal.toLocaleString()}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {!loading && safeData.length > 0 && (
              <tfoot>
                <tr style={{ background: "var(--bg-subtle)" }}>
                  <td style={{ borderTop: "2px solid var(--border)" }} />
                  <td className="px-4 py-3.5 text-[11px] font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-secondary)", borderTop: "2px solid var(--border)" }}>Grand Total</td>
                  <td className="px-4 py-3.5 text-center"
                    style={{ borderTop: "2px solid var(--border)", borderLeft: `2px solid ${NEMCO_COLOR}22` }}>
                    <span className="inline-block px-3 py-1 rounded-lg text-[12px] font-extrabold tabular-nums"
                      style={{ background: "rgba(19,47,69,0.1)", color: NEMCO_COLOR }}>
                      {totalNemco.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center" style={{ borderTop: "2px solid var(--border)" }}>
                    <span className="text-[11px] font-semibold tabular-nums" style={{ color: NEMCO_COLOR, opacity: 0.75 }}>
                      {grandTotal > 0 ? ((totalNemco / grandTotal) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center"
                    style={{ borderTop: "2px solid var(--border)", borderLeft: `2px solid ${LEXORA_COLOR}22` }}>
                    <span className="inline-block px-3 py-1 rounded-lg text-[12px] font-extrabold tabular-nums"
                      style={{ background: "rgba(50,102,127,0.1)", color: LEXORA_COLOR }}>
                      {totalLexora.toLocaleString()}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center" style={{ borderTop: "2px solid var(--border)" }}>
                     <span className="text-[10px] font-semibold tabular-nums" style={{ color: LEXORA_COLOR, opacity: 0.75 }}>
                      {grandTotal > 0 ? ((totalLexora / grandTotal) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right"
                    style={{ borderTop: "2px solid var(--border)", borderLeft: "1px solid var(--border-light)" }}>
                         <span className="text-[12px] font-extrabold tabular-nums" style={{ color: "var(--text-primary)" }}>
                      {grandTotal.toLocaleString()}
                    </span>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
});

export default HoldingsBreakdown;
