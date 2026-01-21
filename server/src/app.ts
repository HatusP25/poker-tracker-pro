import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';

// Import routes
import groupRoutes from './routes/groups';
import playerRoutes from './routes/players';
import sessionRoutes from './routes/sessions';
import statsRoutes from './routes/stats';
import backupRoutes from './routes/backup';
import templateRoutes from './routes/templates';
import liveSessionRoutes from './routes/liveSessions';

const app: Express = express();

// Middleware
// CORS - configure for production
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Security headers for production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api/groups', groupRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/live-sessions', liveSessionRoutes);

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  const publicPath = path.join(__dirname, '..', 'public');

  // Serve static files with caching
  app.use(express.static(publicPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: (res, filePath) => {
      // Cache JavaScript and CSS files for longer
      if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      }
      // Cache images for a week
      if (/\.(jpg|jpeg|png|gif|svg|ico|webp)$/.test(filePath)) {
        res.setHeader('Cache-Control', 'public, max-age=604800');
      }
    }
  }));

  // SPA fallback - serve index.html for all non-API routes
  app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
} else {
  // 404 handler for development (when running separate dev servers)
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });
}

// Error handler (must be last)
app.use(errorHandler);

export default app;
