import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import sequelize from './config/database';
import { createInitialAdmin } from './controllers/authController';
import Book from './models/Book';

import bookRoutes from './routes/books';
import authRoutes from './routes/auth';
import paymentRoutes from './routes/payments';
import downloadRoutes from './routes/downloads';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Stripe webhook needs raw body
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploads folder) - LOCAL STORAGE
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Routes
app.use('/api/books', bookRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/downloads', downloadRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Database connection and server start
const startServer = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    await sequelize.sync({ alter: true });
    console.log('✅ Database synced');

    // Seed sample books if none exist
    const bookCount = await Book.count();
    if (bookCount === 0) {
      console.log('🌱 Seeding sample books...');
      await Book.bulkCreate([
        {
          title: 'The Great Gatsby',
          author: 'F. Scott Fitzgerald',
          description: 'A classic American novel set in the Jazz Age.',
          price: 9.99,
          coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400',
          filePath: '/uploads/books/gatsby.pdf',
          category: 'Fiction',
          featured: true,
          pages: 180,
          language: 'English'
        },
        {
          title: 'Clean Code',
          author: 'Robert C. Martin',
          description: 'A handbook of agile software craftsmanship.',
          price: 29.99,
          coverImage: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=400',
          filePath: '/uploads/books/clean-code.pdf',
          category: 'Technology',
          featured: true,
          pages: 464,
          language: 'English'
        },
        {
          title: 'Sapiens',
          author: 'Yuval Noah Harari',
          description: 'A brief history of humankind.',
          price: 14.99,
          coverImage: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400',
          filePath: '/uploads/books/sapiens.pdf',
          category: 'History',
          featured: false,
          pages: 443,
          language: 'English'
        },
        {
          title: 'Atomic Habits',
          author: 'James Clear',
          description: 'Tiny changes, remarkable results.',
          price: 12.99,
          coverImage: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400',
          filePath: '/uploads/books/atomic-habits.pdf',
          category: 'Self-Help',
          featured: true,
          pages: 320,
          language: 'English'
        },
        {
          title: '1984',
          author: 'George Orwell',
          description: 'A dystopian social science fiction novel.',
          price: 8.99,
          coverImage: 'https://images.unsplash.com/photo-1535905557558-afc4877a26fc?w=400',
          filePath: '/uploads/books/1984.pdf',
          category: 'Fiction',
          featured: false,
          pages: 328,
          language: 'English'
        },
        {
          title: 'Python Crash Course',
          author: 'Eric Matthes',
          description: 'A hands-on project-based introduction to programming.',
          price: 24.99,
          coverImage: 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?w=400',
          filePath: '/uploads/books/python-crash-course.pdf',
          category: 'Technology',
          featured: true,
          pages: 544,
          language: 'English'
        }
      ]);
      console.log('✅ Sample books seeded');
    }

    await createInitialAdmin();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📁 Local file storage: ${path.join(process.cwd(), 'uploads')}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
