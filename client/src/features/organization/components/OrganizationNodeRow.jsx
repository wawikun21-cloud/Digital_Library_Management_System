// ─────────────────────────────────────────────────────────
//  features/organization/components/OrganizationNodeRow.jsx
//
//  One tree row. Presentation only — counts come from the hierarchy
//  payload (books per category, categories per department) and the
//  actions are the inline-create + button (schools create
//  departments, departments create categories; gated on
//  manage_organization:create) and a link into the matching
//  management page. Inline rows and modals are owned by the page.
// ─────────────────────────────────────────────────────────

import { Link } from "react-router-dom";
import { ChevronDown, School, Building2, Tag, BookOpen, Globe, Plus } from "lucide-react";
import { countSchoolCategories } from "../utils/hierarchyFilter";

const KIND_CONFIG = {
  school: { icon: School },
  department: { icon: Building2 },
  category: { icon: Tag },
};

/** What a row's + button creates (categories are leaves — books go in the panel). */
const CHILD_CREATION = { school: "department", department: "category" };

function Count({ children }) {
  return (
    <span className="shrink-0 text-[11px] tabular-nums" style={{ color: "var(--text-muted)" }}>
      {children}
    </span>
  );
}

function CategoryCounts({ category }) {
  return (
    <span className="flex shrink-0 items-center gap-2.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
      <span className="flex items-center gap-1 tabular-nums" title="Physical books assigned">
        <BookOpen size={12} aria-hidden="true" />
        {category.book_count ?? 0}
      </span>
      <span className="flex items-center gap-1 tabular-nums" title="Digital books assigned">
        <Globe size={12} aria-hidden="true" />
        {category.lexora_book_count ?? 0}
      </span>
    </span>
  );
}

export default function OrganizationNodeRow({ kind, node, isOpen, hasChildren, onToggle, actions }) {
  const { icon: Icon } = KIND_CONFIG[kind];
  const inactive =
    (kind === "school" && node.status === "inactive") ||
    (kind !== "school" && node.is_active === 0);

  const manageTo =
    kind === "school"
      ? `/dashboard/organization/departments?school_id=${node.id}`
      : kind === "department"
      ? `/dashboard/organization/categories?department_id=${node.id}`
      : `/dashboard/organization/categories?category_id=${node.id}`;

  const manageLabel =
    kind === "school" ? "Departments" : kind === "department" ? "Categories" : "Manage books";

  const creationKind = CHILD_CREATION[kind];

  const handlePlus = (e) => {
    e.stopPropagation();
    if (!creationKind) return;
    if (!isOpen) onToggle(node.id); // mirror LMS-SOP: + opens the parent
    actions.startCreate(creationKind, node.id);
  };

  const rowContent = (
    <>
      {hasChildren ? (
        <ChevronDown
          size={15}
          className="shrink-0 transition-transform"
          style={{ color: "var(--text-muted)", transform: isOpen ? "none" : "rotate(-90deg)" }}
        />
      ) : (
        <span className="w-[15px] shrink-0" />
      )}

      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md"
        style={{ background: "var(--bg-hover)", color: "var(--text-secondary)" }}
      >
        <Icon size={14} aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold" style={{ color: "var(--text-primary)" }}>
        {node.name}
      </span>

      {node.code && (
        <span
          className="hidden shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] sm:inline"
          style={{ background: "var(--bg-hover)", color: "var(--text-muted)" }}
        >
          {node.code}
        </span>
      )}

      {inactive && <span className="rp-badge rp-badge--off shrink-0">Inactive</span>}

      {kind === "school" && (
        <>
          <Count>{(node.departments?.length || 0)} dept</Count>
          <Count>{countSchoolCategories(node)} categories</Count>
        </>
      )}
      {kind === "department" && <Count>{(node.categories?.length || 0)} categories</Count>}
      {kind === "category" && <CategoryCounts category={node} />}

      <Link
        to={manageTo}
        onClick={(e) => e.stopPropagation()}
        className="rp-link-btn shrink-0 text-[11px]"
      >
        {manageLabel}
      </Link>

      {actions?.canCreate && creationKind && (
        <button
          type="button"
          onClick={handlePlus}
          title={`New ${creationKind === "department" ? "Department" : "Category"}`}
          aria-label={`New ${creationKind === "department" ? "Department" : "Category"} under ${node.name}`}
          className="rp-icon-btn shrink-0"
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      )}
    </>
  );

  // A role="button" container (not a real <button>) so the row's own
  // + button and Manage link stay valid, non-nested interactive
  // elements — same pattern as the rest of the tree UIs.
  if (!hasChildren) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ color: "var(--text-primary)" }}>
        {rowContent}
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onToggle(node.id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle(node.id);
        }
      }}
      aria-expanded={isOpen}
      className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-transparent px-3 py-2 text-left transition-colors hover:border-[var(--border)] hover:bg-[var(--bg-hover)]"
      style={isOpen ? { borderColor: "var(--border)", background: "var(--bg-hover)" } : undefined}
    >
      {rowContent}
    </div>
  );
}
