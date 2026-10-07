const express = require('express');
const router = express.Router();
const BuilderController = require('./builder.controller');
const { requireAuth, requireAdminOrStaff } = require('../../middleware/authMiddleware');

router.get('/:id/builder', requireAuth, requireAdminOrStaff, BuilderController.getBuilder);
router.put('/:id/builder', requireAuth, requireAdminOrStaff, BuilderController.updateBuilder);
router.patch('/:id/publish', requireAuth, requireAdminOrStaff, BuilderController.publishCourse);
router.patch('/:id/submit-review', requireAuth, requireAdminOrStaff, BuilderController.submitForReview);
router.patch('/:id/approve', requireAuth, requireAdminOrStaff, BuilderController.approveCourse);

module.exports = router;
