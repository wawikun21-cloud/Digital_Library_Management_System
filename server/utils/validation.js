/**
 * Validation Utilities
 * Server-side input validation helpers
 */

const VALIDATION_RULES = {
  TITLE_MIN_LENGTH: 1,
  TITLE_MAX_LENGTH: 255,
  AUTHOR_MAX_LENGTH: 255,
  GENRE_MAX_LENGTH: 100,
  ISBN_LENGTH: 10,
  ISBN_13_LENGTH: 13,
  YEAR_MIN: 1000,
  YEAR_MAX: new Date().getFullYear() + 1,
  QUANTITY_MIN: 0,
  QUANTITY_MAX: 9999,
  DESCRIPTION_MAX_LENGTH: 5000,
};

/**
 * Validate required field
 */
function validateRequired(value, fieldName) {
  if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
    return { valid: false, error: `${fieldName} is required` };
  }
  return { valid: true };
}

/**
 * Validate string length
 */
function validateLength(value, fieldName, min, max) {
  const length = value ? value.toString().length : 0;
  
  if (min && length < min) {
    return { valid: false, error: `${fieldName} must be at least ${min} characters` };
  }
  if (max && length > max) {
    return { valid: false, error: `${fieldName} must be less than ${max} characters` };
  }
  
  return { valid: true };
}

/**
 * Validate number range
 */
function validateNumberRange(value, fieldName, min, max) {
  const num = Number(value);
  
  if (isNaN(num)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  
  if (min !== undefined && num < min) {
    return { valid: false, error: `${fieldName} must be at least ${min}` };
  }
  if (max !== undefined && num > max) {
    return { valid: false, error: `${fieldName} must be less than ${max}` };
  }
  
  return { valid: true };
}

/**
 * Validate ISBN format
 */
function validateIsbn(isbn) {
  if (!isbn || !isbn.trim()) {
    return { valid: false, error: "ISBN is required" };
  }
  
  const cleanIsbn = isbn.replace(/[^0-9X]/gi, "");
  
  if (cleanIsbn.length !== VALIDATION_RULES.ISBN_LENGTH && 
      cleanIsbn.length !== VALIDATION_RULES.ISBN_13_LENGTH) {
    return { valid: false, error: "ISBN must be 10 or 13 digits" };
  }
  
  return { valid: true };
}

/**
 * Validate book data
 */
function validateBookData(data) {
  const errors = {};
  
  // Title validation
  const titleRequired = validateRequired(data.title, "Title");
  if (!titleRequired.valid) errors.title = titleRequired.error;
  else {
    const titleLength = validateLength(data.title, "Title", VALIDATION_RULES.TITLE_MIN_LENGTH, VALIDATION_RULES.TITLE_MAX_LENGTH);
    if (!titleLength.valid) errors.title = titleLength.error;
  }
  
  // Author validation
  const authorRequired = validateRequired(data.author, "Author");
  if (!authorRequired.valid) errors.author = authorRequired.error;
  else {
    const authorLength = validateLength(data.author, "Author", 1, VALIDATION_RULES.AUTHOR_MAX_LENGTH);
    if (!authorLength.valid) errors.author = authorLength.error;
  }
  
  // Genre validation
  const genreRequired = validateRequired(data.genre, "Genre");
  if (!genreRequired.valid) errors.genre = genreRequired.error;
  else {
    const genreLength = validateLength(data.genre, "Genre", 1, VALIDATION_RULES.GENRE_MAX_LENGTH);
    if (!genreLength.valid) errors.genre = genreLength.error;
  }
  
  // ISBN validation
  const isbnValidation = validateIsbn(data.isbn);
  if (!isbnValidation.valid) errors.isbn = isbnValidation.error;
  
  // Year validation
  const yearRequired = validateRequired(data.year, "Year");
  if (!yearRequired.valid) errors.year = yearRequired.error;
  else {
    const yearValidation = validateNumberRange(data.year, "Year", VALIDATION_RULES.YEAR_MIN, VALIDATION_RULES.YEAR_MAX);
    if (!yearValidation.valid) errors.year = yearValidation.error;
  }
  
  // Publisher validation
  const publisherRequired = validateRequired(data.publisher, "Publisher");
  if (!publisherRequired.valid) errors.publisher = publisherRequired.error;
  
  // Quantity validation (optional, defaults to 1)
  if (data.quantity !== undefined && data.quantity !== null) {
    const quantityValidation = validateNumberRange(data.quantity, "Quantity", VALIDATION_RULES.QUANTITY_MIN, VALIDATION_RULES.QUANTITY_MAX);
    if (!quantityValidation.valid) errors.quantity = quantityValidation.error;
  }
  
  // Description validation (optional)
  if (data.description) {
    const descLength = validateLength(data.description, "Description", 0, VALIDATION_RULES.DESCRIPTION_MAX_LENGTH);
    if (!descLength.valid) errors.description = descLength.error;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate transaction/borrow data
 */
function validateTransactionData(data) {
  const errors = {};
  
  // Book ID validation
  const bookIdRequired = validateRequired(data.book_id, "Book ID");
  if (!bookIdRequired.valid) errors.book_id = bookIdRequired.error;
  
  // Borrower name validation
  const borrowerRequired = validateRequired(data.borrower_name, "Borrower name");
  if (!borrowerRequired.valid) errors.borrower_name = borrowerRequired.error;
  else {
    const borrowerLength = validateLength(data.borrower_name, "Borrower name", 2, 255);
    if (!borrowerLength.valid) errors.borrower_name = borrowerLength.error;
  }
  
  // Contact validation (optional)
  if (data.borrower_contact) {
    const contactLength = validateLength(data.borrower_contact, "Contact", 7, 20);
    if (!contactLength.valid) errors.borrower_contact = contactLength.error;
  }
  
  // Due date validation
  const dueDateRequired = validateRequired(data.due_date, "Due date");
  if (!dueDateRequired.valid) errors.due_date = dueDateRequired.error;
  else {
    const dueDate = new Date(data.due_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (isNaN(dueDate.getTime())) {
      errors.due_date = "Invalid date format";
    } else if (dueDate < today) {
      errors.due_date = "Due date cannot be in the past";
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

module.exports = {
  VALIDATION_RULES,
  validateRequired,
  validateLength,
  validateNumberRange,
  validateIsbn,
  validateBookData,
  validateTransactionData,
};

