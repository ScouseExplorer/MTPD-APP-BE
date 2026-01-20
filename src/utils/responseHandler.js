const successResponse = (res, data = {}, status = 200, message = 'Success') => {
  return res.status(status).json({ success: true, message, data });
};

const errorResponse = (res, message = 'Error', status = 400, errors = []) => {
  return res.status(status).json({ success: false, message, errors });
};

module.exports = { successResponse, errorResponse };