const PORTAL_API = `${import.meta.env.VITE_API_URL || "/api"}/portal`;

async function request(path, options = {}) {
  const res = await fetch(`${PORTAL_API}${path}`, { credentials: "include", ...options });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok || !data?.success) {
    throw new Error(data?.error || data?.message || "Request failed");
  }
  return data;
}

const jsonBody = (method, body) => ({
  method,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

/** Student portal home: { slides, books, courses } */
export async function getPortalHome() {
  const result = await request("/home");
  return result.data;
}

export async function getHeroSlides() {
  const result = await request("/slides");
  return { slides: result.data, maxSlides: result.meta?.maxSlides ?? 8 };
}

/** formData must contain: image (file), is_active */
export async function createHeroSlide(formData) {
  return (await request("/slides", { method: "POST", body: formData })).data;
}

export async function updateHeroSlide(id, formData) {
  return (await request(`/slides/${id}`, { method: "PUT", body: formData })).data;
}

export async function setHeroSlideActive(id, isActive) {
  const formData = new FormData();
  formData.append("is_active", String(isActive));
  return updateHeroSlide(id, formData);
}

export async function deleteHeroSlide(id) {
  await request(`/slides/${id}`, { method: "DELETE" });
}

export async function reorderHeroSlides(ids) {
  return (await request("/slides/reorder", jsonBody("PATCH", { ids }))).data;
}
