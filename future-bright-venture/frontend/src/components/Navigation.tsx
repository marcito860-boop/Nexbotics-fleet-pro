import React from 'react'
import { Navbar, Nav, Container, Button } from 'react-bootstrap'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BookOpen, User, Menu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const Navigation: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const isAdminRoute = location.pathname.startsWith('/admin')

  if (isAdminRoute) return null

  const scrollToSection = (sectionId: string) => {
    if (location.pathname !== '/') {
      navigate('/')
      setTimeout(() => {
        const element = document.getElementById(sectionId)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' })
        }
      }, 100)
    } else {
      const element = document.getElementById(sectionId)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  return (
    <Navbar expand="lg" className="navbar-custom" fixed="top">
      <Container>
        <Navbar.Brand as={Link} to="/">
          <BookOpen size={28} className="me-2" style={{ color: '#1e40af' }} />
          <span style={{ color: '#1e40af', fontWeight: 700 }}>Future Bright</span>
        </Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav">
          <Menu size={24} style={{ color: '#1e40af' }} />
        </Navbar.Toggle>
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mx-auto">
            <Nav.Link 
              onClick={() => scrollToSection('story')} 
              style={{ cursor: 'pointer' }}
            >
              Our Story
            </Nav.Link>
            <Nav.Link 
              onClick={() => scrollToSection('team')} 
              style={{ cursor: 'pointer' }}
            >
              Our Team
            </Nav.Link>
            <Nav.Link 
              onClick={() => scrollToSection('strengths')} 
              style={{ cursor: 'pointer' }}
            >
              Our Strengths
            </Nav.Link>
            <Nav.Link 
              onClick={() => scrollToSection('services')} 
              style={{ cursor: 'pointer' }}
            >
              Products & Services
            </Nav.Link>
            <Nav.Link as={Link} to="/store" active={location.pathname === '/store'}>
              Books & Publications
            </Nav.Link>
            <Nav.Link as={Link} to="/contact" active={location.pathname === '/contact'}>
              Contact Us
            </Nav.Link>
          </Nav>
          <Nav>
            <Button 
              className="btn-custom-primary"
              onClick={() => navigate(isAuthenticated ? '/admin/dashboard' : '/admin')}
            >
              <User size={18} className="me-2" />
              {isAuthenticated ? 'Dashboard' : 'Admin'}
            </Button>
          </Nav>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  )
}

export default Navigation
