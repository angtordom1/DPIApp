import decode from 'jwt-decode'


const TOKEN_KEY = 'token'

export const getToken = () => localStorage.getItem(TOKEN_KEY)

export const saveToken = (token) => localStorage.setItem(TOKEN_KEY, token)

export const clearSession = () => localStorage.removeItem(TOKEN_KEY)

// { username, isAdmin } of the logged-in user, or null if there is no usable token
export function currentUser() {
    const token = getToken()
    if (!token) return null
    try {
        const { data, exp } = decode(token)
        if (!data || !exp || exp * 1000 <= Date.now()) return null
        return { username: data.username, isAdmin: Boolean(data.isAdmin) }
    } catch {
        // malformed token (edited or left by an older version of the app)
        return null
    }
}
