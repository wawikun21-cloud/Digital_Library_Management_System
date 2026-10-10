const express = require('express');
const router = express.Router();
const CoursesController = require('./courses.controller');
const {
  requireAuth,
  resolvePermissions,
  requirePermissionAction,
} = require('../../features/roles');
const { courseThumbnailUpload } = require('../../middleware/courseThumbnailUpload');

router.use(requireAuth, resolvePermissions);

// Static paths first so they are never shadowed by /:id
router.get('/library', requirePermissionAction('view_course_library', 'view'), CoursesController.listLibraryCourses);
router.get('/categories', requirePermissionAction('manage_courses', 'view'), (req, res) => {
  res.status(200).json({ success: true, data: [] });
});
router.post('/thumbnail', requirePermissionAction('manage_courses', 'edit'), courseThumbnailUpload, CoursesController.uploadThumbnail);

router.get('/', requirePermissionAction('manage_courses', 'view'), CoursesController.listCourses);
router.post('/', requirePermissionAction('manage_courses', 'create'), CoursesController.createCourse);
router.put('/:id', requirePermissionAction('manage_courses', 'edit'), CoursesController.updateCourse);
router.delete('/:id', requirePermissionAction('manage_courses', 'delete'), CoursesController.deleteCourse);
router.patch('/:id/archive', requirePermissionAction('manage_courses', 'archive'), CoursesController.archiveCourse);
router.patch('/:id/publish', requirePermissionAction('manage_courses', 'publish'), CoursesController.publishCourse);

router.get('/:id', requirePermissionAction('view_course_library', 'view'), CoursesController.getCourse);

router.get('/:courseId/modules', requirePermissionAction('view_course_library', 'view'), CoursesController.listModules);
router.post('/:courseId/modules', requirePermissionAction('manage_courses', 'edit'), CoursesController.createModule);
router.put('/:courseId/modules/:moduleId', requirePermissionAction('manage_courses', 'edit'), CoursesController.updateModule);
router.delete('/:courseId/modules/:moduleId', requirePermissionAction('manage_courses', 'edit'), CoursesController.deleteModule);

router.get('/:courseId/modules/:moduleId/content', requirePermissionAction('view_course_library', 'view'), CoursesController.listContent);
router.post('/:courseId/modules/:moduleId/content', requirePermissionAction('manage_courses', 'edit'), CoursesController.createContent);
router.put('/:courseId/modules/:moduleId/content/:contentId', requirePermissionAction('manage_courses', 'edit'), CoursesController.updateContent);
router.delete('/:courseId/modules/:moduleId/content/:contentId', requirePermissionAction('manage_courses', 'edit'), CoursesController.deleteContent);

router.get('/:courseId/enrollments', requirePermissionAction('view_course_library', 'view'), CoursesController.listEnrollments);
router.post('/:courseId/enrollments', requirePermissionAction('manage_courses', 'enroll'), CoursesController.enrollStudent);
router.delete('/:courseId/enrollments', requirePermissionAction('manage_courses', 'enroll'), CoursesController.unenrollStudent);

router.get('/:courseId/progress', requirePermissionAction('view_course_library', 'view'), CoursesController.getCourseProgress);
router.post('/:courseId/lessons/:lessonId/complete', requirePermissionAction('view_course_library', 'complete'), CoursesController.markLessonComplete);

module.exports = router;
