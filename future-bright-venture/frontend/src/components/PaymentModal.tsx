import React, { useState } from 'react'
import { Modal, Button, Form, Spinner } from 'react-bootstrap'
import { CreditCard, Smartphone, Globe } from 'lucide-react'
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { PayPalButtons } from '@paypal/react-paypal-js'
import { paymentService } from '../services/paymentService'
import { Book, CustomerInfo } from '../types'
import toast from 'react-hot-toast'

interface PaymentModalProps {
  show: boolean
  onHide: () => void
  book: Book
  onSuccess: (downloadToken: string) => void
}

const PaymentModal: React.FC<PaymentModalProps> = ({ show, onHide, book, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'paypal' | 'stripe'>('stripe')
  const [loading, setLoading] = useState(false)
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({ name: '', email: '', phone: '' })
  const [transactionId, setTransactionId] = useState<number | null>(null)
  
  const stripe = useStripe()
  const elements = useElements()

  const handleSubmit = async () => {
    if (!customerInfo.name || !customerInfo.email) {
      toast.error('Please fill in all required fields')
      return
    }

    if (paymentMethod === 'mpesa' && !customerInfo.phone) {
      toast.error('Please enter your M-Pesa phone number')
      return
    }

    setLoading(true)

    try {
      const response = await paymentService.initialize(book.id, paymentMethod, customerInfo)
      setTransactionId(response.transactionId)

      if (paymentMethod === 'stripe') {
        // Stripe payment
        if (!stripe || !elements) {
          toast.error('Stripe not initialized')
          return
        }

        const { error, paymentIntent } = await stripe.confirmCardPayment(response.clientSecret, {
          payment_method: {
            card: elements.getElement(CardElement)!,
            billing_details: {
              name: customerInfo.name,
              email: customerInfo.email
            }
          }
        })

        if (error) {
          toast.error(error.message || 'Payment failed')
        } else if (paymentIntent?.status === 'succeeded') {
          checkPaymentStatus(response.transactionId)
        }
      } else if (paymentMethod === 'mpesa') {
        // M-Pesa STK Push
        toast.success(response.customerMessage || 'STK Push sent to your phone')
        // Start polling for payment status
        startPolling(response.transactionId)
      }
    } catch (error) {
      toast.error('Payment initialization failed')
      setLoading(false)
    }
  }

  const startPolling = (txId: number) => {
    const interval = setInterval(async () => {
      try {
        const status = await paymentService.verify(txId)
        if (status.status === 'completed') {
          clearInterval(interval)
          onSuccess(status.downloadToken)
        }
      } catch (error) {
        clearInterval(interval)
        setLoading(false)
      }
    }, 3000)

    // Stop polling after 2 minutes
    setTimeout(() => {
      clearInterval(interval)
      setLoading(false)
    }, 120000)
  }

  const checkPaymentStatus = async (txId: number) => {
    try {
      const status = await paymentService.verify(txId)
      if (status.status === 'completed') {
        onSuccess(status.downloadToken)
      } else {
        toast.error('Payment verification failed')
        setLoading(false)
      }
    } catch (error) {
      toast.error('Payment verification failed')
      setLoading(false)
    }
  }

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton style={{ background: 'var(--card-bg)', borderColor: 'rgba(99, 102, 241, 0.1)' }}>
        <Modal.Title className="text-white">Complete Your Purchase</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ background: 'var(--card-bg)' }}>
        <div className="mb-4 p-3 rounded-3" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
          <p className="text-secondary mb-1">Purchasing:</p>
          <h5 className="text-white mb-0">{book.title}</h5>
          <p className="mb-0" style={{ color: '#6366f1', fontSize: '1.25rem', fontWeight: 600 }}>${book.price}</p>
        </div>

        {/* Customer Info */}
        <Form className="mb-4">
          <Form.Group className="mb-3">
            <Form.Label className="form-label">Full Name *</Form.Label>
            <Form.Control
              type="text"
              className="form-control-custom"
              value={customerInfo.name}
              onChange={(e) => setCustomerInfo({ ...customerInfo, name: e.target.value })}
              placeholder="John Doe"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label className="form-label">Email *</Form.Label>
            <Form.Control
              type="email"
              className="form-control-custom"
              value={customerInfo.email}
              onChange={(e) => setCustomerInfo({ ...customerInfo, email: e.target.value })}
              placeholder="john@example.com"
            />
          </Form.Group>

          {paymentMethod === 'mpesa' && (
            <Form.Group className="mb-3">
              <Form.Label className="form-label">M-Pesa Phone Number *</Form.Label>
              <Form.Control
                type="tel"
                className="form-control-custom"
                value={customerInfo.phone}
                onChange={(e) => setCustomerInfo({ ...customerInfo, phone: e.target.value })}
                placeholder="254712345678"
              />
              <Form.Text className="text-secondary">Format: 254712345678</Form.Text>
            </Form.Group>
          )}
        </Form>

        {/* Payment Method Selection */}
        <p className="text-white fw-medium mb-3">Select Payment Method</p>
        <div className="d-flex gap-2 mb-4">
          {[
            { id: 'stripe', label: 'Card', icon: CreditCard },
            { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
            { id: 'paypal', label: 'PayPal', icon: Globe }
          ].map((method) => (
            <Button
              key={method.id}
              className={paymentMethod === method.id ? 'btn-custom-primary' : 'btn-custom-outline'}
              onClick={() => setPaymentMethod(method.id as any)}
              style={{ flex: 1 }}
            >
              <method.icon size={18} className="me-2" />
              {method.label}
            </Button>
          ))}
        </div>

        {/* Payment Forms */}
        <div className="mb-4">
          {paymentMethod === 'stripe' && (
            <div 
              className="p-3 rounded-3"
              style={{ background: 'var(--darker-bg)', border: '1px solid rgba(99, 102, 241, 0.2)' }}
            >
              <CardElement 
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#f8fafc',
                      '::placeholder': { color: '#94a3b8' }
                    }
                  }
                }}
              />
            </div>
          )}

          {paymentMethod === 'paypal' && (
            <PayPalButtons
              createOrder={async () => {
                const response = await paymentService.initialize(book.id, 'paypal', customerInfo)
                setTransactionId(response.transactionId)
                return response.orderId
              }}
              onApprove={async (data) => {
                await paymentService.capturePayPal(data.orderID!)
                if (transactionId) {
                  checkPaymentStatus(transactionId)
                }
              }}
              onError={() => toast.error('PayPal payment failed')}
            />
          )}

          {paymentMethod === 'mpesa' && (
            <div 
              className="p-3 rounded-3 text-center"
              style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
            >
              <p className="text-success mb-0">
                You will receive an STK push on your phone to complete payment
              </p>
            </div>
          )}
        </div>

        {(paymentMethod === 'stripe' || paymentMethod === 'mpesa') && (
          <Button 
            className="btn-custom-primary w-100"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Processing...
              </>
            ) : (
              `Pay $${book.price}`
            )}
          </Button>
        )}
      </Modal.Body>
    </Modal>
  )
}

export default PaymentModal
