import './utils/env';
import express from 'express';
import cors from 'cors';
import leadRouter from './routes/leads';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors({
  origin: '*', // Allow connections from any frontend origin during local development
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  logger.info(` SimplifIQ Lead Automation API running in ${process.env.NODE_ENV || 'development'} mode`);
  logger.info(` Local Access Endpoint: http://localhost:${PORT}`);
  logger.info(` Health Diagnostic Check: http://localhost:${PORT}/`);
  logger.info(`=======================================================`);
});
