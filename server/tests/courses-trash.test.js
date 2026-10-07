/**
 * End-to-end test script for Course soft-delete / trash flow.
 *
 * Prerequisites:
 *  - Server running on http://localhost:3001
 *  - Default admin user exists: admin / admin123
 *
 * Usage:
 *   node tests/courses-trash.test.js
 */

const BASE_URL = "http://localhost:3001";

const cookieJar = new Map();

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (cookieJar.size > 0) {
    headers["Cookie"] = Array.from(cookieJar.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");
  }

  const res = await fetch(url, { ...options, headers });

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

let courseId = null;
let trashLogId = null;
const results = [];

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
}

async function testCreateCourse() {
  const res = await request("/api/courses", {
    method: "POST",
    body: JSON.stringify({
      title: "Trash Test Course " + Date.now(),
      description: "This is a test course for soft-delete and trash flow with enough characters.",
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

async function testCourseVisibleBeforeDelete() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}`);
  assert("Course is visible before delete", res.status === 200 && res.data?.success, JSON.stringify(res.data).slice(0, 120));
}

async function testSoftDeleteCourse() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}`, { method: "DELETE" });
  assert("Soft-delete course returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
}

async function testCourseHiddenAfterDelete() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}`);
  assert("Course is hidden after soft-delete", res.status === 404, JSON.stringify(res.data).slice(0, 120));
}

async function testTrashLogContainsCourse() {
  if (!courseId) return;
  const res = await request("/api/trash?entityType=course");
  assert("Fetch trash by course type returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
  assert("Trash contains deleted course", Array.isArray(res.data?.data) && res.data.data.some(t => t.entity_id === courseId), JSON.stringify(res.data).slice(0, 160));

  if (Array.isArray(res.data?.data) && res.data.data.length > 0) {
    const courseTrash = res.data.data.find(t => t.entity_id === courseId);
    if (courseTrash) {
      trashLogId = courseTrash.id;
      assert("Trash entry entity_type is course", courseTrash.entity_type === "course", `entity_type=${courseTrash.entity_type}`);
      assert("Trash entry has title snapshot", !!courseTrash.entity_title, `entity_title=${courseTrash.entity_title}`);
    }
  }
}

async function testRestoreCourseFromTrash() {
  if (!trashLogId) return;
  const res = await request(`/api/trash/restore/${trashLogId}`, { method: "POST" });
  assert("Restore course from trash returns 200", res.status === 200, JSON.stringify(res.data).slice(0, 120));
}

async function testCourseVisibleAfterRestore() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}`);
  assert("Course is visible again after restore", res.status === 200 && res.data?.success, JSON.stringify(res.data).slice(0, 120));
}

async function testTrashClearedAfterRestore() {
  if (!trashLogId) return;
  const res = await request("/api/trash?entityType=course");
  assert("Trash no longer contains restored course", res.status === 200, JSON.stringify(res.data).slice(0, 120));
  if (Array.isArray(res.data?.data)) {
    assert("Restored course removed from trash", !res.data.data.some(t => t.entity_id === courseId), JSON.stringify(res.data).slice(0, 120));
  }
}

async function testPermanentDeleteCourse() {
  if (!courseId) return;
  const delRes = await request(`/api/courses/${courseId}`, { method: "DELETE" });
  assert("Soft-delete course again returns 200", delRes.status === 200, JSON.stringify(delRes.data).slice(0, 120));

  const trashRes = await request("/api/trash?entityType=course");
  if (Array.isArray(trashRes.data?.data) && trashRes.data.data.length > 0) {
    const courseTrash = trashRes.data.data.find(t => t.entity_id === courseId);
    if (courseTrash) {
      trashLogId = courseTrash.id;
      const permRes = await request(`/api/trash/${trashLogId}`, { method: "DELETE" });
      assert("Permanent delete course from trash returns 200", permRes.status === 200, JSON.stringify(permRes.data).slice(0, 120));
    } else {
      assert("Permanent delete course from trash", false, "No trash entry found after re-delete");
    }
  } else {
    assert("Permanent delete course from trash", false, "Trash is empty after re-delete");
  }
}

async function testCourseGoneAfterPermanentDelete() {
  if (!courseId) return;
  const res = await request(`/api/courses/${courseId}`);
  assert("Course is permanently deleted", res.status === 404, JSON.stringify(res.data).slice(0, 120));
}

async function main() {
  console.log("\n🚀 Starting Course Soft-Delete / Trash E2E Tests\n");
  console.log(`📡 Target: ${BASE_URL}\n`);

  try {
    await login();
    await testCreateCourse();
    await testCourseVisibleBeforeDelete();
    await testSoftDeleteCourse();
    await testCourseHiddenAfterDelete();
    await testTrashLogContainsCourse();
    await testRestoreCourseFromTrash();
    await testCourseVisibleAfterRestore();
    await testTrashClearedAfterRestore();
    await testPermanentDeleteCourse();
    await testCourseGoneAfterPermanentDelete();
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
