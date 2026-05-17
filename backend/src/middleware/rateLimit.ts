import rateLimit from 'express-rate-limit';

export const leadFormLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minute window
  max: 10, // Max 10 submissions per IP per 15 mins
  message: { error: 'Too many lead submissions from this IP. Please try again later.' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  keyGenerator: (req) => {
    // Use IP from request (or X-Forwarded-For if behind proxy)
    return req.ip || req.socket.remoteAddress || 'unknown';
  },
  skip: (req) => {
    // Don't rate limit health checks
    return req.path === '/';
  }
});

export const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute per IP
  message: { error: 'Too many requests. Please try again later.' }
});
