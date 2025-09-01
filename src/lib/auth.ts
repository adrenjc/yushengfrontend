import { STORAGE_KEYS } from "@/constants"
import { useAuthStore } from "@/stores/auth"

/**
 * 获取当前可用的访问令牌
 * 优先从 Zustand store 读取，其次回退到 localStorage
 */
export function getAuthToken(): string | null {
  try {
    const state = useAuthStore.getState()
    if (state?.token) return state.token
  } catch {}

  if (typeof window !== "undefined") {
    const token = localStorage.getItem(STORAGE_KEYS.TOKEN)
    if (token) return token
  }
  return null
}

/**
 * 确保在开发模式下也能拿到 token（用于早期联调）
 */
export function ensureDevToken(): string | null {
  const token = getAuthToken()
  if (token) return token
  return null
}

/**
 * 获取认证头对象（用于页面组件）
 * 提供一个统一的方式获取认证头，替代硬编码
 */
export function getAuthHeaders(): HeadersInit {
  const token = getAuthToken()

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}
