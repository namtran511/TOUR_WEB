const successResponse = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    data
  });
};

const errorResponse = (res, message, data = null, statusCode = 500) => {
  return res.status(statusCode).json({
    status: 'error',
    message,
    data
  });
};

module.exports = {
  successResponse,
  errorResponse
};
