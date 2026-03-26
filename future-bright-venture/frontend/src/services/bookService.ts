import api from './api'
import { Book } from '../types'

export const bookService = {
  getAll: async (params?: { featured?: boolean; search?: string; category?: string }): Promise<Book[]> => {
    const response = await api.get('/books', { params })
    return response.data.data
  },

  getById: async (id: number): Promise<Book> => {
    const response = await api.get(`/books/${id}`)
    return response.data.data
  },

  getCategories: async (): Promise<string[]> => {
    const response = await api.get('/books/categories')
    return response.data.data
  },

  create: async (formData: FormData): Promise<Book> => {
    const response = await api.post('/books', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data.data
  },

  update: async (id: number, formData: FormData): Promise<Book> => {
    const response = await api.put(`/books/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data.data
  },

  delete: async (id: number): Promise<void> => {
    await api.delete(`/books/${id}`)
  }
}
