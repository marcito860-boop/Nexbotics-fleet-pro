import api from './api'
import { CustomerInfo } from '../types'

export const paymentService = {
  initialize: async (bookId: number, paymentMethod: string, customerInfo: CustomerInfo) => {
    const response = await api.post('/payments/initialize', {
      bookId,
      paymentMethod,
      customerInfo
    })
    return response.data.data
  },

  verify: async (transactionId: number) => {
    const response = await api.get(`/payments/verify/${transactionId}`)
    return response.data.data
  },

  capturePayPal: async (orderId: string) => {
    const response = await api.post('/payments/paypal/capture', { orderId })
    return response.data.data
  }
}
