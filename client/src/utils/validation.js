/**
 * Validation Utilities
 * Reusable validation helper functions
 */

import { VALIDATION_RULES } from "../constants";

/**
 * Validate required field
 * @param {string} value - Value to validate
 * @returns {string|null} Error message or null if valid
 */
export function validateRequired(value) {
  if (!value || !value.toString().trim()) {
    return "This field is required";
  }
  return null;
}

/**
 * Validate title
 * @param {string} title - Title to validate
 * @returns {Object} { isValid, error }
 */
export function validateTitle(title) {
  if (!title || !title.trim()) {
    return { isValid: false, error: "Title is required" };
  }
  if (title.length > VALIDATION_RULES.TITLE_MAX_LENGTH) {
    return { isValid: false, error: `Title must be less than ${VALIDATION_RULES.TITLE_MAX_LENGTH} characters` };
  }
  return { isValid: true, error: null };
}

/**
 * Validate author
 * @param {string} author - Author to validate
 * @returns {Object} { isValid, error }
 */
export function validateAuthor(author) {
  if (!author || !author.trim()) {
    return { isValid: false, error: "Author is required" };
  }
  if (author.length > VALIDATION_RULES.AUTHOR_MAX_LENGTH) {
    return { isValid: false, error: `Author must be less than ${VALIDATION_RULES.AUTHOR_MAX_LENGTH} characters` };
  }
  return { isValid: true, error: null };
}

/**
 * Validate ISBN
 * @param {string} isbn - ISBN to validate
 * @returns {Object} { isValid, error }
 */
export function validateIsbn(isbn) {
  if (!isbn || !isbn.trim()) {
    return { isValid: false, error: "ISBN is required" };
  }
  
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");
  
  if (cleanIsbn.length !== VALIDATION_RULES.ISBN_LENGTH && 
      cleanIsbn.length !== VALIDATION_RULES.ISBN_13_LENGTH) {
    return { isValid: false, error: "ISBN must be 10 or 13 digits" };
  }
  
  return { isValid: true, error: null };
}

/**
 * Validate year
 * @param {number|string} year - Year to validate
 * @returns {Object} { isValid, error }
 */
export function validateYear(year) {
  if (!year) {
    return { isValid: false, error: "Year is required" };
  }
  
  const yearNum = Number(year);
  const currentYear = VALIDATION_RULES.YEAR_MAX;
  
  if (isNaN(yearNum)) {
    return { isValid: false, error: "Year must be a number" };
  }
  if (yearNum < VALIDATION_RULES.YEAR_MIN || yearNum > currentYear) {
    return { isValid: false, error: `Year must be between ${VALIDATION_RULES.YEAR_MIN} and ${currentYear}` };
  }
  
  return { isValid: true, error: null };
}

/**
 * Validate quantity
 * @param {number|string} quantity - Quantity to validate
 * @returns {Object} { isValid, error }
 */
export function validateQuantity(quantity) {
  const qty = Number(quantity);
  
  if (isNaN(qty)) {
    return { isValid: false, error: "Quantity must be a number" };
  }
  if (qty < VALIDATION_RULES.QUANTITY_MIN || qty > VALIDATION_RULES.QUANTITY_MAX) {
    return { isValid: false, error: `Quantity must be between ${VALIDATION_RULES.QUANTITY_MIN} and ${VALIDATION_RULES.QUANTITY_MAX}` };
  }
  
  return { isValid: true, error: null };
}

/**
 * Validate genre
 * @param {string} genre - Genre to validate
 * @returns {Object} { isValid, error }
 */
export function validateGenre(genre) {
  if (!genre || !genre.trim()) {
    return { isValid: false, error: "Genre is required" };
  }
  if (genre.length > VALIDATION_RULES.GENRE_MAX_LENGTH) {
    return { isValid: false, error: `Genre must be less than ${VALIDATION_RULES.GENRE_MAX_LENGTH} characters` };
  }
  return { isValid: true, error: null };
}

/**
 * Validate publisher
 * @param {string} publisher - Publisher to validate
 * @returns {Object} { isValid, error }
 */
export function validatePublisher(publisher) {
  if (!publisher || !publisher.trim()) {
    return { isValid: false, error: "Publisher is required" };
  }
  return { isValid: true, error: null };
}

/**
 * Validate entire book form
 * @param {Object} formData - Form data object
 * @returns {Object} { isValid, errors }
 */
export function validateBookForm(formData) {
  const errors = {};
  
  const titleResult = validateTitle(formData.title);
  if (!titleResult.isValid) errors.title = titleResult.error;
  
  const authorResult = validateAuthor(formData.author);
  if (!authorResult.isValid) errors.author = authorResult.error;
  
  const genreResult = validateGenre(formData.genre);
  if (!genreResult.isValid) errors.genre = genreResult.error;
  
  const isbnResult = validateIsbn(formData.isbn);
  if (!isbnResult.isValid) errors.isbn = isbnResult.error;
  
  const yearResult = validateYear(formData.year);
  if (!yearResult.isValid) errors.year = yearResult.error;
  
  const publisherResult = validatePublisher(formData.publisher);
  if (!publisherResult.isValid) errors.publisher = publisherResult.error;
  
  if (formData.quantity !== undefined) {
    const qtyResult = validateQuantity(formData.quantity);
    if (!qtyResult.isValid) errors.quantity = qtyResult.error;
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate borrower name
 * @param {string} name - Borrower name
 * @returns {Object} { isValid, error }
 */
export function validateBorrowerName(name) {
  if (!name || !name.trim()) {
    return { isValid: false, error: "Borrower name is required" };
  }
  if (name.length < 2) {
    return { isValid: false, error: "Name must be at least 2 characters" };
  }
  if (name.length > 255) {
    return { isValid: false, error: "Name must be less than 255 characters" };
  }
  return { isValid: true, error: null };
}

/**
 * Validate contact number
 * @param {string} contact - Contact number
 * @returns {Object} { isValid, error }
 */
export function validateContact(contact) {
  if (!contact || !contact.trim()) {
    return { isValid: false, error: "Contact number is required" };
  }
  // Basic phone validation - allows various formats
  const phoneRegex = /^[\d\s\-\+\(\)]{7,20}$/;
  if (!phoneRegex.test(contact)) {
    return { isValid: false, error: "Please enter a valid contact number" };
  }
  return { isValid: true, error: null };
}

/**
 * Validate due date
 * @param {Date|string} dueDate - Due date
 * @returns {Object} { isValid, error }
 */
export function validateDueDate(dueDate) {
  if (!dueDate) {
    return { isValid: false, error: "Due date is required" };
  }
  
  const date = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (date < today) {
    return { isValid: false, error: "Due date cannot be in the past" };
  }
  
  return { isValid: true, error: null };
}

export default {
  validateRequired,
  validateTitle,
  validateAuthor,
  validateIsbn,
  validateYear,
  validateQuantity,
  validateGenre,
  validatePublisher,
  validateBookForm,
  validateBorrowerName,
  validateContact,
  validateDueDate,
};

