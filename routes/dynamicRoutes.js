// routes/dynamicRoutes.js
const express = require('express');
const createCRUDController = require('../controllers/genericController');
const { getModel } = require('../models');
const { protect, authorize } = require('../middleware/authMiddleware');

// Import validators
const { userRegistrationRules, userUpdateRules, validate } = require('../validators/userValidators');
// In a real app, you'd have a way to load validators dynamically or a larger switch case
// e.g., const collectionValidators = require('../validators');

const router = express.Router();

const modelMiddleware = (req, res, next) => {
  const modelName = req.params.collectionName.toLowerCase();
  const Model = getModel(modelName);

  if (!Model) {
    return res.status(404).json({ message: `Collection '${req.params.collectionName}' not found.` });
  }
  req.Model = Model;
  req.crudController = createCRUDController(Model);
  next();
};

router.use('/:collectionName', modelMiddleware);
router.use('/:collectionName/:id', modelMiddleware);

// Middleware to select appropriate validation rules
const selectValidationRules = (req, res, next) => {
  const collectionName = req.params.collectionName.toLowerCase();
  // Only applying to 'users' collection for this example
  if (collectionName === 'users') {
    if (req.method === 'POST') {
      // Apply registration rules, then validate
      // This runs the rules and attaches errors to req if any.
      // `validate` then checks and responds if errors exist.
      // Each rule in userRegistrationRules() is a middleware. We need to chain them.
      // The `validate` function acts as the final step in the chain.
      const rules = userRegistrationRules();
      // Chain the rules and the final validation handler
      // Run each validation rule
      Promise.all(rules.map(rule => rule.run(req)))
        .then(() => {
          // After all rules have run, call the validate middleware
          validate(req, res, next);
        })
        .catch(next); // Pass errors to the global error handler
      return;
    } else if (req.method === 'PUT') {
      const rules = userUpdateRules();
      Promise.all(rules.map(rule => rule.run(req)))
        .then(() => {
          validate(req, res, next);
        })
        .catch(next);
      return;
    }
  }
  // If no specific rules for this collection/method, just proceed
  next();
};


// Apply validation middleware before the controller actions
router.post('/:collectionName', protect, selectValidationRules, (req, res, next) => {
    // If selectValidationRules called next() without an error (meaning validation passed or no rules applied),
    // then proceed to the controller. If validate() in selectValidationRules sent a response, this won't be reached.
    if (!res.headersSent) { // Check if response has already been sent by validator
        req.crudController.createOne(req, res, next);
    }
});

router.get('/:collectionName', (req, res, next) => req.crudController.getAll(req, res, next));
router.get('/:collectionName/:id', (req, res, next) => req.crudController.getOne(req, res, next));

router.put('/:collectionName/:id', protect, selectValidationRules, (req, res, next) => {
    if (!res.headersSent) {
        req.crudController.updateOne(req, res, next);
    }
});

router.delete('/:collectionName/:id', protect, authorize(['admin']), (req, res, next) => req.crudController.deleteOne(req, res, next));

module.exports = router;
