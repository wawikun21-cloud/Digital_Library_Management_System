const express = require('express');
const router = express.Router();
const BuilderController = require('./builder.controller');
const {
  requireAuth,
  resolvePermissions,
  requirePermissionAction,
} = require('../../features/roles');

router.use(requireAuth, resolvePermissions);

router.get('/:id/builder', requirePermissionAction('manage_courses', 'view'), BuilderController.getBuilder);
router.put('/:id/builder', requirePermissionAction('manage_courses', 'edit'), BuilderController.updateBuilder);
router.patch('/:id/publish', requirePermissionAction('manage_courses', 'publish'), BuilderController.publishCourse);
router.patch('/:id/submit-review', requirePermissionAction('manage_courses', 'submit_review'), BuilderController.submitForReview);
router.patch('/:id/approve', requirePermissionAction('manage_courses', 'approve'), BuilderController.approveCourse);

module.exports = router;
