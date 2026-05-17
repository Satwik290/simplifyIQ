import './utils/env'; // Must load env first!
import { config } from './config';
import express from 'express';
import cors from 'cors';
import leadRouter from './routes/leads';
import { logger } from './utils/logger';
import { leadFormLimiter, generalApiLimiter } from './middleware/rateLimit';

const app = express();
const PORT = config.PORT;

const ALLOWED_ORIGINS = [
  'http://localhost:3000', // Development
  'https://simplif-iq.com', // Production
  'https://www.simplif-iq.com'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, health checks, or curl requests)
    if (!origin) return callback(null, true);
    
    if (ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Allow cookies if needed
  maxAge: 3600 // Preflight cache 1 hour
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mount rate limiters
app.use('/api/', generalApiLimiter);
app.use('/api/leads', leadFormLimiter);

// Health Check Endpoint (useful for Docker container or hosting service checks)
app.get('/', (_req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'SimplifIQ Lead Automation Backend API',
    timestamp: new Date().toISOString()
  });
});

// Mount modular endpoints
app.use('/api/leads', leadRouter);

// Global Error Handler Middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled Exception occurred in Express server process', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error occurred',
    message: err.message
  });
});

// Launch server listener
app.listen(PORT, () => {
  logger.info(`=======================================================`);
  logger.info(` SimplifIQ Lead Automation API running in ${config.NODE_ENV} mode`);
  logger.info(` Local Access Endpoint: http://localhost:${PORT}`);
  logger.info(` Health Diagnostic Check: http://localhost:${PORT}/`);
  logger.info(`=======================================================`);
});
