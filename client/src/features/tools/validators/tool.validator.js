const VALID_CATEGORIES = ["general", "education", "design", "templates", "software", "documents"];

export function validateTool(data, options = {}) {
  const { requireFile = false } = options;
  const errors = {};

  if (!data.title || String(data.title).trim().length < 3) {
    errors.title = "Title must be at least 3 characters";
  }

  const description = String(data.description || "").trim();
  if (description.length < 10) {
    errors.description = "Description must be at least 10 characters";
  }

  if (data.category && !VALID_CATEGORIES.includes(data.category)) {
    errors.category = "Invalid category";
  }

  if (requireFile && !data.file) {
    errors.file = "A downloadable file is required";
  }

  return { errors, isValid: Object.keys(errors).length === 0 };
}
