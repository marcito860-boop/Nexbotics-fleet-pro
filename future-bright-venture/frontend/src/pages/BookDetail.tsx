import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Button, Spinner, Modal, Form } from 'react-bootstrap'
import { motion } from 'framer-motion'
import { ArrowLeft, BookOpen, Clock, Globe, ShoppingCart } from 'lucide-react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { bookService } from '../services/bookService'
import { paymentService } from '../services/paymentService'
import { Book } from '../types'
import toast from 'react-hot-toast'
import PaymentModal from '../components/PaymentModal'

const BookDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [book, setBook] = useState<Book | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)

  useEffect(() => {
    if (id) {
      loadBook(parseInt(id))
    }
  }, [id])

  const loadBook = async (bookId: number) => {
    try {
      const data = await bookService.getById(bookId)
      setBook(data)
    } catch (error) {
      console.error('Error loading book:', error)
      toast.error('Failed to load book details')
    } finally {
      setLoading(false)
    }
  }

  const handlePurchase = () => {
    setShowPaymentModal(true)
  }

  const handlePaymentSuccess = (downloadToken: string) => {
    setShowPaymentModal(false)
    navigate(`/success?token=${downloadToken}`)
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  if (!book) {
    return (
      <Container className="py-5 text-center">
        <h2>Book not found</h2>
        <Link to="/store">
          <Button className="btn-custom-primary mt-3">Back to Store</Button>
        </Link>
      </Container>
    )
  }

  return (
    <>
      <section className="section-padding" style={{ paddingTop: '100px' }}>
        <Container>
          <Link to="/store" className="text-decoration-none">
            <Button className="btn-custom-outline mb-4">
              <ArrowLeft size={18} className="me-2" />
              Back to Store
            </Button>
          </Link>

          <Row className="g-5">
            <Col lg={5}>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div 
                  className="rounded-4 overflow-hidden shadow-lg"
                  style={{ border: '1px solid rgba(99, 102, 241, 0.2)' }}
                >
                  <img
                    src={book.coverImage}
                    alt={book.title}
                    className="w-100"
                    style={{ aspectRatio: '2/3', objectFit: 'cover' }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x600/6366f1/ffffff?text=Book+Cover'
                    }}
                  />
                </div>
              </motion.div>
            </Col>

            <Col lg={7}>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="mb-3">
                  <span 
                    className="badge"
                    style={{ 
                      background: 'rgba(99, 102, 241, 0.2)',
                      color: '#6366f1',
                      padding: '0.5rem 1rem'
                    }}
                  >
                    {book.category}
                  </span>
                  {book.featured && (
                    <span 
                      className="badge ms-2"
                      style={{ 
                        background: 'var(--gradient-accent)',
                        padding: '0.5rem 1rem'
                      }}
                    >
                      Featured
                    </span>
                  )}
                </div>

                <h1 className="text-white fw-bold mb-2" style={{ fontSize: '2.5rem' }}>{book.title}</h1>
                <p className="text-secondary mb-4" style={{ fontSize: '1.1rem' }}>by {book.author}</p>

                <div 
                  className="d-flex gap-4 mb-4 p-3 rounded-3"
                  style={{ background: 'var(--card-bg)' }}
                >
                  <div className="d-flex align-items-center gap-2">
                    <BookOpen size={20} color="#6366f1" />
                    <span className="text-secondary">{book.pages || 'N/A'} pages</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Globe size={20} color="#6366f1" />
                    <span className="text-secondary">{book.language}</span>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <Clock size={20} color="#6366f1" />
                    <span className="text-secondary">Instant Download</span>
                  </div>
                </div>

                <div 
                  className="p-4 rounded-4 mb-4"
                  style={{ background: 'var(--card-bg)', border: '1px solid rgba(99, 102, 241, 0.1)' }}
                >
                  <h5 className="text-white mb-3">About this book</h5>
                  <p className="text-secondary mb-0" style={{ lineHeight: 1.8 }}>{book.description}</p>
                </div>

                <div className="d-flex align-items-center gap-4">
                  <div>
                    <p className="text-secondary mb-1">Price</p>
                    <h2 
                      className="fw-bold mb-0"
                      style={{ 
                        background: 'var(--gradient-primary)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      ${book.price}
                    </h2>
                  </div>

                  <Button 
                    className="btn-custom-primary flex-grow-1"
                    style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}
                    onClick={handlePurchase}
                  >
                    <ShoppingCart size={20} className="me-2" />
                    Buy Now
                  </Button>
                </div>

                <p className="text-secondary mt-3 mb-0" style={{ fontSize: '0.875rem' }}>
                  ✓ Secure payment • ✓ Instant download • ✓ 24-hour download link
                </p>
              </motion.div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Payment Modal */}
      <PaymentModal
        show={showPaymentModal}
        onHide={() => setShowPaymentModal(false)}
        book={book}
        onSuccess={handlePaymentSuccess}
      />
    </>
  )
}

export default BookDetail
