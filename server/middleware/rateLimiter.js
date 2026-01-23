import rateLimit from 'express-rate-limit';

// Rate limiting - General API
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting - Auth endpoints (relaxed for development)
export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: 100, // 100 attempts per window (dev-friendly)
  message: { error: 'Too many authentication attempts, please try again in 1 minute.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiting - Admin endpoints
export const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
