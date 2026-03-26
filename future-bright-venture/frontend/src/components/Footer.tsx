import React from 'react'
import { Container, Row, Col } from 'react-bootstrap'
import { Link } from 'react-router-dom'
import { BookOpen, Facebook, Twitter, Instagram, Mail, Phone, MapPin } from 'lucide-react'

const Footer: React.FC = () => {
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' })
    }
  }

  return (
    <footer className="footer">
      <Container>
        <Row className="g-4">
          <Col lg={4}>
            <div className="d-flex align-items-center mb-3">
              <BookOpen size={28} className="me-2" style={{ color: 'white' }} />
              <span className="footer-brand">Future Bright</span>
            </div>
            <p className="footer-text">
              We believe in the power of collaboration, innovation, and purposeful 
              leadership to drive transformational change. Let's work together to 
              shape a brighter, more sustainable future.
            </p>
            <div className="d-flex gap-3 mt-3">
              <a href="#" className="social-link">
                <Facebook size={20} />
              </a>
              <a href="#" className="social-link">
                <Twitter size={20} />
              </a>
              <a href="#" className="social-link">
                <Instagram size={20} />
              </a>
              <a href="#" className="social-link">
                <Mail size={20} />
              </a>
            </div>
          </Col>

          <Col lg={2} md={4}>
            <h6>Quick Links</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <Link to="/" onClick={() => scrollToSection('story')}>
                  Our Story
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/" onClick={() => scrollToSection('team')}>
                  Our Team
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/" onClick={() => scrollToSection('strengths')}>
                  Our Strengths
                </Link>
              </li>
              <li className="mb-2">
                <Link to="/store">Books & Publications</Link>
              </li>
            </ul>
          </Col>

          <Col lg={2} md={4}>
            <h6>Services</h6>
            <ul className="list-unstyled">
              <li className="mb-2">
                <a href="#">Consultancy</a>
              </li>
              <li className="mb-2">
                <a href="#">Training</a>
              </li>
              <li className="mb-2">
                <a href="#">Eco-Farms</a>
              </li>
              <li className="mb-2">
                <a href="#">Tours & Travel</a>
              </li>
            </ul>
          </Col>

          <Col lg={4} md={4}>
            <h6>Contact Us</h6>
            <div className="footer-text">
              <div className="d-flex align-items-start mb-3">
                <MapPin size={18} className="me-2 mt-1" style={{ color: '#3b82f6' }} />
                <span>Nairobi, Kenya<br />East Africa</span>
              </div>
              <div className="d-flex align-items-center mb-3">
                <Phone size={18} className="me-2" style={{ color: '#3b82f6' }} />
                <span>+254700860814</span>
              </div>
              <div className="d-flex align-items-center">
                <Mail size={18} className="me-2" style={{ color: '#3b82f6' }} />
                <span>info@fbrightventures.co.ke</span>
              </div>
            </div>
          </Col>
        </Row>

        <hr className="my-4" style={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        <Row>
          <Col md={6} className="text-center text-md-start">
            <p className="footer-text mb-0" style={{ fontSize: '0.875rem' }}>
              © {new Date().getFullYear()} Future Bright Ventures Ltd. All rights reserved.
            </p>
          </Col>
          <Col md={6} className="text-center text-md-end">
            <a href="#" className="me-3" style={{ fontSize: '0.875rem' }}>Privacy Policy</a>
            <a href="#" style={{ fontSize: '0.875rem' }}>Terms of Service</a>
          </Col>
        </Row>
      </Container>
    </footer>
  )
}

export default Footer
