import { Router } from 'express';
import { downloadBook, verifyDownloadToken } from '../controllers/downloadController';

const router = Router();

// Verify token (for success page)
router.get('/verify/:token', verifyDownloadToken);

// Download file
router.get('/:token', downloadBook);

export default router;
