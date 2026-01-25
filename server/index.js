import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

console.log('Starting server...');
console.log('Node version:', process.version);
console.log('PORT:', process.env.PORT || 3001);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// HEALTH CHECK FIRST - before anything else
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// START SERVER IMMEDIATELY
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);

  // Load everything else AFTER server is running
  loadApp();
});

async function loadApp() {
  try {
    // Trust proxy
    app.set('trust proxy', 1);

    // Helmet
    const frontendUrls = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',');
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:", "blob:"],
          connectSrc: ["'self'", ...frontendUrls, "https://amini-academy-api.onrender.com"],
          frameSrc: ["'self'", "https://www.youtube.com", "https://drive.google.com"],
          mediaSrc: ["'self'", "https:", "blob:"],
        },
      },
      crossOriginEmbedderPolicy: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }));

    // Rate limiter
    const { generalLimiter } = await import('./middleware/rateLimiter.js');
    app.use('/api/', generalLimiter);

    // CORS
    const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173').split(',');
    app.use(cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }));

    // Body parsing
    app.use(express.json({ limit: '1mb' }));
    app.use(express.urlencoded({ extended: true, limit: '1mb' }));

    // Static files
    const uploadDir = process.env.UPLOAD_DIR || path.join(__dirname, 'uploads');
    app.use('/uploads', express.static(uploadDir));

    // Load routes
    console.log('Loading routes...');
    const authRoutes = (await import('./routes/auth.js')).default;
    const courseRoutes = (await import('./routes/courses.js')).default;
    const progressRoutes = (await import('./routes/progress.js')).default;
    const pathRoutes = (await import('./routes/paths.js')).default;
    const adminRoutes = (await import('./routes/admin.js')).default;
    const uploadRoutes = (await import('./routes/upload.js')).default;

    app.use('/api/auth', authRoutes);
    app.use('/api/courses', courseRoutes);
    app.use('/api/progress', progressRoutes);
    app.use('/api/paths', pathRoutes);
    app.use('/api/admin', adminRoutes);
    app.use('/api/upload', uploadRoutes);

    console.log('Server ready');
  } catch (error) {
    console.error('Error loading app:', error);
  }
}

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
