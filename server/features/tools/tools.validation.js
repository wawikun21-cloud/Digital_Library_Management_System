const { body } = require("express-validator");

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const validateToolCreate = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ max: 255 })
    .withMessage("Title must be less than 255 characters"),
  body("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Description must be less than 2000 characters"),
  body("category")
    .optional()
    .isIn(["general", "education", "design", "templates", "software", "documents"])
    .withMessage("Invalid category"),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

const validateToolUpdate = [
  body("title")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Title cannot be empty")
    .isLength({ max: 255 })
    .withMessage("Title must be less than 255 characters"),
  body("description")
    .optional()
    .isLength({ max: 2000 })
    .withMessage("Description must be less than 2000 characters"),
  body("category")
    .optional()
    .isIn(["general", "education", "design", "templates", "software", "documents"])
    .withMessage("Invalid category"),
  body("is_active")
    .optional()
    .isBoolean()
    .withMessage("is_active must be a boolean"),
];

module.exports = {
  validateToolCreate,
  validateToolUpdate,
  MAX_FILE_SIZE,
};
