const API_BASE = "";

const withCreds = (opts = {}) => ({
  ...opts,
  credentials: "include",
  headers: { "Content-Type": "application/json", ...(opts.headers || {}) },
});

export async function getCourseList(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`${API_BASE}/api/courses?${qs.toString()}`, withCreds());
  return res.json();
}

export async function getCourseLibrary(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== "") qs.append(key, val);
  });
  const res = await fetch(`${API_BASE}/api/courses/library?${qs.toString()}`, withCreds());
  return res.json();
}

export async function getCourseById(id) {
  const res = await fetch(`${API_BASE}/api/courses/${id}`, withCreds());
  return res.json();
}

export async function createCourse(payload) {
  const res = await fetch(`${API_BASE}/api/courses`, {
    ...withCreds({ method: "POST", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function updateCourse(id, payload) {
  const res = await fetch(`${API_BASE}/api/courses/${id}`, {
    ...withCreds({ method: "PUT", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function uploadCourseThumbnail(file) {
  const formData = new FormData();
  formData.append("thumbnail", file);
  const response = await fetch(`${API_BASE}/api/courses/thumbnail`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const result = await response.json();
  if (!response.ok || !result?.success || !result?.data?.thumbnail_url) {
    throw new Error(result?.error || result?.message || "Unable to upload course thumbnail");
  }
  return result;
}

export async function deleteCourse(id) {
  const res = await fetch(`${API_BASE}/api/courses/${id}`, { ...withCreds({ method: "DELETE" }) });
  return res.json();
}

export async function archiveCourse(id) {
  const res = await fetch(`${API_BASE}/api/courses/${id}/archive`, { ...withCreds({ method: "PATCH" }) });
  return res.json();
}

export async function publishCourse(courseId) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/publish`, { ...withCreds({ method: "PATCH" }) });
  return res.json();
}

export async function getCourseModules(courseId) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/modules`, withCreds());
  return res.json();
}

export async function createModule(courseId, payload) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/modules`, {
    ...withCreds({ method: "POST", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function updateModule(courseId, moduleId, payload) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/modules/${moduleId}`, {
    ...withCreds({ method: "PUT", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function deleteModule(courseId, moduleId) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/modules/${moduleId}`, { ...withCreds({ method: "DELETE" }) });
  return res.json();
}

export async function getModuleContent(courseId, moduleId) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/modules/${moduleId}/content`, withCreds());
  return res.json();
}

export async function createContent(courseId, moduleId, payload) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/modules/${moduleId}/content`, {
    ...withCreds({ method: "POST", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function updateContent(courseId, moduleId, contentId, payload) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/modules/${moduleId}/content/${contentId}`, {
    ...withCreds({ method: "PUT", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function deleteContent(courseId, moduleId, contentId) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/modules/${moduleId}/content/${contentId}`, { ...withCreds({ method: "DELETE" }) });
  return res.json();
}

export async function getEnrollments(courseId) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/enrollments`, withCreds());
  return res.json();
}

export async function getCourseProgress(courseId) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/progress`, withCreds());
  return res.json();
}

export async function markLessonComplete(courseId, lessonId) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/lessons/${lessonId}/complete`, {
    ...withCreds({ method: "POST" }),
  });
  return res.json();
}

export async function enrollStudent(courseId, userId, role = "learner") {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/enrollments`, {
    ...withCreds({ method: "POST", body: JSON.stringify({ user_id: userId, role }) }),
  });
  return res.json();
}

export async function unenrollStudent(courseId, userId) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/enrollments`, {
    ...withCreds({ method: "DELETE", body: JSON.stringify({ user_id: userId }) }),
  });
  return res.json();
}

export async function getBuilderData(courseId) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/builder`, withCreds());
  return res.json();
}

export async function updateBuilder(courseId, payload) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/builder`, {
    ...withCreds({ method: "PUT", body: JSON.stringify(payload) }),
  });
  return res.json();
}

export async function submitForReview(courseId) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/submit-review`, { ...withCreds({ method: "PATCH" }) });
  return res.json();
}

export async function approveCourse(courseId) {
  const res = await fetch(`${API_BASE}/api/courses/${courseId}/approve`, { ...withCreds({ method: "PATCH" }) });
  return res.json();
}

export default {
  getCourseList,
  getCourseLibrary,
  getCourseById,
  createCourse,
  updateCourse,
  uploadCourseThumbnail,
  deleteCourse,
  archiveCourse,
  publishCourse,
  getCourseModules,
  createModule,
  updateModule,
  deleteModule,
  getModuleContent,
  createContent,
  updateContent,
  deleteContent,
  getEnrollments,
  enrollStudent,
  unenrollStudent,
  getCourseProgress,
  markLessonComplete,
  getBuilderData,
  updateBuilder,
  submitForReview,
  approveCourse,
};
