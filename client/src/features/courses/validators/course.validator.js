export function validateCourse(data) {
  const errors = {};
  if (!data.title || String(data.title).trim().length < 3) {
    errors.title = "Title must be at least 3 characters";
  }
  if (!data.description || String(data.description).trim().length < 10) {
    errors.description = "Description must be at least 10 characters";
  }
  if (!data.difficulty || !["beginner", "intermediate", "advanced", "all_levels"].includes(data.difficulty)) {
    errors.difficulty = "Invalid difficulty level";
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}

export function validateModule(data) {
  const errors = {};
  if (!data.title || String(data.title).trim().length < 3) {
    errors.title = "Module title must be at least 3 characters";
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}

export function validateContent(data) {
  const errors = {};
  if (!data.title || String(data.title).trim().length < 3) {
    errors.title = "Content title must be at least 3 characters";
  }
  if (!data.type) {
    errors.type = "Content type is required";
  }
  return { errors, isValid: Object.keys(errors).length === 0 };
}
