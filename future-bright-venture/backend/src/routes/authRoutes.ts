import { Router } from 'express';
import { body } from 'express-validator';
import { login, verifyToken } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.post('/login', [
  body('username').notEmpty().withMessage('Username is required'),
  body('password').notEmpty().withMessage('Password is required')
], login);

router.get('/verify', authenticateToken, verifyToken);

export default router;