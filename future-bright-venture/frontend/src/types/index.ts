export interface Book {
  id: number
  title: string
  author: string
  description: string
  price: number
  coverImage: string
  filePath: string
  featured: boolean
  category: string
  pages?: number
  language: string
  downloadCount: number
  createdAt: string
  updatedAt: string
}

export interface Transaction {
  id: number
  bookId: number
  paymentMethod: 'mpesa' | 'paypal' | 'stripe'
  amount: number
  status: 'pending' | 'completed' | 'failed'
  customerPhone?: string
  customerEmail?: string
  customerName?: string
  downloadToken: string
  expiresAt: string
  book?: Book
}

export interface CustomerInfo {
  name: string
  email: string
  phone: string
}

export interface Admin {
  id: number
  username: string
}
