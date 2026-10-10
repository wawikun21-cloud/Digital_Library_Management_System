const API_BASE = "";

const withCreds = (opts = {}) => ({
  ...opts,
  credentials: "include",
  headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
});

export async function fetchTools(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const url = qs.toString() ? `${API_BASE}/api/tools?${qs.toString()}` : `${API_BASE}/api/tools`;
  const res = await fetch(url, withCreds());
  return res.json();
}

export async function fetchTool(id) {
  const res = await fetch(`${API_BASE}/api/tools/${id}`, withCreds());
  return res.json();
}

export async function createTool(toolData) {
  const formData = new FormData();
  if (toolData.title) formData.append("title", toolData.title);
  if (toolData.description) formData.append("description", toolData.description);
  if (toolData.category) formData.append("category", toolData.category);
  if (toolData.is_active !== undefined) formData.append("is_active", toolData.is_active);
  if (toolData.thumbnail_url) formData.append("thumbnail_url", toolData.thumbnail_url);
  if (toolData.thumbnail) formData.append("thumbnail", toolData.thumbnail);
  if (toolData.file) formData.append("file", toolData.file);

  const res = await fetch(`${API_BASE}/api/tools`, {
    method: "POST",
    body: formData,
    credentials: "include",
  });
  return res.json();
}

export async function updateTool(id, updates) {
  const formData = new FormData();
  if (updates.title !== undefined) formData.append("title", updates.title);
  if (updates.description !== undefined) formData.append("description", updates.description);
  if (updates.category !== undefined) formData.append("category", updates.category);
  if (updates.is_active !== undefined) formData.append("is_active", updates.is_active);
  if (updates.thumbnail_url !== undefined) formData.append("thumbnail_url", updates.thumbnail_url);
  if (updates.thumbnail) formData.append("thumbnail", updates.thumbnail);
  if (updates.file) formData.append("file", updates.file);

  const res = await fetch(`${API_BASE}/api/tools/${id}`, {
    method: "PUT",
    body: formData,
    credentials: "include",
  });
  return res.json();
}

export async function deleteTool(id) {
  const res = await fetch(`${API_BASE}/api/tools/${id}`, {
    method: "DELETE",
    credentials: "include",
  });
  return res.json();
}

export async function downloadTool(id) {
  const res = await fetch(`${API_BASE}/api/tools/${id}/download`, {
    method: "GET",
    credentials: "include",
  });
  return res.json();
}
