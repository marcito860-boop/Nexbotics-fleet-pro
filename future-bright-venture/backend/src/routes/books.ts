import { Router } from 'express';
import { getAllBooks, getBookById, createBook, updateBook, deleteBook, getCategories } from '../controllers/bookController';
import { authenticateToken } from '../middleware/auth';
import { uploadCover, uploadBook } from '../middleware/upload';

const router = Router();

// Public routes
router.get('/', getAllBooks);
router.get('/categories', getCategories);
router.get('/:id', getBookById);

// Admin routes (protected)
router.post('/',
  authenticateToken,
  uploadCover.single('coverImage'),
  uploadBook.single('bookFile'),
  createBook
);

router.put('/:id',
  authenticateToken,
  uploadCover.single('coverImage'),
  uploadBook.single('bookFile'),
  updateBook
);

router.delete('/:id', authenticateToken, deleteBook);

export default router;
