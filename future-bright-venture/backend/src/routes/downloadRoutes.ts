import { Router } from 'express';
import { body } from 'express-validator';
import { downloadBook, generateDownloadLink } from '../controllers/downloadController';

const router = Router();

router.get('/:token', downloadBook);
router.post('/link', [
  body('token').notEmpty().withMessage('Token is required')
], generateDownloadLink);

export default router;