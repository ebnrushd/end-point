// controllers/genericController.js

const createCRUDController = (model) => ({
  // ... (createOne, getOne, updateOne, deleteOne methods remain the same) ...
  createOne: async (req, res, next) => {
    try {
      const doc = await model.create(req.body);
      res.status(201).json({
        success: true,
        data: doc
      });
    } catch (error) {
      console.error(`Error creating document for ${model.modelName}:`, error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
      }
      res.status(500).json({ success: false, message: `Server error creating ${model.modelName}` });
    }
  },

  getOne: async (req, res, next) => {
    try {
      let query = model.findById(req.params.id);
      // Populate based on query param (e.g., ?populate=author,comments)
      if (req.query.populate) {
        const populateFields = req.query.populate.split(',').join(' ');
        query = query.populate(populateFields);
      }
       // Select fields (e.g. ?select=name,email)
      if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
      }

      const doc = await query;

      if (!doc) {
        return res.status(404).json({
          success: false,
          message: `${model.modelName} not found with id ${req.params.id}`
        });
      }
      res.status(200).json({
        success: true,
        data: doc
      });
    } catch (error) {
      console.error(`Error fetching document ${req.params.id} for ${model.modelName}:`, error);
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: `Invalid ID format for ${model.modelName}` });
      }
      res.status(500).json({ success: false, message: `Server error fetching ${model.modelName}` });
    }
  },

  updateOne: async (req, res, next) => {
    try {
      const doc = await model.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
        runValidators: true
      });
      if (!doc) {
        return res.status(404).json({
          success: false,
          message: `${model.modelName} not found with id ${req.params.id}`
        });
      }
      res.status(200).json({
        success: true,
        data: doc
      });
    } catch (error) {
      console.error(`Error updating document ${req.params.id} for ${model.modelName}:`, error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ success: false, message: error.message });
      }
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: `Invalid ID format for ${model.modelName}` });
      }
      res.status(500).json({ success: false, message: `Server error updating ${model.modelName}` });
    }
  },

  deleteOne: async (req, res, next) => {
    try {
      const doc = await model.findByIdAndDelete(req.params.id);
      if (!doc) {
        return res.status(404).json({
          success: false,
          message: `${model.modelName} not found with id ${req.params.id}`
        });
      }
      res.status(200).json({
        success: true,
        message: `${model.modelName} deleted successfully`,
        data: {}
      });
    } catch (error) {
      console.error(`Error deleting document ${req.params.id} for ${model.modelName}:`, error);
      if (error.name === 'CastError') {
        return res.status(400).json({ success: false, message: `Invalid ID format for ${model.modelName}` });
      }
      res.status(500).json({ success: false, message: `Server error deleting ${model.modelName}` });
    }
  },

  getAll: async (req, res, next) => {
    try {
      let query;
      const reqQuery = { ...req.query };

      // Fields to exclude from filtering (special query params)
      const removeFields = ['select', 'sort', 'page', 'limit', 'populate'];
      removeFields.forEach(param => delete reqQuery[param]);

      // Create query string for filtering (e.g., price[gte]=100)
      let queryStr = JSON.stringify(reqQuery);
      queryStr = queryStr.replace(/\b(gt|gte|lt|lte|in|ne|regex|options)\b/g, match => `$${match}`);

      let filter = JSON.parse(queryStr);

      // Handle regex options if provided
      // e.g. title[regex]=pattern&title[options]=i
      for (const key in filter) {
        if (filter[key] && filter[key].$regex && req.query[`${key}[options]`]) {
            filter[key].$options = req.query[`${key}[options]`];
        }
      }

      query = model.find(filter);

      // Select fields (e.g. ?select=name,email)
      if (req.query.select) {
        const fields = req.query.select.split(',').join(' ');
        query = query.select(fields);
      } else {
        query = query.select('-__v'); // Default: exclude __v
      }

      // Sort (e.g. ?sort=name,-createdAt)
      if (req.query.sort) {
        const sortBy = req.query.sort.split(',').join(' ');
        query = query.sort(sortBy);
      } else {
        query = query.sort('-createdAt'); // Default sort by createdAt descending
      }

      // Pagination (e.g. ?page=2&limit=10)
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 25; // Default limit 25
      const startIndex = (page - 1) * limit;
      const endIndex = page * limit;
      const total = await model.countDocuments(filter);

      query = query.skip(startIndex).limit(limit);

      // Populate (e.g. ?populate=author,comments)
      if (req.query.populate) {
        const populateFields = req.query.populate.split(',').join(' ');
        query = query.populate(populateFields);
      }

      // Executing query
      const results = await query;

      // Pagination result
      const pagination = {};
      if (endIndex < total) {
        pagination.next = {
          page: page + 1,
          limit
        };
      }
      if (startIndex > 0) {
        pagination.prev = {
          page: page - 1,
          limit
        };
      }

      res.status(200).json({
        success: true,
        count: results.length,
        total, // Total documents matching filter
        pagination,
        data: results
      });

    } catch (error) {
      console.error(`Error fetching documents for ${model.modelName} with query enhancements:`, error);
      res.status(500).json({ success: false, message: `Server error fetching ${model.modelName}s` });
    }
  }
});

module.exports = createCRUDController;
