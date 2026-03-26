import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

export const generateDownloadToken = (bookId: number): string => {
  const token = uuidv4();
  return token;
};

export const generateJWT = (payload: { id: number; username: string }): string => {
  return jwt.sign(payload, process.env.JWT_SECRET || 'fallbacksecret', {
    expiresIn: '24h'
  });
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

export const sanitizeFilename = (filename: string): string => {
  return filename.replace(/[^a-zA-Z0-9.-]/g, '_');
};
