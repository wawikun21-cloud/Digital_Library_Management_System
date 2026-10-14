const coursesRepo = require('./courses.repository');
const modulesRepo = require('./modules.repository');
const contentRepo = require('./content.repository');
const enrollmentsRepo = require('./enrollments.repository');
const TrashModel = require('../../models/Trash');

async function listCourses(filters, scope = null) {
  const [data, total] = await Promise.all([
    coursesRepo.listCourses(filters, scope),
    coursesRepo.countCourses(filters, scope),
  ]);
  return { data, total };
}

async function getCourse(id, scope = null) {
  return coursesRepo.findById(id, scope);
}

async function createCourse(userId, courseData, scope = null) {
  const result = await coursesRepo.create({ ...courseData, instructor_id: userId }, scope);
  if (result && result.scopeError) {
    return { id: null, scopeError: result.scopeError };
  }
  return { id: result };
}

async function updateCourse(userIdOrCourseId, courseIdOrUpdates, maybeUpdates, scope = null) {
  let courseId;
  let updates;

  if (courseIdOrUpdates && typeof courseIdOrUpdates === 'object' && !Array.isArray(courseIdOrUpdates)) {
    courseId = userIdOrCourseId;
    updates = courseIdOrUpdates;
  } else {
    courseId = courseIdOrUpdates;
    updates = maybeUpdates;
  }

  if (courseId === undefined || updates === undefined) {
    return 0;
  }

  // School scope: an out-of-school course must not be editable.
  if (scope && scope.scoped) {
    const existing = await coursesRepo.findById(courseId, scope);
    if (!existing) return { affectedRows: 0, scopeError: "Course not found" };
  }

  const affected = await coursesRepo.update(courseId, updates, scope);
  return affected;
}

async function deleteCourse(userId, courseId, scope = null) {
  // School scope: an out-of-school course must not be deletable.
  if (scope && scope.scoped) {
    const existing = await coursesRepo.findById(courseId, scope);
    if (!existing) return 0;
  }

  const modules = await modulesRepo.listModules(courseId);
  for (const mod of modules) {
    const contents = await contentRepo.listContent(mod.id);
    for (const content of contents) {
      await contentRepo.softDelete(content.id);
    }
    await modulesRepo.softDelete(mod.id);
  }

  const enrollments = await enrollmentsRepo.listEnrollments(courseId);
  for (const enrollment of enrollments) {
    await enrollmentsRepo.unenroll(courseId, enrollment.user_id);
  }

  // Snapshot the course's school onto the trash entry.
  const course = await coursesRepo.findById(courseId);
  const result = await TrashModel.softDelete('course', courseId, `user:${userId}`, course?.school_id ?? null);
  if (!result.success && result.error !== "Record is already in trash") {
    return 0;
  }
  return 1;
}

async function archiveCourse(userId, courseId, scope = null) {
  const affected = await coursesRepo.update(courseId, { status: 'archived' }, scope);
  return affected;
}

async function publishCourse(userId, courseId, scope = null) {
  const affected = await coursesRepo.update(courseId, { status: 'published' }, scope);
  return affected;
}

async function listCourseModules(courseId) {
  return modulesRepo.listModules(courseId);
}

async function createModule(courseId, moduleData) {
  return modulesRepo.create({ course_id: courseId, ...moduleData });
}

async function updateModule(moduleId, updates) {
  return modulesRepo.update(moduleId, updates);
}

async function deleteModule(moduleId) {
  return modulesRepo.softDelete(moduleId);
}

async function listModuleContent(moduleId) {
  return contentRepo.listContent(moduleId);
}

async function createContent(moduleId, contentData) {
  return contentRepo.create({ module_id: moduleId, ...contentData });
}

async function updateContent(contentId, updates) {
  return contentRepo.update(contentId, updates);
}

async function deleteContent(contentId) {
  return contentRepo.softDelete(contentId);
}

async function listEnrollments(courseId) {
  return enrollmentsRepo.listEnrollments(courseId);
}

async function enrollStudent(courseId, userId, role = 'learner') {
  return enrollmentsRepo.enroll(courseId, userId, role);
}

async function unenrollStudent(courseId, userId) {
  return enrollmentsRepo.unenroll(courseId, userId);
}

module.exports = {
  listCourses,
  getCourse,
  createCourse,
  updateCourse,
  deleteCourse,
  archiveCourse,
  publishCourse,
  listCourseModules,
  createModule,
  updateModule,
  deleteModule,
  listModuleContent,
  createContent,
  updateContent,
  deleteContent,
  listEnrollments,
  enrollStudent,
  unenrollStudent,
};
