const coursesService = require('./courses.service');

async function getBuilderData(courseId) {
  const course = await coursesService.getCourse(courseId);
  if (!course) {
    throw new Error('Course not found');
  }
  const modules = await coursesService.listCourseModules(courseId);
  const modulesWithContent = await Promise.all(
    modules.map(async (mod) => ({
      ...mod,
      lessons: await coursesService.listModuleContent(mod.id),
    }))
  );
  return { data: course, modules: modulesWithContent };
}

async function updateBuilder(courseId, payload) {
  const { title, description, category, thumbnail_url, status, modules } = payload;

  await coursesService.updateCourse(courseId, {
    title,
    description,
    category,
    thumbnail_url,
    status,
  });

  const existingModules = await coursesService.listCourseModules(courseId);
  const existingMap = new Map(existingModules.map((m) => [m.id, m]));

  const incomingIds = new Set();
  for (const mod of modules) {
    if (mod.id && !String(mod.id).startsWith('new-')) {
      incomingIds.add(mod.id);
    }
  }

  for (const mod of modules) {
    const orderIndex = mod.order ?? mod.order_index ?? 0;
    if (mod.id && !String(mod.id).startsWith('new-')) {
      await coursesService.updateModule(mod.id, {
        title: mod.title,
        description: mod.description,
        type: mod.type,
        order_index: orderIndex,
        is_visible: mod.is_visible ?? true,
      });
      existingMap.delete(mod.id);
    } else {
      await coursesService.createModule(courseId, {
        title: mod.title,
        description: mod.description,
        type: mod.type,
        order_index: orderIndex,
        is_visible: mod.is_visible ?? true,
      });
    }
  }

  for (const [id] of existingMap) {
    await coursesService.deleteModule(id);
  }

  for (const mod of modules) {
    const realModuleId = mod.id && !String(mod.id).startsWith('new-') ? mod.id : undefined;
    if (!realModuleId) continue;

    const existingContent = await coursesService.listModuleContent(realModuleId);
    const existingContentMap = new Map(existingContent.map((c) => [c.id, c]));

    const lessons = mod.lessons || [];
    const incomingContentIds = new Set();
    for (const lesson of lessons) {
      if (lesson.id && !String(lesson.id).startsWith('new-')) {
        incomingContentIds.add(lesson.id);
      }
    }

    for (const lesson of lessons) {
      const lessonOrder = lesson.order ?? lesson.order_index ?? 0;
      if (lesson.id && !String(lesson.id).startsWith('new-')) {
        await coursesService.updateContent(lesson.id, {
          title: lesson.title,
          type: lesson.type,
          description: lesson.description,
          order_index: lessonOrder,
          url: lesson.url || null,
          duration: lesson.duration || null,
          is_required: lesson.is_required ?? true,
        });
        existingContentMap.delete(lesson.id);
      } else {
        await coursesService.createContent(realModuleId, {
          title: lesson.title,
          type: lesson.type,
          description: lesson.description,
          order_index: lessonOrder,
          url: lesson.url || null,
          duration: lesson.duration || null,
          is_required: lesson.is_required ?? true,
        });
      }
    }

    for (const [id] of existingContentMap) {
      await coursesService.deleteContent(id);
    }
  }

  return getBuilderData(courseId);
}

async function publishCourse(courseId) {
  await coursesService.updateCourse(courseId, { status: 'published' });
  return { success: true };
}

async function submitForReview(courseId) {
  await coursesService.updateCourse(courseId, { status: 'under_review' });
  return { success: true };
}

async function approveCourse(courseId) {
  await coursesService.updateCourse(courseId, { status: 'published' });
  return { success: true };
}

module.exports = {
  getBuilderData,
  updateBuilder,
  publishCourse,
  submitForReview,
  approveCourse,
};
