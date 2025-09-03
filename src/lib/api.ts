/**
 * API 配置和请求工具
 * 统一管理所有API请求的基础配置
 */

import { getAuthToken } from "./auth"

// API基础配置
const API_CONFIG = {
  BASE_URL:
    process.env.NEXT_PUBLIC_API_URL ||
    (process.env.NODE_ENV === "production"
      ? "https://www.yssh.cc"
      : "http://localhost:8080"),
  TIMEOUT: parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || "30000"), // 30秒超时
  HEADERS: {
    "Content-Type": "application/json",
  },
}

/**
 * API基础URL
 */
export const API_BASE_URL = API_CONFIG.BASE_URL

/**
 * API路径配置
 */
export const API_ROUTES = {
  // 模板相关
  TEMPLATES: {
    OPTIONS: "/templates/options",
    LIST: "/templates",
    DETAIL: (id: string) => `/templates/${id}`,
    CREATE: "/templates",
    UPDATE: (id: string) => `/templates/${id}`,
    DELETE: (id: string) => `/templates/${id}`,
  },
  // 商品相关
  PRODUCTS: {
    LIST: "/products",
    DETAIL: (id: string) => `/products/${id}`,
    CREATE: "/products",
    UPDATE: (id: string) => `/products/${id}`,
    UPDATE_STATUS: (id: string) => `/products/${id}/status`,
    DELETE: (id: string) => `/products/${id}`,
    HARD_DELETE: "/products/hard-delete",
    BATCH: "/products/batch",
    ALL_IDS: "/products/all-ids",
    UPLOAD: (templateId: string) => `/products/upload?templateId=${templateId}`,
  },
  // 匹配相关
  MATCHING: {
    TASKS: "/matching/tasks",
    TASK_DETAIL: (id: string) => `/matching/tasks/${id}`,
    CREATE_TASK: "/matching/tasks",
    RECORDS: "/matching/records",
    BATCH_REVIEW: "/matching/records/batch-review",
  },
}

/**
 * 构建完整的API URL
 */
export const buildApiUrl = (path: string): string => {
  return `${API_CONFIG.BASE_URL}/api${path}`
}

/**
 * 获取带认证头的请求头
 */
const getAuthHeaders = (): HeadersInit => {
  const headers: HeadersInit = { ...API_CONFIG.HEADERS }

  // 动态获取当前的认证 token
  const token = getAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

/**
 * 获取仅包含认证信息的请求头（不包含Content-Type）
 * 用于文件上传等需要浏览器自动设置Content-Type的场景
 */
export const getAuthOnlyHeaders = (): HeadersInit => {
  const headers: HeadersInit = {}

  // 动态获取当前的认证 token
  const token = getAuthToken()

  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  return headers
}

/**
 * 统一的fetch请求封装
 */
export const apiRequest = async <T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
  const fullUrl = url.startsWith("http") ? url : buildApiUrl(url)

  const config: RequestInit = {
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
    ...options,
  }

  try {
    const response = await fetch(fullUrl, config)

    if (!response.ok) {
      // 尝试解析错误响应
      let errorData = null
      try {
        errorData = await response.json()
      } catch {
        // 如果无法解析JSON，使用默认错误信息
      }

      // 检查是否为认证错误
      if (response.status === 401 && errorData?.isAuthError) {
        // 认证错误，触发登录跳转
        handleAuthError(errorData.message || "登录已过期")
        const authError = new Error(errorData.message || "登录已过期")
        ;(authError as any).isAuthError = true
        throw authError
      }

      throw new Error(
        errorData?.message || `HTTP ${response.status}: ${response.statusText}`
      )
    }

    return await response.json()
  } catch (error) {
    console.error(`API请求失败: ${fullUrl}`, error)
    throw error
  }
}

/**
 * 处理认证错误
 */
const handleAuthError = (message: string) => {
  // 动态导入避免循环依赖
  import("@/stores/auth").then(({ useAuthStore }) => {
    const authStore = useAuthStore.getState()
    authStore.logout()
  })

  // 显示轻提示
  import("@/stores/app").then(({ useAppStore }) => {
    const appStore = useAppStore.getState()
    appStore.addNotification({
      type: "warning",
      title: "登录已过期",
      message: message,
      duration: 3000,
    })
  })

  // 跳转到登录页
  if (typeof window !== "undefined") {
    // 延迟跳转，让用户看到提示
    setTimeout(() => {
      window.location.href = "/auth/login"
    }, 1000)
  }
}

/**
 * GET请求
 */
export const apiGet = <T = any>(
  url: string,
  params?: Record<string, any>
): Promise<T> => {
  let fullUrl = url

  if (params) {
    const searchParams = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value))
      }
    })
    const queryString = searchParams.toString()
    if (queryString) {
      fullUrl += `?${queryString}`
    }
  }

  return apiRequest<T>(fullUrl, { method: "GET" })
}

/**
 * POST请求
 */
export const apiPost = <T = any>(url: string, data?: any): Promise<T> => {
  return apiRequest<T>(url, {
    method: "POST",
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * PUT请求
 */
export const apiPut = <T = any>(url: string, data?: any): Promise<T> => {
  return apiRequest<T>(url, {
    method: "PUT",
    body: data ? JSON.stringify(data) : undefined,
  })
}

/**
 * DELETE请求
 */
export const apiDelete = <T = any>(url: string): Promise<T> => {
  return apiRequest<T>(url, { method: "DELETE" })
}

/**
 * 快速创建带认证的 fetch 请求
 * 用于替换页面中硬编码的 fetch 调用
 */
export const createAuthenticatedFetch = () => {
  return (url: string, options: RequestInit = {}): Promise<Response> => {
    const fullUrl = url.startsWith("http") ? url : buildApiUrl(url)

    const config: RequestInit = {
      headers: {
        ...getAuthHeaders(),
        ...options.headers,
      },
      ...options,
    }

    return fetch(fullUrl, config)
  }
}

// 导出一个默认的认证 fetch 实例
export const authFetch = createAuthenticatedFetch()
