import React, { useState } from 'react'
import { Container, Row, Col, Form, Button } from 'react-bootstrap'
import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Send, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

const Contact: React.FC = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    
    // Simulate sending
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    toast.success('Message sent successfully! We\'ll get back to you soon.')
    setFormData({ name: '', email: '', subject: '', message: '' })
    setSending(false)
  }

  const contactInfo = [
    { icon: Phone, label: 'Phone', value: '+254700860814' },
    { icon: Mail, label: 'Email', value: 'info@fbrightventures.co.ke' },
    { icon: MapPin, label: 'Address', value: 'Nairobi, Kenya' },
    { icon: Clock, label: 'Business Hours', value: 'Mon - Fri: 8AM - 6PM' }
  ]

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
            <h1 className="store-title">Get In Touch</h1>
            <p className="store-subtitle mx-auto" style={{ maxWidth: '600px' }}>
              Ready to embark on your journey towards sustainable success? 
              Contact us today to schedule a consultation.
            </p>
          </motion.div>
        </Container>
      </section>

      <section className="section-padding">
        <Container>
          <Row className="g-5">
            <Col lg={5}>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <div className="contact-info-card">
                  <h3 className="fw-bold mb-4" style={{ color: 'var(--text-primary)' }}>Contact Information</h3>
                  
                  <p className="mb-5" style={{ color: 'var(--text-secondary)' }}>
                    Fill out the form and our team will get back to you within 24 hours.
                  </p>

                  <div className="d-flex flex-column gap-4">
                    {contactInfo.map((item, index) => (
                      <div key={index} className="contact-info-item">
                        <div className="icon">
                          <item.icon size={24} />
                        </div>
                        <div className="info">
                          <h5>{item.label}</h5>
                          <p>{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </Col>

            <Col lg={7}>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
              >
                <div 
                  className="p-4 p-md-5 rounded-4"
                  style={{ 
                    background: 'white', 
                    border: '1px solid var(--border-color)',
                    boxShadow: 'var(--shadow-sm)'
                  }}
                >
                  <Form onSubmit={handleSubmit}>
                    <Row className="g-3">
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="form-label">Full Name</Form.Label>
                          <Form.Control
                            type="text"
                            className="form-control-custom"
                            placeholder="Enter your name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                          />
                        </Form.Group>
                      </Col>
                      
                      <Col md={6}>
                        <Form.Group>
                          <Form.Label className="form-label">E-mail</Form.Label>
                          <Form.Control
                            type="email"
                            className="form-control-custom"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            required
                          />
                        </Form.Group>
                      </Col>
                    </Row>

                    <Form.Group className="mt-3">
                      <Form.Label className="form-label">Subject</Form.Label>
                      <Form.Control
                        type="text"
                        className="form-control-custom"
                        placeholder="What is this about?"
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mt-3">
                      <Form.Label className="form-label">Message</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={5}
                        className="form-control-custom"
                        placeholder="Tell us how we can help..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mt-3">
                      <Form.Check
                        type="checkbox"
                        id="privacy-check"
                        label={
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                            I have read and understand the privacy policy.
                          </span>
                        }
                        required
                      />
                    </Form.Group>

                    <Button 
                      type="submit" 
                      className="btn-custom-primary w-100 mt-4"
                      disabled={sending}
                    >
                      {sending ? (
                        'Sending...'
                      ) : (
                        <>
                          <Send size={18} className="me-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </Form>
                </div>
              </motion.div>
            </Col>
          </Row>
        </Container>
      </section>
    </>
  )
}

export default Contact
