const { ZodError } = require('zod');

const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      params: req.params,
      query: req.query
    });

    req.body = parsed.body || req.body;
    req.params = parsed.params || req.params;
    req.query = parsed.query || req.query;

    next();
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        status: 'error',
        message: 'Validation failed',
        data: error.flatten()
      });
    }

    next(error);
  }
};

module.exports = validate;
