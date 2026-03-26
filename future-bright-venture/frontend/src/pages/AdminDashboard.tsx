import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Button, Table, Modal, Form, Spinner, Badge } from 'react-bootstrap'
import { motion } from 'framer-motion'
import { Plus, Edit2, Trash2, LogOut, BookOpen, DollarSign, Download } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { bookService } from '../services/bookService'
import { Book } from '../types'
import toast from 'react-hot-toast'

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { logout, isAuthenticated } = useAuth()
  const [books, setBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    price: '',
    category: '',
    pages: '',
    language: 'English',
    featured: false
  })
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [bookFile, setBookFile] = useState<File | null>(null)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/admin')
      return
    }
    loadBooks()
  }, [isAuthenticated])

  const loadBooks = async () => {
    try {
      const data = await bookService.getAll()
      setBooks(data)
    } catch (error) {
      toast.error('Failed to load books')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/admin')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const data = new FormData()
    data.append('title', formData.title)
    data.append('author', formData.author)
    data.append('description', formData.description)
    data.append('price', formData.price)
    data.append('category', formData.category)
    data.append('pages', formData.pages)
    data.append('language', formData.language)
    data.append('featured', String(formData.featured))
    if (coverFile) data.append('coverImage', coverFile)
    if (bookFile) data.append('bookFile', bookFile)

    try {
      if (editingBook) {
        await bookService.update(editingBook.id, data)
        toast.success('Book updated successfully')
      } else {
        await bookService.create(data)
        toast.success('Book created successfully')
      }
      setShowModal(false)
      resetForm()
      loadBooks()
    } catch (error) {
      toast.error('Failed to save book')
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this book?')) return
    
    try {
      await bookService.delete(id)
      toast.success('Book deleted')
      loadBooks()
    } catch (error) {
      toast.error('Failed to delete book')
    }
  }

  const handleEdit = (book: Book) => {
    setEditingBook(book)
    setFormData({
      title: book.title,
      author: book.author,
      description: book.description,
      price: String(book.price),
      category: book.category,
      pages: String(book.pages || ''),
      language: book.language,
      featured: book.featured
    })
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingBook(null)
    setFormData({
      title: '',
      author: '',
      description: '',
      price: '',
      category: '',
      pages: '',
      language: 'English',
      featured: false
    })
    setCoverFile(null)
    setBookFile(null)
  }

  const totalRevenue = books.reduce((sum, book) => sum + (book.price * book.downloadCount), 0)

  return (
    <div style={{ background: 'var(--darker-bg)', minHeight: '100vh' }}>
      {/* Header */}
      <div 
        className="d-flex justify-content-between align-items-center px-4 py-3"
        style={{ background: 'var(--card-bg)', borderBottom: '1px solid rgba(99, 102, 241, 0.1)' }}
      >
        <h4 className="text-white mb-0 fw-bold"><span style={{ color: '#6366f1' }}>Admin</span> Dashboard</h4>
        <Button 
          className="btn-custom-outline" 
          size="sm"
          onClick={handleLogout}
        >
          <LogOut size={16} className="me-2" />
          Logout
        </Button>
      </div>

      <Container fluid className="py-4 px-4">
        {/* Stats */}
        <Row className="g-3 mb-4">
          {[
            { icon: BookOpen, label: 'Total Books', value: books.length },
            { icon: Download, label: 'Total Downloads', value: books.reduce((sum, b) => sum + b.downloadCount, 0) },
            { icon: DollarSign, label: 'Est. Revenue', value: `$${totalRevenue.toFixed(2)}` }
          ].map((stat, index) => (
            <Col md={4} key={index}>
              <Card 
                className="border-0"
                style={{ background: 'var(--card-bg)', borderRadius: '12px' }}
              >
                <Card.Body className="d-flex align-items-center gap-3">
                  <div 
                    style={{
                      background: 'var(--gradient-primary)',
                      borderRadius: '12px',
                      padding: '1rem'
                    }}
                  >
                    <stat.icon size={24} color="white" />
                  </div>
                  <div>
                    <p className="text-secondary mb-0" style={{ fontSize: '0.875rem' }}>{stat.label}</p>
                    <h3 className="text-white fw-bold mb-0">{stat.value}</h3>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>

        {/* Actions */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="text-white mb-0">All Books</h5>
          <Button 
            className="btn-custom-primary"
            onClick={() => { resetForm(); setShowModal(true); }}
          >
            <Plus size={18} className="me-2" />
            Add Book
          </Button>
        </div>

        {/* Books Table */}
        <Card style={{ background: 'var(--card-bg)', borderRadius: '12px', border: 'none' }}>
          <Card.Body className="p-0">
            {loading ? (
              <div className="text-center py-5">
                <Spinner animation="border" variant="primary" />
              </div>
            ) : (
              <Table responsive className="mb-0" variant="dark">
                <thead>
                  <tr style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                    <th>Book</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Downloads</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map(book => (
                    <tr key={book.id}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <img 
                            src={book.coverImage} 
                            alt={book.title}
                            style={{ width: '40px', height: '60px', objectFit: 'cover', borderRadius: '4px' }}
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'https://via.placeholder.com/40x60/6366f1/ffffff?text=B'
                            }}
                          />
                          <div>
                            <p className="text-white mb-0 fw-medium">{book.title}</p>
                            <p className="text-secondary mb-0" style={{ fontSize: '0.8rem' }}>{book.author}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="text-secondary">{book.category}</span></td>
                      <td><span className="text-white">${book.price}</span></td>
                      <td><span className="text-secondary">{book.downloadCount}</span></td>
                      <td>
                        {book.featured ? (
                          <Badge style={{ background: 'var(--gradient-accent)' }}>Featured</Badge>
                        ) : (
                          <Badge bg="secondary">Standard</Badge>
                        )}
                      </td>
                      <td>
                        <Button 
                          variant="link" 
                          className="p-1 me-2"
                          onClick={() => handleEdit(book)}
                        >
                          <Edit2 size={16} color="#6366f1" />
                        </Button>
                        <Button 
                          variant="link" 
                          className="p-1"
                          onClick={() => handleDelete(book.id)}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            )}
          </Card.Body>
        </Card>
      </Container>

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton style={{ background: 'var(--card-bg)', borderColor: 'rgba(99, 102, 241, 0.1)' }}>
          <Modal.Title className="text-white">{editingBook ? 'Edit Book' : 'Add New Book'}</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ background: 'var(--card-bg)' }}>
          <Form onSubmit={handleSubmit}>
            <Row className="g-3">
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label">Title *</Form.Label>
                  <Form.Control
                    type="text"
                    className="form-control-custom"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label className="form-label">Author *</Form.Label>
                  <Form.Control
                    type="text"
                    className="form-control-custom"
                    value={formData.author}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mt-3">
              <Form.Label className="form-label">Description *</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                className="form-control-custom"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Form.Group>

            <Row className="g-3 mt-1">
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="form-label">Price ($) *</Form.Label>
                  <Form.Control
                    type="number"
                    step="0.01"
                    className="form-control-custom"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="form-label">Category</Form.Label>
                  <Form.Control
                    type="text"
                    className="form-control-custom"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g. Business"
                  />
                </Form.Group>
              </Col>
              <Col md={4}>
                <Form.Group>
                  <Form.Label className="form-label">Pages</Form.Label>
                  <Form.Control
                    type="number"
                    className="form-control-custom"
                    value={formData.pages}
                    onChange={(e) => setFormData({ ...formData, pages: e.target.value })}
                  />
                </Form.Group>
              </Col>
            </Row>

            <Form.Group className="mt-3">
              <Form.Check
                type="checkbox"
                label="Featured Book"
                checked={formData.featured}
                onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                className="text-white"
              />
            </Form.Group>

            {!editingBook && (
              <>
                <Form.Group className="mt-3">
                  <Form.Label className="form-label">Cover Image *</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*"
                    className="form-control-custom"
                    onChange={(e) => setCoverFile((e.target as HTMLInputElement).files?.[0] || null)}
                    required={!editingBook}
                  />
                </Form.Group>

                <Form.Group className="mt-3">
                  <Form.Label className="form-label">Book File (PDF/EPUB) *</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".pdf,.epub"
                    className="form-control-custom"
                    onChange={(e) => setBookFile((e.target as HTMLInputElement).files?.[0] || null)}
                    required={!editingBook}
                  />
                </Form.Group>
              </>
            )}

            <div className="d-flex gap-2 mt-4">
              <Button type="submit" className="btn-custom-primary">
                {editingBook ? 'Update Book' : 'Create Book'}
              </Button>
              <Button variant="secondary" onClick={() => setShowModal(false)}>Cancel</Button>
            </div>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  )
}

export default AdminDashboard
