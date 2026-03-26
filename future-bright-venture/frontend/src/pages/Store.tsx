import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Button, Form, InputGroup } from 'react-bootstrap'
import { motion } from 'framer-motion'
import { Search, Filter, BookOpen } from 'lucide-react'
import { Link } from 'react-router-dom'
import { bookService } from '../services/bookService'
import { Book } from '../types'

const Store: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([])
  const [filteredBooks, setFilteredBooks] = useState<Book[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    filterBooks()
  }, [searchQuery, selectedCategory, books])

  const loadData = async () => {
    try {
      const [booksData, categoriesData] = await Promise.all([
        bookService.getAll(),
        bookService.getCategories()
      ])
      setBooks(booksData)
      setFilteredBooks(booksData)
      setCategories(categoriesData)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterBooks = () => {
    let result = books

    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      )
    }

    if (selectedCategory) {
      result = result.filter(book => book.category === selectedCategory)
    }

    setFilteredBooks(result)
  }

  return (
    <>
      {/* Hero */}
      <section className="store-hero">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="mb-4">
              <BookOpen size={48} color="white" className="mb-3" />
            </div>
            <h1 className="store-title">Books & Publications</h1>
            <p className="store-subtitle mx-auto" style={{ maxWidth: '600px' }}>
              Browse our carefully curated selection of premium digital books. 
              Instant downloads, secure payments, endless knowledge.
            </p>
          </motion.div>
        </Container>
      </section>

      {/* Filters */}
      <section className="py-4" style={{ background: 'var(--section-bg)', borderBottom: '1px solid var(--border-color)' }}>
        <Container>
          <Row className="g-3 align-items-center">
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text style={{ background: 'white', borderColor: 'var(--border-color)' }}>
                  <Search size={18} color="#64748b" />
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search books by title or author..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                  style={{ background: 'white' }}
                />
              </InputGroup>
            </Col>
            <Col md={6}>
              <InputGroup>
                <InputGroup.Text style={{ background: 'white', borderColor: 'var(--border-color)' }}>
                  <Filter size={18} color="#64748b" />
                </InputGroup.Text>
                <Form.Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="search-input"
                  style={{ background: 'white' }}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Form.Select>
              </InputGroup>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Books Grid */}
      <section className="section-padding">
        <Container>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-5">
              <p className="text-secondary">No books found matching your criteria.</p>
              <Button 
                className="btn-custom-outline mt-3"
                onClick={() => { setSearchQuery(''); setSelectedCategory('') }}
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <Row className="g-4">
              {filteredBooks.map((book, index) => (
                <Col lg={3} md={4} sm={6} key={book.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.05 }}
                  >
                    <Card className="book-card">
                      <div className="position-relative overflow-hidden">
                        <Card.Img 
                          variant="top" 
                          src={book.coverImage}
                          alt={book.title}
                          style={{ height: '280px', objectFit: 'cover' }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450/1e40af/ffffff?text=Book+Cover'
                          }}
                        />
                        {book.featured && <span className="featured-badge">Featured</span>}
                      </div>
                      <Card.Body>
                        <div className="mb-2">
                          <span 
                            className="badge"
                            style={{ 
                              background: 'rgba(30, 64, 175, 0.1)',
                              color: '#1e40af',
                              fontSize: '0.7rem'
                            }}
                          >
                            {book.category}
                          </span>
                        </div>
                        <Card.Title style={{ fontSize: '1rem' }}>{book.title}</Card.Title>
                        <Card.Text style={{ fontSize: '0.875rem' }}>{book.author}</Card.Text>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="price-tag" style={{ fontSize: '0.9rem', padding: '0.375rem 0.75rem' }}>
                            ${book.price}
                          </span>
                          <Link to={`/book/${book.id}`}>
                            <Button 
                              className="btn-custom-primary" 
                              size="sm"
                              style={{ padding: '0.5rem 1rem' }}
                            >
                              Buy Now
                            </Button>
                          </Link>
                        </div>
                      </Card.Body>
                    </Card>
                  </motion.div>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>
    </>
  )
}

export default Store
