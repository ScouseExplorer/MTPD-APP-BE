const Joi = require('joi');

const validateRequest = (schema, property = 'body') => async (req, res, next) => {
  try {
    const { error, value } = schema.validate(req[property], { abortEarly: false, stripUnknown: true });
    if (error) {
      const errors = error.details.map(d => ({ path: d.path.join('.'), message: d.message }));
      return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }
    req[property] = value;
    return next();
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

module.exports = { validateRequest };