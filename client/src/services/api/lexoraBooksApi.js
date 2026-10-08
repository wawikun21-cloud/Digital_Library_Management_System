const BASE_URL = import.meta.env.VITE_API_URL || "/api"

let csrfToken = null

async function getCsrfToken() {
  if (csrfToken) return csrfToken
  try {
    const res = await fetch(`${BASE_URL}/auth/csrf-token`, {
      method: "GET",
      credentials: "include",
    })
    const data = await res.json()
    csrfToken = data.csrfToken || null
    return csrfToken
  } catch {
    return null
  }
}

async function request(url, options = {}) {
  const token = await getCsrfToken()
  const res = await fetch(url, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "X-CSRF-Token": token } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || "Request failed")
  return data
}

async function requestForm(url, formData) {
  const token = await getCsrfToken()
  const res = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      ...(token ? { "X-CSRF-Token": token } : {}),
    },
    body: formData,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || data.message || "Upload failed")
  return data
}

const LEXORA_API = `${BASE_URL}/lexora-books`

export async function fetchLexoraBooks(filters = {}) {
  try {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== "") params.set(k, v) })
    const qs  = params.toString()
    const url = qs ? `${LEXORA_API}?${qs}` : LEXORA_API
    const res = await fetch(url, { credentials: "include" })
    return await res.json()
  } catch (error) {
    console.error("[lexoraBooksApi] fetchLexoraBooks:", error)
    return { success: false, error: error.message }
  }
}

export async function fetchPublicLexoraBooks(filters = {}) {
  try {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => { if (v != null && v !== "") params.set(k, v) })
    const qs  = params.toString()
    const url = `${LEXORA_API}/public${qs ? `?${qs}` : ""}`
    const res = await fetch(url, { credentials: "include" })
    return await res.json()
  } catch (error) {
    console.error("[lexoraBooksApi] fetchPublicLexoraBooks:", error)
    return { success: false, error: error.message }
  }
}

export async function fetchPublicCategories() {
  try {
    const res = await fetch(`${LEXORA_API}/public/categories`)
    return await res.json()
  } catch (error) {
    console.error("[lexoraBooksApi] fetchPublicCategories:", error)
    return { success: false, error: error.message }
  }
}

export async function fetchPublicTags() {
  try {
    const res = await fetch(`${LEXORA_API}/public/tags`)
    return await res.json()
  } catch (error) {
    console.error("[lexoraBooksApi] fetchPublicTags:", error)
    return { success: false, error: error.message }
  }
}

export async function fetchLexoraBook(id) {
  try {
    const res = await fetch(`${LEXORA_API}/${id}`, { credentials: "include" })
    return await res.json()
  } catch (error) {
    console.error("[lexoraBooksApi] fetchLexoraBook:", error)
    return { success: false, error: error.message }
  }
}

export async function fetchLexoraBookPublic(id) {
  try {
    const res = await fetch(`${LEXORA_API}/public/${id}`, { credentials: "include" })
    return await res.json()
  } catch (error) {
    console.error("[lexoraBooksApi] fetchLexoraBookPublic:", error)
    return { success: false, error: error.message }
  }
}

export async function fetchLexoraBookReader(id) {
  try {
    const res = await fetch(`${LEXORA_API}/${id}/reader`, { credentials: "include" })
    return await res.json()
  } catch (error) {
    console.error("[lexoraBooksApi] fetchLexoraBookReader:", error)
    return { success: false, error: error.message }
  }
}

export async function createLexoraBook(data) {
  return request(LEXORA_API, { method: "POST", body: JSON.stringify(data) })
}

export async function updateLexoraBook(id, data) {
  return request(`${LEXORA_API}/${id}`, { method: "PUT", body: JSON.stringify(data) })
}

export async function deleteLexoraBook(id) {
  return request(`${LEXORA_API}/${id}`, { method: "DELETE" })
}

export async function publishLexoraBook(id) {
  return request(`${LEXORA_API}/${id}/publish`, { method: "POST" })
}

export async function unpublishLexoraBook(id) {
  return request(`${LEXORA_API}/${id}/unpublish`, { method: "POST" })
}

export async function archiveLexoraBook(id) {
  return request(`${LEXORA_API}/${id}/archive`, { method: "POST" })
}

export async function restoreLexoraBook(id) {
  return request(`${LEXORA_API}/${id}/restore`, { method: "POST" })
}

export async function uploadBookPdf(id, file) {
  const form = new FormData()
  form.append("pdf", file)
  return requestForm(`${LEXORA_API}/${id}/pdf`, form)
}

export async function removeBookPdf(id) {
  return request(`${LEXORA_API}/${id}/pdf`, { method: "DELETE" })
}

