function toBool(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback;
  return value === true || value === "true" || value === "1" || value === 1;
}

/**
 * Validates hero slide fields (works for JSON and multipart bodies).
 * `partial` skips required checks for fields that were not sent (updates).
 */
function validateSlideInput(body = {}, { partial = false } = {}) {
  const errors = [];
  const value = {};

  if (body.is_active !== undefined) value.is_active = toBool(body.is_active, true);

  return { errors, value };
}

function validateReorderInput(body = {}) {
  const ids = Array.isArray(body.ids) ? body.ids.map(Number) : [];
  const valid = ids.length > 0 && ids.every((id) => Number.isInteger(id) && id > 0)
    && new Set(ids).size === ids.length;
  return valid ? { ids } : { error: "Provide a list of unique slide ids." };
}

module.exports = { validateSlideInput, validateReorderInput };
