import { Router } from 'express';
import { body } from 'express-validator';
import {
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  getFeaturedBooks,
  getCategories
} from '../controllers/bookController';
import { authenticateToken } from '../middleware/auth';
import { uploadCover, uploadBook } from '../middleware/upload';

const router = Router();

// Public routes
router.get('/', getAllBooks);
router.get('/featured', getFeaturedBooks);
router.get('/categories', getCategories);
router.get('/:id', getBookById);

// Protected routes (Admin only)
router.post('/', 
  authenticateToken,
  uploadCover.single('cover_image'),
  uploadBook.single('book_file'),
  [
    body('title').notEmpty().withMessage('Title is required'),
    body('author').notEmpty().withMessage('Author is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('category').notEmpty().withMessage('Category is required')
  ],
  createBook
);

router.put('/:id',
  authenticateToken,
  uploadCover.single('cover_image'),
  uploadBook.single('book_file'),
  [
    body('title').optional().notEmpty().withMessage('Title cannot be empty'),
    body('author').optional().notEmpty().withMessage('Author cannot be empty'),
    body('price').optional().isFloat({ min: 0 }).withMessage('Valid price is required')
  ],
  updateBook
);

router.delete('/:id', authenticateToken, deleteBook);

export default router;