import dotenv from 'dotenv';
import app from './app';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3001', 10);

// Bind to 0.0.0.0 for Docker/Railway compatibility
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🏥 Health check: http://localhost:${PORT}/api/health`);
});
