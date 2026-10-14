// ─────────────────────────────────────────────────────────
//  features/organization/components/OrganizationTreeNode.jsx
//
//  Recursion shell: renders one node's row and, when expanded,
//  what lives under it —
//   • school      → its departments (+ the inline "new department" row)
//   • department  → its categories (+ the inline "new category" row)
//   • category    → the shared AssignedBooksPanel (search + assign /
//                   unassign physical & digital books)
//  Presentation only — expand state and the create controller live
//  in the page.
// ─────────────────────────────────────────────────────────

import { Building2, Tag } from "lucide-react";
import OrganizationNodeRow from "./OrganizationNodeRow";
import InlineCreateRow from "./InlineCreateRow";
import AssignedBooksPanel from "./AssignedBooksPanel";

const CHILD_KIND = { school: "department", department: "category" };
const CHILD_LABEL = { department: "Department", category: "Category" };
const CHILD_ICON = { department: Building2, category: Tag };

function childrenOf(node, kind) {
  if (kind === "school") return node.departments || [];
  if (kind === "department") return node.categories || [];
  return [];
}

export default function OrganizationTreeNode({ node, kind, parentName, expandedIds, onToggle, actions }) {
  const children = childrenOf(node, kind);
  const isOpen = expandedIds.has(node.id);
  const childKind = CHILD_KIND[kind];

  // A category always expands (its panel hosts the book picker even
  // when nothing is assigned yet); schools/departments only with children.
  const expandable = kind === "category" || children.length > 0;

  // Which parent (if any) has the inline create row open. Category
  // nodes have no childKind (they are leaves), and `creatingFor` is
  // null when nothing is being created — comparing
  // `creatingFor?.kind === childKind` alone turns into
  // `undefined === undefined` on category nodes and then dereferences
  // null, so both sides are guarded explicitly.
  const creatingFor = actions?.creatingFor ?? null;
  const isCreatingHere =
    childKind != null &&
    creatingFor != null &&
    creatingFor.kind === childKind &&
    creatingFor.parentId === node.id;

  return (
    <div>
      <OrganizationNodeRow
        kind={kind}
        node={node}
        isOpen={isOpen}
        hasChildren={expandable}
        onToggle={onToggle}
        actions={actions}
      />

      {isOpen && (
        <div className="ml-[26px] mt-1 space-y-1 border-l-2 pl-3" style={{ borderColor: "var(--border)" }}>
          {isCreatingHere && (
            <InlineCreateRow
              key={`create-${node.id}`}
              icon={CHILD_ICON[childKind]}
              label={CHILD_LABEL[childKind]}
              loading={actions.saving}
              error={actions.inlineError}
              onConfirm={(name) => actions.submitCreate(childKind, node.id, name)}
              onCancel={actions.cancelCreate}
              onMoreOptions={() => actions.openModal(childKind, node.id)}
            />
          )}

          {kind === "category" ? (
            <AssignedBooksPanel category={{ ...node, department_name: parentName }} />
          ) : (
            children.map((child) => (
              <OrganizationTreeNode
                key={child.id}
                node={child}
                kind={childKind}
                parentName={node.name}
                expandedIds={expandedIds}
                onToggle={onToggle}
                actions={actions}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
