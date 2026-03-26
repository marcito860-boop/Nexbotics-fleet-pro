import sequelize from '../config/database';
import { Book } from '../models';

const initDb = async () => {
  try {
    await sequelize.sync({ force: true });
    console.log('✅ Database initialized');

    // Add sample books
    const sampleBooks = [
      {
        title: 'The Digital Entrepreneur',
        author: 'John Smith',
        description: 'A comprehensive guide to building successful online businesses in the modern digital landscape. Learn strategies for e-commerce, digital marketing, and scaling your venture.',
        price: 29.99,
        coverImage: '/uploads/covers/sample1.jpg',
        filePath: '/uploads/books/sample1.pdf',
        category: 'Business',
        pages: 245,
        featured: true
      },
      {
        title: 'Mindful Living in a Busy World',
        author: 'Sarah Johnson',
        description: 'Discover practical techniques for maintaining balance and peace in your daily life. This book offers actionable steps for reducing stress and increasing happiness.',
        price: 19.99,
        coverImage: '/uploads/covers/sample2.jpg',
        filePath: '/uploads/books/sample2.pdf',
        category: 'Self-Help',
        pages: 180,
        featured: true
      },
      {
        title: 'The Art of Storytelling',
        author: 'Michael Chen',
        description: 'Master the craft of compelling narrative. From character development to plot structure, this guide covers everything you need to become a captivating storyteller.',
        price: 24.99,
        coverImage: '/uploads/covers/sample3.jpg',
        filePath: '/uploads/books/sample3.pdf',
        category: 'Writing',
        pages: 312,
        featured: false
      }
    ];

    for (const book of sampleBooks) {
      await Book.create(book as any);
    }

    console.log('✅ Sample books added');
    process.exit(0);
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

initDb();
