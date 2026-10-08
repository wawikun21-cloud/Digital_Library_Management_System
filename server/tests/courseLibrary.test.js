const assert = require('node:assert/strict');
const test = require('node:test');
const coursesService = require('../features/courses/courses.service');
const CoursesController = require('../features/courses/courses.controller');

test('course library always requests published courses', async () => {
  const originalListCourses = coursesService.listCourses;
  let capturedFilters;
  let responseStatus;
  let responseBody;

  coursesService.listCourses = async (filters) => {
    capturedFilters = filters;
    return { data: [{ id: 1, status: 'published' }], total: 1 };
  };

  const response = {
    status(code) {
      responseStatus = code;
      return this;
    },
    json(body) {
      responseBody = body;
      return this;
    },
  };

  try {
    await CoursesController.listLibraryCourses({
      query: { status: 'draft', search: 'science', page: '2', limit: '8' },
    }, response);
  } finally {
    coursesService.listCourses = originalListCourses;
  }

  assert.equal(responseStatus, 200);
  assert.equal(capturedFilters.status, 'published');
  assert.equal(capturedFilters.search, 'science');
  assert.equal(capturedFilters.page, 2);
  assert.equal(capturedFilters.limit, 8);
  assert.deepEqual(responseBody.data, [{ id: 1, status: 'published' }]);
});
