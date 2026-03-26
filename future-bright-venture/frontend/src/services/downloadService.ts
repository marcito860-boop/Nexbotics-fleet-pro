import api from './api'

export const downloadService = {
  verifyToken: async (token: string) => {
    const response = await api.get(`/downloads/verify/${token}`)
    return response.data.data
  },

  getDownloadUrl: (token: string) => {
    return `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/downloads/${token}`
  }
}
