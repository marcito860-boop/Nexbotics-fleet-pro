import React from 'react'
import { Container, Row, Col, Card } from 'react-bootstrap'
import { motion } from 'framer-motion'
import { Target, Eye, Award, Users, BookOpen, Globe, Heart } from 'lucide-react'

const About: React.FC = () => {
  const values = [
    {
      icon: Target,
      title: 'Excellence',
      description: 'We strive for excellence in everything we do, delivering high-quality solutions that exceed expectations and create lasting value for our clients.'
    },
    {
      icon: Eye,
      title: 'Innovation',
      description: 'We embrace innovation and creative thinking to solve complex challenges and stay ahead in a rapidly evolving business landscape.'
    },
    {
      icon: Award,
      title: 'Integrity',
      description: 'We operate with the highest standards of integrity, building trust through transparency, honesty, and ethical business practices.'
    },
    {
      icon: Users,
      title: 'Client-Centric Service',
      description: 'We put our clients at the center of everything we do, tailoring our solutions to meet their unique needs and driving their success.'
    }
  ]

  const stats = [
    { number: '8+', label: 'Subsidiaries' },
    { number: '5+', label: 'Business Sectors' },
    { number: '100+', label: 'Digital Books' },
    { number: 'East Africa', label: 'Regional Presence' }
  ]

  return (
    <>
      {/* Hero */}
      <section className="hero-section" style={{ minHeight: '60vh' }}>
        <Container>
          <Row className="justify-content-center text-center">
            <Col lg={8}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="mb-4">
                  <BookOpen size={48} color="#1e40af" />
                </div>
                <h1 className="section-title mb-4">About <span>Us</span></h1>
                <p className="hero-subtitle mx-auto">
                  Future Bright Ventures Ltd (FBV) is a multi-faceted enterprise delivering 
                  impact across consulting, training, environment, travel, hospitality, and 
                  community development. We believe that transformation is possible when 
                  strategy meets purpose.
                </p>
              </motion.div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Values */}
      <section className="section-padding section-bg">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-5"
          >
            <h2 className="section-title">Our Core <span>Values</span></h2>
            <p className="section-subtitle">The principles that guide everything we do</p>
          </motion.div>

          <Row className="g-4">
            {values.map((value, index) => (
              <Col md={6} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <Card className="h-100" style={{ border: '1px solid var(--border-color)', borderRadius: '16px' }}>
                    <Card.Body className="p-4">
                      <div className="d-flex align-items-start gap-3">
                        <div 
                          className="flex-shrink-0"
                          style={{
                            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                            borderRadius: '12px',
                            padding: '1rem'
                          }}
                        >
                          <value.icon size={28} color="white" />
                        </div>
                        <div>
                          <Card.Title className="fw-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                            {value.title}
                          </Card.Title>
                          <Card.Text style={{ color: 'var(--text-secondary)' }} className="mb-0">
                            {value.description}
                          </Card.Text>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </motion.div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Mission & Vision */}
      <section className="section-padding">
        <Container>
          <Row className="g-4">
            <Col md={6}>
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Card className="h-100 text-center p-5" style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #f8fafc 0%, #e0f2fe 100%)'
                }}>
                  <Globe size={48} color="#1e40af" className="mx-auto mb-4" />
                  <h3 className="fw-bold mb-3" style={{ color: 'var(--text-primary)' }}>Our Mission</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.7' }}>
                    To empower businesses and communities through innovative solutions 
                    in consulting, training, and sustainable development, creating 
                    lasting impact across East Africa and beyond.
                  </p>
                </Card>
              </motion.div>
            </Col>
            
            <Col md={6}>
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
              >
                <Card className="h-100 text-center p-5" style={{ 
                  border: '1px solid var(--border-color)', 
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)'
                }}>
                  <Heart size={48} color="#d97706" className="mx-auto mb-4" />
                  <h3 className="fw-bold mb-3" style={{ color: 'var(--text-primary)' }}>Our Vision</h3>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', lineHeight: '1.7' }}>
                    To become the leading diversified enterprise in East Africa, 
                    recognized for excellence, innovation, and sustainable impact 
                    across all sectors we serve.
                  </p>
                </Card>
              </motion.div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Stats */}
      <section className="section-padding" style={{ background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)' }}>
        <Container>
          <Row className="g-4 text-center">
            {stats.map((stat, index) => (
              <Col md={3} sm={6} key={index}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <h2 style={{ 
                    fontSize: '2.5rem', 
                    fontWeight: 800,
                    color: 'white',
                    marginBottom: '0.5rem'
                  }}>
                    {stat.number}
                  </h2>
                  <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: 0 }}>{stat.label}</p>
                </motion.div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>
    </>
  )
}

export default About
