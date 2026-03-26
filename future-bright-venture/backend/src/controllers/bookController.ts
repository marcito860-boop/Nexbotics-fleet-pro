import { Request, Response } from 'express';
import { Op } from 'sequelize';
import fs from 'fs';
import path from 'path';
import { Book } from '../models';

// LOCAL STORAGE - Files saved to uploads/ folder
const uploadsDir = path.join(process.cwd(), 'uploads');
const coversDir = path.join(uploadsDir, 'covers');
const booksDir = path.join(uploadsDir, 'books');

// Create directories if they don't exist
[uploadsDir, coversDir, booksDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Get all books (public)
export const getAllBooks = async (req: Request, res: Response): Promise<void> => {
  try {
    const { featured, search, category } = req.query;
    
    const whereClause: any = {};
    
    if (featured === 'true') {
      whereClause.featured = true;
    }
    
    if (category) {
      whereClause.category = category;
    }
    
    if (search) {
      whereClause[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { author: { [Op.like]: `%${search}%` } }
      ];
    }

    const books = await Book.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, data: books });
  } catch (error) {
    console.error('Error fetching books:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch books' });
  }
};

// Get single book (public)
export const getBookById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const book = await Book.findByPk(id);
    
    if (!book) {
      res.status(404).json({ success: false, error: 'Book not found' });
      return;
    }
    
    res.json({ success: true, data: book });
  } catch (error) {
    console.error('Error fetching book:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch book' });
  }
};

// Create book (admin only) - saves to LOCAL disk
export const createBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, author, description, price, category, pages, language, featured } = req.body;
    
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    if (!files?.coverImage || !files?.bookFile) {
      res.status(400).json({ success: false, error: 'Both cover image and book file are required' });
      return;
    }

    const coverFile = files.coverImage[0];
    const bookFile = files.bookFile[0];

    // Generate unique filenames
    const coverFilename = `${Date.now()}-${coverFile.originalname}`;
    const bookFilename = `${Date.now()}-${bookFile.originalname}`;

    // Save files to disk
    fs.writeFileSync(path.join(coversDir, coverFilename), coverFile.buffer);
    fs.writeFileSync(path.join(booksDir, bookFilename), bookFile.buffer);

    // Store relative paths in database
    const coverImage = `/uploads/covers/${coverFilename}`;
    const filePath = `/uploads/books/${bookFilename}`;

    const book = await Book.create({
      title,
      author,
      description,
      price: parseFloat(price),
      coverImage,
      filePath,
      category: category || 'General',
      pages: pages ? parseInt(pages) : null,
      language: language || 'English',
      featured: featured === 'true' || featured === true
    });

    res.status(201).json({ success: true, data: book });
  } catch (error) {
    console.error('Error creating book:', error);
    res.status(500).json({ success: false, error: 'Failed to create book' });
  }
};

// Update book (admin only)
export const updateBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, author, description, price, category, pages, language, featured } = req.body;
    
    const book = await Book.findByPk(id);
    if (!book) {
      res.status(404).json({ success: false, error: 'Book not found' });
      return;
    }

    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    
    const updateData: any = {
      title: title || book.title,
      author: author || book.author,
      description: description || book.description,
      price: price ? parseFloat(price) : book.price,
      category: category || book.category,
      pages: pages ? parseInt(pages) : book.pages,
      language: language || book.language,
      featured: featured !== undefined ? (featured === 'true' || featured === true) : book.featured
    };

    // Handle new file uploads
    if (files?.coverImage) {
      // Delete old cover
      const oldCoverPath = path.join(process.cwd(), book.coverImage);
      if (fs.existsSync(oldCoverPath)) fs.unlinkSync(oldCoverPath);
      
      // Save new cover
      const coverFilename = `${Date.now()}-${files.coverImage[0].originalname}`;
      fs.writeFileSync(path.join(coversDir, coverFilename), files.coverImage[0].buffer);
      updateData.coverImage = `/uploads/covers/${coverFilename}`;
    }

    if (files?.bookFile) {
      // Delete old book file
      const oldFilePath = path.join(process.cwd(), book.filePath);
      if (fs.existsSync(oldFilePath)) fs.unlinkSync(oldFilePath);
      
      // Save new book file
      const bookFilename = `${Date.now()}-${files.bookFile[0].originalname}`;
      fs.writeFileSync(path.join(booksDir, bookFilename), files.bookFile[0].buffer);
      updateData.filePath = `/uploads/books/${bookFilename}`;
    }

    await book.update(updateData);
    res.json({ success: true, data: book });
  } catch (error) {
    console.error('Error updating book:', error);
    res.status(500).json({ success: false, error: 'Failed to update book' });
  }
};

// Delete book (admin only)
export const deleteBook = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const book = await Book.findByPk(id);
    
    if (!book) {
      res.status(404).json({ success: false, error: 'Book not found' });
      return;
    }

    // Delete local files
    const coverPath = path.join(process.cwd(), book.coverImage);
    const filePath = path.join(process.cwd(), book.filePath);
    
    if (fs.existsSync(coverPath)) fs.unlinkSync(coverPath);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await book.destroy();
    res.json({ success: true, message: 'Book deleted successfully' });
  } catch (error) {
    console.error('Error deleting book:', error);
    res.status(500).json({ success: false, error: 'Failed to delete book' });
  }
};

// Get categories
export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Book.findAll({
      attributes: ['category'],
      group: ['category']
    });
    res.json({ success: true, data: categories.map(c => c.category) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
};
