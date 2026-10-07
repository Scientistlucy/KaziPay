import axios from 'axios'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api' })

api.interceptors.request.use((config) => {
  config.headers['X-Correlation-Id'] = crypto.randomUUID()
  return config
})