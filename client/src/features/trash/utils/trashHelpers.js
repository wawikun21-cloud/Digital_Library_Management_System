export function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function filterAndSort(items, query, filterType, sortBy) {
  const q = query.toLowerCase().trim();
  let result = items.filter(item => {
    const meta  = item.entity_meta || {};
    const title = (item.entity_title || "").toLowerCase();
    const sub   = (meta.subtitle || meta.author || "").toLowerCase();
    const matchQ = !q || title.includes(q) || sub.includes(q);
    const matchT = filterType === "all" || item.entity_type === filterType;
    return matchQ && matchT;
  });

  if (sortBy === "newest")   result = [...result].sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
  if (sortBy === "oldest")   result = [...result].sort((a, b) => new Date(a.deleted_at) - new Date(b.deleted_at));
  if (sortBy === "expiring") result = [...result].sort((a, b) => a.seconds_until_expiry - b.seconds_until_expiry);
  if (sortBy === "type")     result = [...result].sort((a, b) => a.entity_type.localeCompare(b.entity_type));

  return result;
}