export async function uploadBookCover(id, file) {
  const form = new FormData()
  form.append("cover", file)
  return requestForm(`${LEXORA_API}/${id}/cover`, form)
}

export async function removeBookCover(id) {
  return request(`${LEXORA_API}/${id}/cover`, { method: "DELETE" })
}

export async function uploadBookThumbnail(id, file) {
  const form = new FormData()
  form.append("thumbnail", file)
  return requestForm(`${LEXORA_API}/${id}/thumbnail`, form)
}

export async function uploadBookPages(id, files) {
  const form = new FormData()
  files.forEach((f) => form.append("pages", f))
  return requestForm(`${LEXORA_API}/${id}/pages`, form)
}

export async function fetchBookPages(id) {
  try {
    const res = await fetch(`${LEXORA_API}/${id}/pages`, { credentials: "include" })
    return await res.json()
  } catch (error) {
    console.error("[lexoraBooksApi] fetchBookPages:", error)
    return { success: false, error: error.message }
  }
}

export async function reorderBookPages(id, pageIds) {
  return request(`${LEXORA_API}/${id}/pages/reorder`, {
    method: "PUT",
    body: JSON.stringify({ page_ids: pageIds }),
  })
}

export async function deleteBookPage(pageId) {
  return request(`${LEXORA_API}/pages/${pageId}`, { method: "DELETE" })
}

export async function replaceBookPage(id, pageId, file) {
  const form = new FormData()
  form.append("cover", file)
  return requestForm(`${LEXORA_API}/${id}/pages/${pageId}/image`, form)
}

export async function fetchCategories() {
  try {
    const res = await fetch(`${LEXORA_API}/categories/all`, { credentials: "include" })
    return await res.json()
  } catch (error) {
    console.error("[lexoraBooksApi] fetchCategories:", error)
    return { success: false, error: error.message }
  }
}

export async function createCategory(name) {
  return request(`${LEXORA_API}/categories`, { method: "POST", body: JSON.stringify({ name }) })
}

export async function deleteCategory(id) {
  return request(`${LEXORA_API}/categories/${id}`, { method: "DELETE" })
}

export async function setBookCategories(id, categoryIds) {
  return request(`${LEXORA_API}/${id}/categories`, {
    method: "PUT",
    body: JSON.stringify({ category_ids: categoryIds }),
  })
}

export async function fetchTags() {
  try {
    const res = await fetch(`${LEXORA_API}/tags/all`, { credentials: "include" })
    return await res.json()
  } catch (error) {
    console.error("[lexoraBooksApi] fetchTags:", error)
    return { success: false, error: error.message }
  }
}

export async function createTag(name) {
  return request(`${LEXORA_API}/tags`, { method: "POST", body: JSON.stringify({ name }) })
}

export async function deleteTag(id) {
  return request(`${LEXORA_API}/tags/${id}`, { method: "DELETE" })
}

export async function setBookTags(id, tagIds) {
  return request(`${LEXORA_API}/${id}/tags`, {
    method: "PUT",
    body: JSON.stringify({ tag_ids: tagIds }),
  })
}

export async function fetchBookmarks(id) {
  try {
    const res = await fetch(`${LEXORA_API}/${id}/bookmarks`, { credentials: "include" })
    return await res.json()
  } catch (error) {
    console.error("[lexoraBooksApi] fetchBookmarks:", error)
    return { success: false, error: error.message }
  }
}

export async function fetchMyBookmarks() {
  return request(`${LEXORA_API}/my-bookmarks`, { method: "GET" })
}

export async function addBookmark(id, pageNumber) {
  return request(`${LEXORA_API}/${id}/bookmarks`, {
    method: "POST",
    body: JSON.stringify({ page_number: pageNumber }),
  })
}

export async function removeBookmark(id, pageNumber) {
  return request(`${LEXORA_API}/${id}/bookmarks/${pageNumber}`, { method: "DELETE" })
}

export async function fetchReadingProgress(id) {
  try {
    const res = await fetch(`${LEXORA_API}/${id}/progress`, { credentials: "include" })
    return await res.json()
  } catch (error) {
    console.error("[lexoraBooksApi] fetchReadingProgress:", error)
    return { success: false, error: error.message }
  }
}

export async function saveReadingProgress(id, pageNumber) {
  return request(`${LEXORA_API}/${id}/progress`, {
    method: "PUT",
    body: JSON.stringify({ page_number: pageNumber }),
  })
}

export async function fetchBookStats(id) {
  try {
    const res = await fetch(`${LEXORA_API}/${id}/stats`, { credentials: "include" })
    return await res.json()
  } catch (error) {
    console.error("[lexoraBooksApi] fetchBookStats:", error)
    return { success: false, error: error.message }
  }
}
