import React from 'react';
import { Card, Badge } from 'react-bootstrap';
import { Link } from 'react-router-dom';

interface Book {
  id: number;
  title: string;
  author: string;
  description: string;
  price: number;
  cover_image: string;
  featured: boolean;
  category: string;
}

interface BookCardProps {
  book: Book;
}

const BookCard: React.FC<BookCardProps> = ({ book }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  return (
    <Card className="book-card h-100 position-relative">
      {book.featured && (
        <div className="featured-badge">Featured</div>
      )}
      <Card.Img 
        variant="top" 
        src={`${API_URL}${book.cover_image}`} 
        alt={book.title}
      />
      <Card.Body className="d-flex flex-column">
        <div className="mb-2">
          <span className="category-badge">{book.category}</span>
        </div>
        <Card.Title className="h5">{book.title}</Card.Title>
        <Card.Subtitle className="mb-2 text-muted">
          by {book.author}
        </Card.Subtitle>
        
        <Card.Text className="text-truncate flex-grow-1">
          {book.description}
        </Card.Text>
        
        <div className="d-flex justify-content-between align-items-center mt-auto">
          <span className="price-tag">${book.price}</span>
          <Link 
            to={`/book/${book.id}`} 
            className="btn btn-primary btn-sm"
          >
            View Details
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
};

export default BookCard;