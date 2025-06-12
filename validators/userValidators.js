// validators/userValidators.js
const { body, validationResult } = require('express-validator');

// Validation rules for user registration (can be more specific than basic model validation)
const userRegistrationRules = () => {
  return [
    body('email')
      .isEmail().withMessage('Must be a valid email address')
      .normalizeEmail(), // Sanitizer
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
      // We don't sanitize password here as hashing handles it.
      // Avoid logging/returning password.
      .trim(), // Sanitizer (removes whitespace from ends)
    body('roles')
      .optional()
      .isArray().withMessage('Roles must be an array of strings')
      .custom(roles => roles.every(role => typeof role === 'string'))
      .withMessage('Each role must be a string')
      .customSanitizer(roles => roles.map(role => role.toLowerCase().trim())) // Sanitize roles
  ];
};

// Validation rules for updating a user (different from registration, e.g., password optional)
const userUpdateRules = () => {
  return [
    body('email')
      .optional()
      .isEmail().withMessage('Must be a valid email address')
      .normalizeEmail(),
    body('password')
      .optional()
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long (if provided)')
      .trim(),
    body('roles')
      .optional()
      .isArray().withMessage('Roles must be an array of strings')
      .custom(roles => roles.every(role => typeof role === 'string'))
      .withMessage('Each role must be a string')
      .customSanitizer(roles => roles.map(role => role.toLowerCase().trim()))
  ];
};

// Generic function to handle validation results
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }
  const extractedErrors = [];
  errors.array().map(err => extractedErrors.push({ [err.param || err.path]: err.msg })); // err.param is for older versions, err.path for newer

  return res.status(422).json({ // 422 Unprocessable Entity
    success: false,
    errors: extractedErrors,
  });
};

module.exports = {
  userRegistrationRules,
  userUpdateRules,
  validate,
};
