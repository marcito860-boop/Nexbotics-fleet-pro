import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { Transaction, Book } from '../models';

// Download book with token verification - serves from LOCAL disk
export const downloadBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const transaction = await Transaction.findOne({
      where: { downloadToken: token, status: 'completed' },
      include: [{ model: Book, as: 'book' }]
    });

    if (!transaction) {
      res.status(404).json({ success: false, error: 'Invalid or expired download link' });
      return;
    }

    // Check if link has expired
    if (new Date() > new Date(transaction.expiresAt)) {
      res.status(410).json({ success: false, error: 'Download link has expired' });
      return;
    }

    const book = transaction.book;
    if (!book) {
      res.status(404).json({ success: false, error: 'Book not found' });
      return;
    }

    // Get file path
    const filePath = path.join(process.cwd(), book.filePath);

    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: 'File not found on server' });
      return;
    }

    // Increment download count
    await Book.increment('downloadCount', { where: { id: book.id } });

    // Set headers for download
    const filename = `${book.title.replace(/[^a-zA-Z0-9]/g, '_')}${path.extname(filePath)}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ success: false, error: 'Download failed' });
  }
};

// Verify download token (for success page)
export const verifyDownloadToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    const transaction = await Transaction.findOne({
      where: { downloadToken: token, status: 'completed' },
      include: [{ model: Book, as: 'book', attributes: ['id', 'title', 'author'] }]
    });

    if (!transaction) {
      res.status(404).json({ success: false, error: 'Invalid download token' });
      return;
    }

    const isExpired = new Date() > new Date(transaction.expiresAt);

    res.json({
      success: true,
      data: {
        valid: !isExpired,
        book: transaction.book,
        expiresAt: transaction.expiresAt
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
};
