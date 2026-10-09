const coursesService = require('./courses.service');
const progressRepo = require('./progress.repository');
const auditService = require('../../services/auditService');
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { uploadsDir } = require('../../config/uploads');
const { detectImageExtension } = require('./courseThumbnail');

function getCourseListFilters(req, status = req.query.status) {
  return {
    search: req.query.search,
    status,
    category: req.query.category,
    difficulty: req.query.difficulty,
    instructor_id: req.query.instructor_id,
    page: parseInt(req.query.page || '1', 10),
    limit: parseInt(req.query.limit || '20', 10),
    sort: req.query.sort,
    order: req.query.order,
  };
}

async function sendCourseList(req, res, filters) {
  const { data, total } = await coursesService.listCourses(filters);
  res.status(200).json({
    success: true,
    data,
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages: Math.ceil(total / filters.limit) || 1,
    },
  });
}

const CoursesController = {
  async uploadThumbnail(req, res) {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'Choose a thumbnail image to upload' });
    }

    const extension = detectImageExtension(req.file.buffer);
    if (!extension) {
      return res.status(400).json({ success: false, error: 'The uploaded file is not a valid JPEG, PNG, or WebP image' });
    }

    try {
      const thumbnailDir = path.join(uploadsDir, 'course-thumbnails');
      const filename = `${crypto.randomUUID()}${extension}`;
      await fs.mkdir(thumbnailDir, { recursive: true });
      await fs.writeFile(path.join(thumbnailDir, filename), req.file.buffer, { flag: 'wx' });

      res.status(201).json({
        success: true,
        data: { thumbnail_url: `/uploads/course-thumbnails/${filename}` },
      });
    } catch (error) {
      console.error('[CoursesController.uploadThumbnail] Error:', error);
      res.status(500).json({ success: false, error: 'Unable to save the course thumbnail' });
    }
  },

  async listCourses(req, res) {
    try {
      await sendCourseList(req, res, getCourseListFilters(req));
    } catch (error) {
      console.error('[CoursesController.listCourses] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async listLibraryCourses(req, res) {
    try {
      await sendCourseList(req, res, getCourseListFilters(req, 'published'));
    } catch (error) {
      console.error('[CoursesController.listLibraryCourses] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getCourse(req, res) {
    try {
      const course = await coursesService.getCourse(req.params.id);
      if (!course) {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      res.status(200).json({ success: true, data: course });
    } catch (error) {
      console.error('[CoursesController.getCourse] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async createCourse(req, res) {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      const { title, description, category, difficulty, status } = req.body;
      if (!title || String(title).trim().length < 3) {
        return res.status(400).json({ success: false, error: 'Title is required and must be at least 3 characters' });
      }
      const result = await coursesService.createCourse(userId, req.body);
      await auditService.logAction(req, {
        entity_type: 'course',
        entity_id: result.id,
        action: 'CREATE',
        old_data: null,
        new_data: { title: req.body.title },
      });
      res.status(201).json({ success: true, data: result, message: 'Course created successfully' });
    } catch (error) {
      console.error('[CoursesController.createCourse] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async updateCourse(req, res) {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      const { title, description, category, difficulty, status } = req.body;
      if (title !== undefined && String(title).trim().length < 3) {
        return res.status(400).json({ success: false, error: 'Title must be at least 3 characters' });
      }
      const old = await coursesService.getCourse(req.params.id);
      const affected = await coursesService.updateCourse(userId, req.params.id, req.body);
      if (!affected) {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      await auditService.logAction(req, {
        entity_type: 'course',
        entity_id: parseInt(req.params.id, 10),
        action: 'UPDATE',
        old_data: old ? { title: old.title } : null,
        new_data: { title: req.body.title },
      });
      res.status(200).json({ success: true, message: 'Course updated successfully' });
    } catch (error) {
      console.error('[CoursesController.updateCourse] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async deleteCourse(req, res) {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      const old = await coursesService.getCourse(req.params.id);
      const affected = await coursesService.deleteCourse(userId, req.params.id);
      if (!affected) {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      await auditService.logAction(req, {
        entity_type: 'course',
        entity_id: parseInt(req.params.id, 10),
        action: 'DELETE',
        old_data: old ? { title: old.title } : null,
        new_data: null,
      });
      res.status(200).json({ success: true, message: 'Course deleted successfully' });
    } catch (error) {
      console.error('[CoursesController.deleteCourse] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async archiveCourse(req, res) {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      const affected = await coursesService.archiveCourse(userId, req.params.id);
      if (!affected) {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      await auditService.logAction(req, {
        entity_type: 'course',
        entity_id: parseInt(req.params.id, 10),
        action: 'ARCHIVE',
        old_data: null,
        new_data: { status: 'archived' },
      });
      res.status(200).json({ success: true, message: 'Course archived successfully' });
    } catch (error) {
      console.error('[CoursesController.archiveCourse] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async publishCourse(req, res) {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      const affected = await coursesService.publishCourse(userId, req.params.id);
      if (!affected) {
        return res.status(404).json({ success: false, error: 'Course not found' });
      }
      await auditService.logAction(req, {
        entity_type: 'course',
        entity_id: parseInt(req.params.id, 10),
        action: 'PUBLISH',
        old_data: null,
        new_data: { status: 'published' },
      });
      res.status(200).json({ success: true, message: 'Course published successfully' });
    } catch (error) {
      console.error('[CoursesController.publishCourse] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async listModules(req, res) {
    try {
      const modules = await coursesService.listCourseModules(req.params.courseId);
      res.status(200).json({ success: true, data: modules });
    } catch (error) {
      console.error('[CoursesController.listModules] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async createModule(req, res) {
    try {
      const moduleId = await coursesService.createModule(req.params.courseId, req.body);
      await auditService.logAction(req, {
        entity_type: 'course_module',
        entity_id: moduleId,
        action: 'CREATE',
        old_data: null,
        new_data: { title: req.body.title },
      });
      res.status(201).json({ success: true, data: { id: moduleId }, message: 'Module created successfully' });
    } catch (error) {
      console.error('[CoursesController.createModule] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async updateModule(req, res) {
    try {
      const affected = await coursesService.updateModule(req.params.moduleId, req.body);
      if (!affected) {
        return res.status(404).json({ success: false, error: 'Module not found' });
      }
      await auditService.logAction(req, {
        entity_type: 'course_module',
        entity_id: parseInt(req.params.moduleId, 10),
        action: 'UPDATE',
        old_data: null,
        new_data: req.body,
      });
      res.status(200).json({ success: true, message: 'Module updated successfully' });
    } catch (error) {
      console.error('[CoursesController.updateModule] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async deleteModule(req, res) {
    try {
      const affected = await coursesService.deleteModule(req.params.moduleId);
      if (!affected) {
        return res.status(404).json({ success: false, error: 'Module not found' });
      }
      await auditService.logAction(req, {
        entity_type: 'course_module',
        entity_id: parseInt(req.params.moduleId, 10),
        action: 'DELETE',
        old_data: null,
        new_data: null,
      });
      res.status(200).json({ success: true, message: 'Module deleted successfully' });
    } catch (error) {
      console.error('[CoursesController.deleteModule] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async listContent(req, res) {
    try {
      const content = await coursesService.listModuleContent(req.params.moduleId);
      res.status(200).json({ success: true, data: content });
    } catch (error) {
      console.error('[CoursesController.listContent] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async createContent(req, res) {
    try {
      const contentId = await coursesService.createContent(req.params.moduleId, req.body);
      await auditService.logAction(req, {
        entity_type: 'module_content',
        entity_id: contentId,
        action: 'CREATE',
        old_data: null,
        new_data: { title: req.body.title },
      });
      res.status(201).json({ success: true, data: { id: contentId }, message: 'Content created successfully' });
    } catch (error) {
      console.error('[CoursesController.createContent] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async updateContent(req, res) {
    try {
      const affected = await coursesService.updateContent(req.params.contentId, req.body);
      if (!affected) {
        return res.status(404).json({ success: false, error: 'Content not found' });
      }
      await auditService.logAction(req, {
        entity_type: 'module_content',
        entity_id: parseInt(req.params.contentId, 10),
        action: 'UPDATE',
        old_data: null,
        new_data: req.body,
      });
      res.status(200).json({ success: true, message: 'Content updated successfully' });
    } catch (error) {
      console.error('[CoursesController.updateContent] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async deleteContent(req, res) {
    try {
      const affected = await coursesService.deleteContent(req.params.contentId);
      if (!affected) {
        return res.status(404).json({ success: false, error: 'Content not found' });
      }
      await auditService.logAction(req, {
        entity_type: 'module_content',
        entity_id: parseInt(req.params.contentId, 10),
        action: 'DELETE',
        old_data: null,
        new_data: null,
      });
      res.status(200).json({ success: true, message: 'Content deleted successfully' });
    } catch (error) {
      console.error('[CoursesController.deleteContent] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async listEnrollments(req, res) {
    try {
      const enrollments = await coursesService.listEnrollments(req.params.courseId);
      res.status(200).json({ success: true, data: enrollments });
    } catch (error) {
      console.error('[CoursesController.listEnrollments] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async enrollStudent(req, res) {
    try {
      const userId = req.session?.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Not authenticated' });
      }
      const result = await coursesService.enrollStudent(req.params.courseId, req.body.user_id, req.body.role || 'learner');
      await progressRepo.unlockForEnrollment(req.body.user_id, req.params.courseId);
      await auditService.logAction(req, {
        entity_type: 'course_enrollment',
        entity_id: result,
        action: 'CREATE',
        old_data: null,
        new_data: { course_id: req.params.courseId, user_id: req.body.user_id },
      });
      res.status(201).json({ success: true, data: result, message: 'Student enrolled successfully' });
    } catch (error) {
      console.error('[CoursesController.enrollStudent] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async getCourseProgress(req, res) {
    try {
      const userId = req.session?.user?.id;
      const courseId = parseInt(req.params.courseId, 10);
      if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

      const course = await coursesService.getCourse(courseId);
      if (!course) return res.status(404).json({ success: false, error: 'Course not found' });

      const [modules, progress, enrollment] = await Promise.all([
        coursesService.listCourseModules(courseId),
        progressRepo.listByCourse(userId, courseId),
        progressRepo.getEnrollment(courseId, userId),
      ]);

      const progressMap = new Map();
      progress.forEach((p) => progressMap.set(p.lesson_id, p));

      const enrichedLessons = [];
      for (const mod of modules) {
        const contentItems = await coursesService.listModuleContent(mod.id);
        for (const item of contentItems) {
          const existing = progressMap.get(item.id);
          enrichedLessons.push({
            id: item.id,
            title: item.title,
            type: item.type,
            moduleId: mod.id,
            moduleTitle: mod.title,
            order: item.order_index,
            status: existing ? existing.status : (enrichedLessons.length === 0 ? 'unlocked' : 'locked'),
            completedAt: existing ? existing.completed_at : null,
            duration: item.duration,
            url: item.url,
            description: item.description,
          });
        }
      }

      const total = enrichedLessons.length;
      const completed = enrichedLessons.filter((l) => l.status === 'completed').length;
      const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

      res.status(200).json({
        success: true,
        data: {
          courseId,
          title: course.title,
          lessons: enrichedLessons,
          summary: { total, completed, completionPct },
          isEnrolled: !!enrollment,
          enrollmentStatus: enrollment?.status || null,
        },
      });
    } catch (error) {
      console.error('[CoursesController.getCourseProgress] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async markLessonComplete(req, res) {
    try {
      const userId = req.session?.user?.id;
      const courseId = parseInt(req.params.courseId, 10);
      const lessonId = parseInt(req.params.lessonId, 10);
      if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

      const lesson = await progressRepo.findLesson(courseId, lessonId);
      if (!lesson) return res.status(404).json({ success: false, error: 'Lesson not found' });

      await progressRepo.upsert({ userId, lessonId, courseId, status: 'completed' });

      const nextLessonId = await progressRepo.getNextLessonId(userId, courseId, lessonId);
      if (nextLessonId) {
        await progressRepo.upsert({ userId, lessonId: nextLessonId, courseId, status: 'unlocked' });
      }

      const moduleId = lesson.module_id;
      if (moduleId && (await progressRepo.isModuleCompleted(userId, moduleId))) {
        const nextModuleId = await progressRepo.getNextModuleId(courseId, moduleId);
        if (nextModuleId) {
          const firstLesson = await progressRepo.getFirstLessonIdOfModule(nextModuleId);
          if (firstLesson) {
            await progressRepo.upsert({ userId, lessonId: firstLesson, courseId, status: 'unlocked' });
          }
        }
      }

      const total = await progressRepo.countTotal(courseId);
      const completed = await progressRepo.countCompleted(userId, courseId);
      const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

      if (completed >= total && total > 0) {
        await progressRepo.updateEnrollmentProgress(courseId, userId, 100, 'completed', new Date());
        await auditService.logAction(req, {
          entity_type: 'course_enrollment',
          entity_id: courseId,
          action: 'COMPLETE',
          old_data: null,
          new_data: { status: 'completed', completed_at: new Date() },
        });
      } else {
        await progressRepo.updateEnrollmentProgress(courseId, userId, pct, 'active');
      }

      res.status(200).json({ success: true, message: 'Lesson marked complete' });
    } catch (error) {
      console.error('[CoursesController.markLessonComplete] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async unenrollStudent(req, res) {
    try {
      const affected = await coursesService.unenrollStudent(req.params.courseId, req.body.user_id);
      await auditService.logAction(req, {
        entity_type: 'course_enrollment',
        entity_id: null,
        action: 'DELETE',
        old_data: { course_id: req.params.courseId, user_id: req.body.user_id },
        new_data: null,
      });
      res.status(200).json({ success: true, message: 'Student unenrolled successfully' });
    } catch (error) {
      console.error('[CoursesController.unenrollStudent] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};

module.exports = CoursesController;
