import React, { useEffect, useState } from 'react'
import { Container, Button, Spinner } from 'react-bootstrap'
import { motion } from 'framer-motion'
import { CheckCircle, Download, Clock } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { downloadService } from '../services/downloadService'
import toast from 'react-hot-toast'

const Success: React.FC = () => {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [loading, setLoading] = useState(true)
  const [valid, setValid] = useState(false)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [bookTitle, setBookTitle] = useState('')

  useEffect(() => {
    if (token) {
      verifyToken()
    } else {
      setLoading(false)
    }
  }, [token])

  const verifyToken = async () => {
    try {
      const data = await downloadService.verifyToken(token!)
      setValid(data.valid)
      setExpiresAt(data.expiresAt)
      setBookTitle(data.book?.title || '')
    } catch (error) {
      toast.error('Invalid or expired download link')
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (token) {
      window.location.href = downloadService.getDownloadUrl(token)
    }
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
        <Spinner animation="border" variant="primary" />
      </div>
    )
  }

  if (!token || !valid) {
    return (
      <Container className="py-5 text-center" style={{ minHeight: '60vh' }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h2 className="text-white mb-3">Invalid Download Link</h2>
          <p className="text-secondary">This link may have expired or is invalid.</p>
          <Link to="/store">
            <Button className="btn-custom-primary mt-3">Browse Books</Button>
          </Link>
        </motion.div>
      </Container>
    )
  }

  return (
    <section className="section-padding" style={{ paddingTop: '120px', minHeight: '80vh' }}>
      <Container>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div 
            className="d-inline-flex align-items-center justify-content-center mb-4"
            style={{
              background: 'var(--success-color)',
              borderRadius: '50%',
              width: '100px',
              height: '100px'
            }}
          >
            <CheckCircle size={50} color="white" />
          </div>

          <h1 className="text-white fw-bold mb-3">Payment Successful!</h1>
          <p className="text-secondary mb-2" style={{ fontSize: '1.1rem' }}>
            Thank you for your purchase!</p>
          {bookTitle && <p className="text-white mb-4">{bookTitle}</p>}

          <div 
            className="p-4 rounded-4 mx-auto mb-4"
            style={{ 
              maxWidth: '500px', 
              background: 'var(--card-bg)',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}
          >
            <Button 
              className="btn-custom-primary w-100 mb-3"
              onClick={handleDownload}
            >
              <Download size={20} className="me-2" />
              Download Your Book
            </Button>

            <div className="d-flex align-items-center justify-content-center gap-2 text-secondary">
              <Clock size={16} />
              <span>Link expires: {expiresAt && new Date(expiresAt).toLocaleString()}</span>
            </div>
          </div>

          <p className="text-secondary mb-4" style={{ fontSize: '0.9rem' }}>
            A copy of this download link has also been sent to your email.
          </p>

          <Link to="/store">
            <Button className="btn-custom-outline">
              Continue Shopping
            </Button>
          </Link>
        </motion.div>
      </Container>
    </section>
  )
}

export default Success
