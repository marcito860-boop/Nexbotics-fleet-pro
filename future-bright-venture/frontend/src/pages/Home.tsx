import React, { useState, useEffect } from 'react'
import { Container, Row, Col, Card, Button, Accordion } from 'react-bootstrap'
import { motion } from 'framer-motion'
import { 
  BookOpen, 
  Users, 
  Lightbulb, 
  Target, 
  Leaf, 
  Building2, 
  GraduationCap, 
  Home as HomeIcon, 
  Plane, 
  Heart, 
  TreeDeciduous,
  MapPin,
  ArrowRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { bookService } from '../services/bookService'
import { Book } from '../types'

const Home: React.FC = () => {
  const [featuredBooks, setFeaturedBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedService, setExpandedService] = useState<number | null>(null)

  useEffect(() => {
    loadFeaturedBooks()
  }, [])

  const loadFeaturedBooks = async () => {
    try {
      const books = await bookService.getAll({ featured: true })
      setFeaturedBooks(books.slice(0, 3))
    } catch (error) {
      console.error('Error loading featured books:', error)
    } finally {
      setLoading(false)
    }
  }

  const teamMembers = [
    {
      name: 'Benjamin Masai',
      role: 'CEO & Co-Founder',
      desc: 'Offers Strategic Leadership to the Group and is also the Chief Operations Consultant',
      initial: 'BM'
    },
    {
      name: 'Miriam Njeri',
      role: 'Finance Director & Co-Founder',
      desc: 'Financial strategy, Commercial Products, and Corporate governance',
      initial: 'MN'
    },
    {
      name: 'Michael Kiptoo',
      role: 'Head of Business Operations',
      desc: 'Strategic operations, logistics optimization, and cross-sector project management',
      initial: 'MK'
    }
  ]

  const strengths = [
    {
      icon: Target,
      title: 'Multidisciplinary Expertise',
      desc: 'Comprehensive solutions across consulting, training, environment, travel, and hospitality'
    },
    {
      icon: Lightbulb,
      title: 'Partnership & Innovation with Purpose',
      desc: 'Creative solutions that drive meaningful impact and sustainable growth'
    },
    {
      icon: Users,
      title: 'Client-Centric Solutions',
      desc: 'Tailored strategies that put your unique business needs first'
    },
    {
      icon: Leaf,
      title: 'Commitment to Sustainable Impact',
      desc: 'Building a brighter future through responsible business practices'
    }
  ]

  const services = [
    {
      icon: Building2,
      title: 'Bright Business Consultancy & Outsourcing',
      shortDesc: 'Expert solutions in operations, risk management, and business transformation',
      fullDesc: 'Bright Business Consultancy & Outsourcing provides expert solutions in operations, risk management, leadership, and business transformation. We help organizations streamline processes, cut costs, and enhance performance through tailored consulting and outsourced services. With a focus on innovation, efficiency, and sustainability, we empower businesses to grow strategically, stay competitive, and achieve long-term success with measurable impact.',
      projectManager: 'Jeffrey McCollins',
      duration: '27 months'
    },
    {
      icon: GraduationCap,
      title: 'Bright Academy',
      shortDesc: 'Training, Coaching & Mentorship programs',
      fullDesc: 'Bright Academy is the training and mentorship arm of Future Bright Ventures, dedicated to nurturing leadership, professional skills, and personal growth. We offer practical courses, workshops, and coaching programs in leadership, operations, safety, and entrepreneurship. Through blended learning and mentorship, Bright Academy equips individuals and organizations with tools to thrive, lead with integrity, and create lasting impact.',
      projectManager: 'Training Team',
      duration: 'Ongoing'
    },
    {
      icon: HomeIcon,
      title: 'Bright Homes & Resort',
      shortDesc: 'Serene, comfortable, and eco-friendly accommodation',
      fullDesc: 'Bright Homes & Resort offers serene, comfortable, and eco-friendly accommodation for families, travelers, and corporate guests. Nestled in peaceful natural surroundings, our resort blends modern amenities with warm hospitality. Whether you\'re on holiday, a retreat, or business travel, Bright Homes provides the perfect escape for rest, relaxation, and rejuvenation in a home-away-from-home setting.',
      projectManager: 'Hospitality Team',
      duration: 'Year-round'
    },
    {
      icon: Plane,
      title: 'Bright Tours and Travel',
      shortDesc: 'Unforgettable travel experiences across breathtaking destinations',
      fullDesc: 'Bright Tours & Travels offers unforgettable travel experiences across breathtaking destinations. We specialize in organized tours, adventure trips, cultural excursions, and corporate getaways. With a focus on comfort, discovery, and personalized service, we help individuals and groups explore the beauty of nature, heritage, and diverse cultures—creating memories that last a lifetime. Travel with purpose, adventure, and joy.',
      projectManager: 'Travel Team',
      duration: 'Year-round'
    },
    {
      icon: TreeDeciduous,
      title: 'Bright Eco-Farms',
      shortDesc: 'Sustainable agriculture and environmental conservation',
      fullDesc: 'Bright Eco-Farms, a subsidiary of Future Bright Ventures, promotes sustainable agriculture, environmental conservation, and green innovation. Focused on tree planting, organic farming, and renewable energy, it empowers communities with eco-friendly practices for food security and climate resilience. Through education and hands-on projects, Bright Eco-Farms nurtures a greener, healthier future for generations to come.',
      projectManager: 'Environmental Team',
      duration: 'Ongoing'
    },
    {
      icon: Heart,
      title: 'Bright Foundation',
      shortDesc: 'Corporate Social Responsibility initiatives',
      fullDesc: 'Bright Foundation, the CSR arm of Future Bright Ventures, empowers communities through environmental conservation, education, and support for the vulnerable. Its initiatives include tree planting, food distribution, youth mentorship, and clean-up drives. Committed to sustainability and dignity, the foundation fosters hope, unity, and transformation, helping communities thrive through compassionate action and purposeful engagement.',
      projectManager: 'Community Team',
      duration: 'Ongoing'
    },
    {
      icon: Building2,
      title: 'Bright Real Estate & Property',
      shortDesc: 'Sustainable, affordable, and innovative housing solutions',
      fullDesc: 'Bright Real Estate and Properties, a division of Future Bright Ventures, specializes in sustainable, affordable, and innovative housing solutions. The company offers property development, management, and investment services tailored to meet modern lifestyle needs. With a focus on quality, integrity, and environmental responsibility, Bright Real Estate builds lasting value while transforming communities into secure, vibrant, and livable spaces.',
      projectManager: 'Property Team',
      duration: 'Project-based'
    },
    {
      icon: MapPin,
      title: 'Outdoor Events',
      shortDesc: 'Hiking & Team Building activities',
      fullDesc: 'At Future Bright Ventures, our outdoor activities include hiking, team-building retreats, and nature-based leadership experiences. These adventures promote wellness, teamwork, and personal growth in scenic natural settings. Ideal for corporate teams, youth groups, and wellness seekers, each experience fosters connection, resilience, and renewed purpose beyond the office or classroom.',
      projectManager: 'Events Team',
      duration: 'Seasonal'
    }
  ]

  return (
    <>
      {/* Hero Section */}
      <section className="hero-section">
        <Container>
          <Row className="align-items-center">
            <Col lg={7}>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="mb-4">
                  <span className="badge bg-primary mb-3" style={{ fontSize: '0.9rem', padding: '0.5rem 1rem' }}>
                    <BookOpen size={16} className="me-2" />
                    Books & Publications
                  </span>
                </div>
                <h1 className="hero-title">
                  Securing The
                  <br />
                  <span>Future</span>
                </h1>
                <p className="hero-subtitle">
                  Where Business Excellence meets Sustainability, Strategy & Service. 
                  Future Bright Ventures delivers impact across consulting, training, 
                  environment, travel, hospitality, and community development.
                </p>
                <div className="d-flex gap-3 flex-wrap">
                  <Link to="/store">
                    <Button className="btn-custom-primary">
                      Get Started
                      <ArrowRight size={18} className="ms-2" />
                    </Button>
                  </Link>
                  <a href="#story">
                    <Button className="btn-custom-outline">
                      Our Story
                    </Button>
                  </a>
                </div>
              </motion.div>
            </Col>
            <Col lg={5} className="d-none d-lg-block">
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-center"
              >
                <div 
                  className="rounded-4 overflow-hidden shadow-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                    padding: '3rem'
                  }}
                >
                  <BookOpen size={100} color="white" className="mb-4" />
                  <h3 className="text-white fw-bold mb-3">Future Bright Ventures</h3>
                  <p className="text-white-50 mb-4">
                    Your trusted partner for sustainable success
                  </p>
                  <div className="d-flex justify-content-center gap-4 text-white">
                    <div className="text-center">
                      <h4 className="fw-bold mb-1">8+</h4>
                      <small>Subsidiaries</small>
                    </div>
                    <div className="text-center">
                      <h4 className="fw-bold mb-1">5+</h4>
                      <small>Sectors</small>
                    </div>
                    <div className="text-center">
                      <h4 className="fw-bold mb-1">100+</h4>
                      <small>Books</small>
                    </div>
                  </div>
                </div>
              </motion.div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Our Story Section */}
      <section id="story" className="section-padding section-bg">
        <Container>
          <Row>
            <Col lg={8} className="mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                viewport={{ once: true }}
                className="text-center mb-5"
              >
                <h2 className="section-title">Our <span>Story</span></h2>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                viewport={{ once: true }}
                className="story-content"
              >
                <p>
                  At <strong>Future Bright Ventures Ltd (FBV)</strong>, our journey began with a single belief: 
                  that transformation is possible when strategy meets purpose. Founded with a vision to 
                  empower businesses and communities, FBV has grown into a multi-faceted enterprise 
                  delivering impact across consulting, training, environment, travel, hospitality, and 
                  community development.
                </p>
                <p>
                  With our headquarters in <strong>Nairobi, Kenya</strong>, and a dynamic presence across 
                  East Africa, we have cultivated a culture rooted in <strong>Excellence</strong>, 
                  <strong> Innovation</strong>, <strong>Integrity</strong>, and <strong>Client-Centric Service</strong>.
                </p>
                <p>
                  Each of our subsidiaries reflects this culture. We optimize operations and mitigate 
                  risks through Future Bright Consultancy. We shape the next generation of leaders 
                  through BRIGHT Academy. We nurture the planet through Bright Eco-Farms. We connect 
                  people to destinations and experiences through Bright Tours and Travel. We uplift 
                  lives through Bright Foundation. And we provide comfort, class, and care in 
                  hospitality through Bright Homes & Resort.
                </p>
                <p>
                  At <strong>Future Bright Ventures Ltd</strong>, we understand that true success goes 
                  beyond profitability—it's about <strong>sustainability</strong>, <strong>strategic growth</strong>, 
                  and <strong>responsible business practices</strong>.
                </p>
              </motion.div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Our Team Section */}
      <section className="section-padding">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-5"
          >
            <h2 className="section-title">Our <span>Team</span></h2>
            <p className="section-subtitle">Leadership that drives excellence and innovation</p>
          </motion.div>

          <Row className="g-4">
            {teamMembers.map((member, index) => (
              <Col md={4} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="team-card">
                    <div className="team-avatar">{member.initial}</div>
                    <h4 className="team-name">{member.name}</h4>
                    <p className="team-role">{member.role}</p>
                    <p className="team-desc">{member.desc}</p>
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Our Strengths Section */}
      <section className="section-padding section-bg">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-5"
          >
            <h2 className="section-title">Our <span>Strengths</span></h2>
            <p className="section-subtitle">
              Explore our full range of services to discover how we can tailor our expertise 
              to meet your unique business needs.
            </p>
          </motion.div>

          <Row className="g-4">
            {strengths.map((strength, index) => (
              <Col md={6} lg={3} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  viewport={{ once: true }}
                >
                  <div className="strength-card h-100">
                    <div className="strength-icon">
                      <strength.icon size={32} />
                    </div>
                    <h5 className="strength-title">{strength.title}</h5>
                    <p className="strength-desc">{strength.desc}</p>
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Products & Services Section */}
      <section className="section-padding">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-5"
          >
            <h2 className="section-title">Products & <span>Services</span></h2>
            <p className="section-subtitle">Our subsidiaries delivering excellence across sectors</p>
          </motion.div>

          <Row className="g-4">
            {services.map((service, index) => (
              <Col md={6} key={index}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.05 }}
                  viewport={{ once: true }}
                >
                  <div className={`expandable-card ${expandedService === index ? 'expanded' : ''}`}>
                    <div 
                      className="card-header"
                      onClick={() => setExpandedService(expandedService === index ? null : index)}
                    >
                      <div className="card-header-content">
                        <div className="card-icon">
                          <service.icon size={28} />
                        </div>
                        <div className="card-title-section">
                          <h4>{service.title}</h4>
                          <p>{service.shortDesc}</p>
                        </div>
                        <div className="expand-icon">
                          {expandedService === index ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                      </div>
                    </div>
                    {expandedService === index && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="card-body"
                      >
                        <p>{service.fullDesc}</p>
                        <div className="project-meta">
                          <div className="project-meta-item">
                            <Users size={16} />
                            <span>Project manager: <strong>{service.projectManager}</strong></span>
                          </div>
                          <div className="project-meta-item">
                            <Target size={16} />
                            <span>Project duration: <strong>{service.duration}</strong></span>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Featured Books Section */}
      <section className="section-padding section-bg">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-5"
          >
            <h2 className="section-title">Featured <span>Books</span></h2>
            <p className="section-subtitle">Handpicked selections from our digital library</p>
          </motion.div>

          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (
            <Row className="g-4">
              {featuredBooks.map((book, index) => (
                <Col md={4} key={book.id}>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    viewport={{ once: true }}
                  >
                    <Card className="book-card">
                      <div className="position-relative overflow-hidden">
                        <Card.Img 
                          variant="top" 
                          src={book.coverImage} 
                          alt={book.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300x450/1e40af/ffffff?text=Book+Cover'
                          }}
                        />
                        <span className="featured-badge">Featured</span>
                      </div>
                      <Card.Body>
                        <Card.Title>{book.title}</Card.Title>
                        <Card.Text>{book.author}</Card.Text>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="price-tag">${book.price}</span>
                          <Link to={`/book/${book.id}`}>
                            <Button className="btn-custom-primary" size="sm">
                              View Details
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

          <div className="text-center mt-5">
            <Link to="/store">
              <Button className="btn-custom-outline">
                View All Books
                <ArrowRight size={18} className="ms-2" />
              </Button>
            </Link>
          </div>
        </Container>
      </section>

      {/* CTA Section */}
      <section className="section-padding">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center"
          >
            <div 
              className="p-5 rounded-4"
              style={{ 
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              }}
            >
              <h2 className="text-white fw-bold mb-3">Ready to Secure Your Future?</h2>
              <p className="text-white-50 mb-4" style={{ fontSize: '1.1rem' }}>
                Explore our books, services, and solutions designed to help you grow with purpose and resilience.
              </p>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <Link to="/store">
                  <Button className="btn-accent btn-lg">
                    Browse Books
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button className="btn-light btn-lg">
                    Contact Us
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </Container>
      </section>
    </>
  )
}

export default Home
