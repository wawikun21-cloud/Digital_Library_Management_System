const coursesRepo = require('./courses.repository');
const modulesRepo = require('./modules.repository');
const contentRepo = require('./content.repository');
const enrollmentsRepo = require('./enrollments.repository');
const TrashModel = require('../../models/Trash');

async function listCourses(filters) {
  const [data, total] = await Promise.all([
    coursesRepo.listCourses(filters),
    coursesRepo.countCourses(filters),
  ]);
  return { data, total };
}

async function getCourse(id) {
  return coursesRepo.findById(id);
}

async function createCourse(userId, courseData) {
  const id = await coursesRepo.create({ ...courseData, instructor_id: userId });
  return { id };
}

async function updateCourse(userId, courseId, updates) {
  const affected = await coursesRepo.update(courseId, updates);
  return affected;
}

async function deleteCourse(userId, courseId) {
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

  const result = await TrashModel.softDelete('course', courseId, `user:${userId}`);
  if (!result.success && result.error !== "Record is already in trash") {
    return 0;
  }
  return 1;
}

async function archiveCourse(userId, courseId) {
  const affected = await coursesRepo.update(courseId, { status: 'archived' });
  return affected;
}

async function publishCourse(userId, courseId) {
  const affected = await coursesRepo.update(courseId, { status: 'published' });
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
