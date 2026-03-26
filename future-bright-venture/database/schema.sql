# MySQL Database Schema for Future Bright Venture

-- Create database
CREATE DATABASE IF NOT EXISTS futurebright CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

USE futurebright;

-- Admins table
CREATE TABLE admins (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Books table
CREATE TABLE books (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  author VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  cover_image VARCHAR(500) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  featured BOOLEAN DEFAULT FALSE,
  category VARCHAR(100) DEFAULT 'General',
  pages INT,
  language VARCHAR(50) DEFAULT 'English',
  download_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Transactions table
CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  book_id INT NOT NULL,
  payment_method ENUM('mpesa', 'paypal', 'stripe') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  customer_phone VARCHAR(20),
  customer_email VARCHAR(255),
  customer_name VARCHAR(255),
  download_token VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  payment_reference VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Indexes for better performance
CREATE INDEX idx_books_featured ON books(featured);
CREATE INDEX idx_books_category ON books(category);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_token ON transactions(download_token);
