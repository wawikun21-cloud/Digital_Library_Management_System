const express = require('express');
const router = express.Router();
const CoursesController = require('./courses.controller');
const { requireAuth, requireAdminOrStaff } = require('../../middleware/authMiddleware');
const { courseThumbnailUpload } = require('../../middleware/courseThumbnailUpload');

router.get('/', requireAuth, requireAdminOrStaff, CoursesController.listCourses);
router.get('/library', requireAuth, CoursesController.listLibraryCourses);
router.get('/categories', requireAuth, requireAdminOrStaff, (req, res) => {
  res.status(200).json({ success: true, data: [] });
});
router.post('/thumbnail', requireAuth, requireAdminOrStaff, courseThumbnailUpload, CoursesController.uploadThumbnail);
router.get('/:id', requireAuth, requireAdminOrStaff, CoursesController.getCourse);
router.post('/', requireAuth, requireAdminOrStaff, CoursesController.createCourse);
router.put('/:id', requireAuth, requireAdminOrStaff, CoursesController.updateCourse);
router.delete('/:id', requireAuth, requireAdminOrStaff, CoursesController.deleteCourse);
router.patch('/:id/archive', requireAuth, requireAdminOrStaff, CoursesController.archiveCourse);
router.patch('/:id/publish', requireAuth, requireAdminOrStaff, CoursesController.publishCourse);

router.get('/:courseId/modules', requireAuth, requireAdminOrStaff, CoursesController.listModules);
router.post('/:courseId/modules', requireAuth, requireAdminOrStaff, CoursesController.createModule);
router.put('/:courseId/modules/:moduleId', requireAuth, requireAdminOrStaff, CoursesController.updateModule);
router.delete('/:courseId/modules/:moduleId', requireAuth, requireAdminOrStaff, CoursesController.deleteModule);

router.get('/:courseId/modules/:moduleId/content', requireAuth, requireAdminOrStaff, CoursesController.listContent);
router.post('/:courseId/modules/:moduleId/content', requireAuth, requireAdminOrStaff, CoursesController.createContent);
router.put('/:courseId/modules/:moduleId/content/:contentId', requireAuth, requireAdminOrStaff, CoursesController.updateContent);
router.delete('/:courseId/modules/:moduleId/content/:contentId', requireAuth, requireAdminOrStaff, CoursesController.deleteContent);

router.get('/:courseId/enrollments', requireAuth, requireAdminOrStaff, CoursesController.listEnrollments);
router.post('/:courseId/enrollments', requireAuth, requireAdminOrStaff, CoursesController.enrollStudent);
router.delete('/:courseId/enrollments', requireAuth, requireAdminOrStaff, CoursesController.unenrollStudent);

module.exports = router;
