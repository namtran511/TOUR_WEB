const notFoundHandler = (req, res, next) => {
  return res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`,
    data: null
  });
};

const globalErrorHandler = (err, req, res, next) => {
  console.error('[GLOBAL ERROR]', err);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return res.status(statusCode).json({
    status: 'error',
    message,
    data: null
  });
};

module.exports = {
  notFoundHandler,
  globalErrorHandler
};
