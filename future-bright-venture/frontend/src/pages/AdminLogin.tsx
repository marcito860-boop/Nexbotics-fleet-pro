import React, { useState } from 'react'
import { Container, Form, Button, Card, Alert } from 'react-bootstrap'
import { motion } from 'framer-motion'
import { Lock, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

const AdminLogin: React.FC = () => {
  const [credentials, setCredentials] = useState({ username: '', password: '' })
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      await login(credentials.username, credentials.password)
      toast.success('Welcome back, Admin!')
      navigate('/admin/dashboard')
    } catch (error) {
      toast.error('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div 
      className="d-flex align-items-center justify-content-center"
      style={{ minHeight: '100vh', background: 'var(--darker-bg)' }}
    >
      <Container style={{ maxWidth: '450px' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card 
            className="border-0"
            style={{ 
              background: 'var(--card-bg)', 
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
            }}
          >
            <Card.Body className="p-4 p-md-5">
              <div className="text-center mb-4">
                <div 
                  className="d-inline-flex align-items-center justify-content-center mb-3"
                  style={{
                    background: 'var(--gradient-primary)',
                    borderRadius: '50%',
                    width: '70px',
                    height: '70px'
                  }}
                >
                  <Lock size={32} color="white" />
                </div>
                <h2 className="text-white fw-bold">Admin Login</h2>
                <p className="text-secondary mb-0">Sign in to manage your bookstore</p>
              </div>

              <Form onSubmit={handleSubmit}>
                <Form.Group className="mb-3">
                  <Form.Label className="form-label">Username</Form.Label>
                  <div className="position-relative">
                    <User 
                      size={18} 
                      color="#94a3b8" 
                      className="position-absolute"
                      style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <Form.Control
                      type="text"
                      className="form-control-custom ps-5"
                      value={credentials.username}
                      onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                      required
                      placeholder="Enter username"
                    />
                  </div>
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label className="form-label">Password</Form.Label>
                  <div className="position-relative">
                    <Lock 
                      size={18} 
                      color="#94a3b8" 
                      className="position-absolute"
                      style={{ left: '1rem', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <Form.Control
                      type="password"
                      className="form-control-custom ps-5"
                      value={credentials.password}
                      onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                      required
                      placeholder="Enter password"
                    />
                  </div>
                </Form.Group>

                <Button 
                  type="submit" 
                  className="btn-custom-primary w-100"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </Form>

              <Alert 
                variant="info" 
                className="mt-4 mb-0"
                style={{ background: 'rgba(99, 102, 241, 0.1)', border: 'none' }}
              >
                <p className="mb-0" style={{ fontSize: '0.85rem' }}>
                  <strong>Default credentials:</strong><br/>
                  Username: admin<br/>
                  Password: admin123
                </p>
              </Alert>
            </Card.Body>
          </Card>
        </motion.div>
      </Container>
    </div>
  )
}

export default AdminLogin
