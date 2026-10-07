const builderService = require('./builder.service');

const CoursesController = {
  async getBuilder(req, res) {
    try {
      const data = await builderService.getBuilderData(req.params.id);
      res.status(200).json({ success: true, ...data });
    } catch (error) {
      console.error('[CoursesController.getBuilder] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async updateBuilder(req, res) {
    try {
      const result = await builderService.updateBuilder(req.params.id, req.body);
      res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('[CoursesController.updateBuilder] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async publishCourse(req, res) {
    try {
      await builderService.publishCourse(req.params.id);
      res.status(200).json({ success: true, message: 'Course published successfully' });
    } catch (error) {
      console.error('[CoursesController.publishCourse] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async submitForReview(req, res) {
    try {
      await builderService.submitForReview(req.params.id);
      res.status(200).json({ success: true, message: 'Course submitted for review' });
    } catch (error) {
      console.error('[CoursesController.submitForReview] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },

  async approveCourse(req, res) {
    try {
      await builderService.approveCourse(req.params.id);
      res.status(200).json({ success: true, message: 'Course approved and published' });
    } catch (error) {
      console.error('[CoursesController.approveCourse] Error:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  },
};

module.exports = CoursesController;
