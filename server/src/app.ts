import express, { Express, Request, Response } from 'express';
import cors, { CorsOptions } from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { errorHandler } from './middleware/errorHandler';
import { requireApiKey } from './middleware/requireApiKey';

// Import routes
import groupRoutes from './routes/groups';
import playerRoutes from './routes/players';
import sessionRoutes from './routes/sessions';
import statsRoutes from './routes/stats';
import backupRoutes from './routes/backup';
import templateRoutes from './routes/templates';
import liveSessionRoutes from './routes/liveSessions';
import seasonRoutes from './routes/seasons';

const app: Express = express();

// Behind Railway's proxy: trust it so rate-limit / protocol detection use the
// real client IP rather than the proxy's.
app.set('trust proxy', 1);

// Security headers. CSP is disabled because the SPA is served from the same
// origin and a hand-tuned policy is out of scope here; every other helmet
// default (nosniff, frameguard, referrer-policy, etc.) still applies.
app.use(helmet({ contentSecurityPolicy: false }));

// CORS - explicit allow-list. A credentialed wildcard ("*") is invalid per the
// CORS spec, so we only enable credentials when an explicit origin list is set.
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

const corsOptions: CorsOptions = corsOrigins.length
  ? { origin: corsOrigins, credentials: true, optionsSuccessStatus: 200 }
  : { origin: true, credentials: false, optionsSuccessStatus: 200 }; // dev: reflect origin, no creds
app.use(cors(corsOptions));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Rate limiting for the API surface.
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: Number(process.env.RATE_LIMIT_MAX || 300),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too Many Requests', message: 'Rate limit exceeded, slow down.' },
});

// Health check endpoint (not rate limited so uptime probes never trip the limiter)
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
app.use('/api', apiLimiter);

// Shared-secret gate on mutating requests. No-op unless API_KEY is set, so local
// dev and CI are unaffected; see middleware/requireApiKey.ts and docs/SECURITY.md.
app.use('/api', requireApiKey);

app.use('/api/groups', groupRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/backup', backupRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/live-sessions', liveSessionRoutes);
app.use('/api/seasons', seasonRoutes);

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
  app.get('*', (_req: Request, res: Response) => {
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
