/**
 * End-to-end test script for Course Management endpoints.
 *
 * Prerequisites:
 *  - Server running on http://localhost:3001
 *  - Default admin user exists: admin / admin123
 *
 * Usage:
 *   node tests/courses.test.js
 */

const BASE_URL = "http://localhost:3001";

// Simple cookie jar for Node.js fetch
const cookieJar = new Map();

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  // Attach cookies
  if (cookieJar.size > 0) {
    const cookieStr = Array.from(cookieJar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
    headers["Cookie"] = cookieStr;
  }

  const res = await fetch(url, { ...options, headers });

  // Store cookies from response
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) {
    for (const cookie of setCookie) {
      const [pair] = cookie.split(";");
      const [k, v] = pair.split("=");
      if (k && v !== undefined) cookieJar.set(k.trim(), v.trim());
    }
  }

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  return { status: res.status, ok: res.ok, data };
}

let adminToken = null;
let courseId = null;
let moduleId = null;
let contentId = null;
let enrollmentId = null;
let results = [];

function assert(name, condition, details = "") {
  const pass = Boolean(condition);
  results.push({ name, pass, details });
  console.log(`${pass ? "✅" : "❌"} ${name}${details ? ` — ${details}` : ""}`);
  if (!pass) {
    console.error("   Response:", details);
  }
  return pass;
}

async function login() {
  const res = await request("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  assert("Login returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
  if (res.data?.success && res.data?.user) {
    adminToken = res.data.user.id;
  }
}

async function testCreateCourse() {
  const res = await request("/api/courses", {
    method: "POST",
    body: JSON.stringify({
      title: "Test Course " + Date.now(),
      description: "This is a test course created by automated test script with enough characters.",
      category: "Testing",
      difficulty: "beginner",
      status: "draft",
    }),
  });
  assert("Create course returns 201", res.status === 201, JSON.stringify(res.data).slice(0, 120));
  if (res.data?.success && res.data?.data?.id) {
    courseId = res.data.data.id;
  }
}

async function testListCourses() {
  const res = await request("/api/courses");
  assert("List courses returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
  assert("List courses returns array", Array.isArray(res.data?.data), JSON.stringify(res.data).slice(0, 80));
}

async function testGetCourse() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}`);
  assert("Get course returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
  assert("Get course returns correct id", res.data?.data?.id === courseId, `id=${res.data?.data?.id}`);
}

async function testUpdateCourse() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}`, {
    method: "PUT",
    body: JSON.stringify({ title: "Updated Test Course " + Date.now(), description: "Updated description with enough characters." }),
  });
  assert("Update course returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
}

async function testCreateModule() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}/modules`, {
    method: "POST",
    body: JSON.stringify({ title: "Module 1", description: "First module", type: "chapter", order_index: 1 }),
  });
  assert("Create module returns 201", res.status === 201, JSON.stringify(res.data).slice(0, 120));
  if (res.data?.success && res.data?.data?.id) {
    moduleId = res.data.data.id;
  }
}

async function testListModules() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}/modules`);
  assert("List modules returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
  assert("List modules returns array", Array.isArray(res.data?.data), JSON.stringify(res.data).slice(0, 80));
}

async function testCreateContent() {
  if (!courseId || !moduleId) return;
  const res = await request(`/api/courses/${courseId}/modules/${moduleId}/content`, {
    method: "POST",
    body: JSON.stringify({ title: "Lesson 1", type: "reading", order_index: 1 }),
  });
  assert("Create content returns 201", res.status === 201, JSON.stringify(res.data).slice(0, 120));
  if (res.data?.success && res.data?.data?.id) {
    contentId = res.data.data.id;
  }
}

async function testGetBuilderData() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}/builder`);
  assert("Get builder data returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
}

async function testUpdateBuilder() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}/builder`, {
    method: "PUT",
    body: JSON.stringify({
      title: "Builder Updated " + Date.now(),
      description: "Builder test description with enough characters.",
      modules: [],
    }),
  });
  assert("Update builder returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
}

async function testEnrollStudent() {
  if (!courseId || !adminToken) return;
  const res = await request(`/api/courses/${courseId}/enrollments`, {
    method: "POST",
    body: JSON.stringify({ user_id: adminToken, role: "learner" }),
  });
  assert("Enroll student returns 201", res.status === 201, JSON.stringify(res.data).slice(0, 120));
  if (res.data?.success && res.data?.data?.id) {
    enrollmentId = res.data.data.id;
  }
}

async function testListEnrollments() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}/enrollments`);
  assert("List enrollments returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
  assert("List enrollments returns array", Array.isArray(res.data?.data), JSON.stringify(res.data).slice(0, 80));
}

async function testUnenrollStudent() {
  if (!courseId || !adminToken) return;
  const res = await request(`/api/courses/${courseId}/enrollments`, {
    method: "DELETE",
    body: JSON.stringify({ user_id: adminToken }),
  });
  assert("Unenroll student returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
}

async function testArchiveCourse() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}/archive`, { method: "PATCH" });
  assert("Archive course returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
}

async function testPublishCourse() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}/publish`, { method: "PATCH" });
  assert("Publish course returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
}

async function testSubmitForReview() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}/submit-review`, { method: "PATCH" });
  assert("Submit for review returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
}

async function testApproveCourse() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}/approve`, { method: "PATCH" });
  assert("Approve course returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
}

async function testDeleteContent() {
  if (!courseId || !moduleId || !contentId) return;
  const res = await request(`/api/courses/${courseId}/modules/${moduleId}/content/${contentId}`, { method: "DELETE" });
  assert("Delete content returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
}

async function testDeleteModule() {
  if (!courseId || !moduleId) return;
  const res = await request(`/api/courses/${courseId}/modules/${moduleId}`, { method: "DELETE" });
  assert("Delete module returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
}

async function testDeleteCourse() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}`, { method: "DELETE" });
  assert("Delete course returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
}

async function main() {
  console.log("\n🚀 Starting Course Management E2E Tests\n");
  console.log(`📡 Target: ${BASE_URL}\n`);

  try {
    await login();
    await testCreateCourse();
    await testListCourses();
    await testGetCourse();
    await testUpdateCourse();
    await testCreateModule();
    await testListModules();
    await testCreateContent();
    await testGetBuilderData();
    await testUpdateBuilder();
    await testEnrollStudent();
    await testListEnrollments();
    await testUnenrollStudent();
    await testArchiveCourse();
    await testPublishCourse();
    await testSubmitForReview();
    await testApproveCourse();
    await testDeleteContent();
    await testDeleteModule();
    await testDeleteCourse();
  } catch (err) {
    console.error("\n❌ Test runner error:", err);
  }

  console.log("\n📊 Results Summary");
  console.log("──────────────────────────────────────");
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`Total: ${results.length} | Passed: ${passed} | Failed: ${failed}`);
  if (failed > 0) {
    console.log("\n❌ Failed tests:");
    results.filter((r) => !r.pass).forEach((r) => console.log(`  - ${r.name}`));
  }
  console.log("");

  process.exit(failed > 0 ? 1 : 0);
}

main();
