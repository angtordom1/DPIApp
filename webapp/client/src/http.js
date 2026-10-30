import axios from 'axios'

import router from './router'
import { getToken, clearSession } from './auth'

const http = axios.create()

http.interceptors.request.use((config) => {
    const token = getToken()
    if (token) config.headers.token = token
    return config
})

http.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && getToken() && error.config?.url !== '/api/login') {
            clearSession()
            router.push({ name: 'login', query: { expired: '1' } })
        }
        return Promise.reject(error)
    },
)

// Message to show for a failed reques
export const errorMessage = (error, fallback = 'Hubo un problema, disculpe las molestias.') =>
    error.response?.data?.message || fallback

export default http
