import { useState, useEffect, useCallback, useRef } from "react"
import { STORAGE_KEYS } from "@/constants"
import { ensureDevToken } from "@/lib/auth"
import { useNotifications } from "@/stores/app"
import { buildApiUrl, API_ROUTES } from "@/lib/api"

interface ApiState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
  lastFetch: number | null
}

interface UseApiDataOptions {
  cacheTime?: number // 缓存时间（毫秒）
  autoFetch?: boolean // 是否自动获取数据
  onError?: (error: string) => void
}

// 全局缓存 - 使用更强的缓存策略
const globalCache = new Map<string, { data: any; timestamp: number }>()

// 正在进行的请求缓存，防止重复请求
const pendingRequests = new Map<string, Promise<any>>()

export function useApiData<T>(url: string, options: UseApiDataOptions = {}) {
  const {
    cacheTime = 30 * 1000, // 开发模式减少缓存时间到30秒
    autoFetch = true,
    onError,
  } = options

  const { error: showError } = useNotifications()
  const fetchedRef = useRef(false) // 防止重复请求
  const mountedRef = useRef(true)

  const [state, setState] = useState<ApiState<T>>({
    data: null,
    isLoading: false,
    error: null,
    lastFetch: null,
  })

  // 检查缓存
  const getCachedData = useCallback(
    (key: string): T | null => {
      const cached = globalCache.get(key)
      if (cached && Date.now() - cached.timestamp < cacheTime) {
        return cached.data
      }
      return null
    },
    [cacheTime]
  )

  // 设置缓存
  const setCachedData = useCallback((key: string, data: T) => {
    globalCache.set(key, {
      data,
      timestamp: Date.now(),
    })
  }, [])

  // 获取数据 - 使用防重复请求机制
  const fetchData = useCallback(
    async (force = false) => {
      if (!mountedRef.current) return

      const cacheKey = url

      // 检查缓存（除非强制刷新）
      if (!force) {
        const cachedData = getCachedData(cacheKey)
        if (cachedData) {
          if (mountedRef.current) {
            setState(prev => ({
              ...prev,
              data: cachedData,
              isLoading: false,
              error: null,
              lastFetch: Date.now(),
            }))
          }
          return cachedData
        }
      }

      // 防止重复请求
      if (pendingRequests.has(cacheKey) && !force) {
        try {
          return await pendingRequests.get(cacheKey)!
        } catch (error) {
          // 如果正在进行的请求失败，继续执行新请求
        }
      }

      if (mountedRef.current) {
        setState(prev => ({ ...prev, isLoading: true, error: null }))
      }

      const requestPromise = (async () => {
        try {
          const token = ensureDevToken()
          if (!token) {
            throw new Error("未找到认证token")
          }

          console.log(`发起API请求: ${url}`)
          const response = await fetch(url, {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          })

          if (!response.ok) {
            throw new Error(
              `API请求失败: ${response.status} ${response.statusText}`
            )
          }

          const result = await response.json()
          const data = result.data || result
          console.log(`API请求成功: ${url}`, data)

          // 设置缓存
          setCachedData(cacheKey, data)

          if (mountedRef.current) {
            setState({
              data,
              isLoading: false,
              error: null,
              lastFetch: Date.now(),
            })
          }

          return data
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "请求失败"
          console.error(`API请求失败: ${url}`, error)

          if (mountedRef.current) {
            setState(prev => ({
              ...prev,
              isLoading: false,
              error: errorMessage,
            }))
          }

          if (onError) {
            onError(errorMessage)
          } else if (mountedRef.current) {
            showError("加载失败", errorMessage)
          }

          throw error
        } finally {
          // 清除正在进行的请求
          pendingRequests.delete(cacheKey)
        }
      })()

      // 缓存正在进行的请求
      pendingRequests.set(cacheKey, requestPromise)

      return requestPromise
    },
    [url, getCachedData, setCachedData, onError, showError]
  )

  // 刷新数据
  const refresh = useCallback(() => {
    console.log("强制刷新数据:", url)
    fetchedRef.current = false
    // 清除所有相关缓存以确保获取最新数据
    globalCache.delete(url)
    pendingRequests.delete(url)

    // 强制重新获取数据并更新状态
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    return fetchData(true)
  }, [fetchData, url])

  // 清除缓存
  const clearCache = useCallback(() => {
    globalCache.delete(url)
  }, [url])

  // 自动获取数据 - 修复无限循环，URL变化时重新获取
  useEffect(() => {
    if (autoFetch) {
      // URL变化时重置fetchedRef，允许重新获取
      fetchedRef.current = false
      fetchData().catch(error => {
        console.error("自动获取数据失败:", error)
      })
    }
  }, [autoFetch, url, fetchData])

  // 清理函数
  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  return {
    ...state,
    fetch: fetchData,
    refresh,
    clearCache,
    isCached: getCachedData(url) !== null,
  }
}

// 清除所有产品相关缓存
export function clearAllProductCache() {
  console.log("清除产品相关缓存...")
  // 统一清理所有包含 products 的缓存key，兼容完整URL和相对路径
  const keys = Array.from(globalCache.keys())
  keys.forEach(key => {
    if (key.includes("/api/products") || key.includes("/products")) {
      console.log("删除缓存键:", key)
      globalCache.delete(key)
    }
  })

  // 同时清除正在进行的请求
  const pendingKeys = Array.from(pendingRequests.keys())
  pendingKeys.forEach(key => {
    if (key.includes("/api/products") || key.includes("/products")) {
      console.log("删除请求键:", key)
      pendingRequests.delete(key)
    }
  })

  console.log("缓存清除完成，当前缓存大小:", globalCache.size)
}

// 强制清除所有缓存
export function clearAllCache() {
  console.log("清除所有缓存...")
  globalCache.clear()
  pendingRequests.clear()
  console.log("所有缓存已清除")
}

// 专门用于产品数据的hook - 强制刷新版本
export function useProducts(params?: {
  page?: number
  limit?: number
  isActive?: boolean
  search?: string
  brand?: string
  category?: string
}) {
  const query = new URLSearchParams()
  if (params?.page) query.set("page", String(params.page))
  if (params?.limit) query.set("limit", String(params.limit))
  if (params?.search) query.set("search", params.search)
  if (params?.brand) query.set("brand", params.brand)
  if (params?.category) query.set("category", params.category)
  if (params && Object.prototype.hasOwnProperty.call(params, "isActive")) {
    if (params.isActive === true) query.set("isActive", "true")
    if (params.isActive === false) query.set("isActive", "false")
  }

  const baseUrl = buildApiUrl(API_ROUTES.PRODUCTS.LIST)
  const url = `${baseUrl}${query.toString() ? `?${query.toString()}` : ""}`
  console.log("🔥 useProducts URL:", url)

  // 强制禁用缓存，确保分页工作
  return useApiData<{ products: any[]; pagination?: any }>(url, {
    cacheTime: 0, // 禁用缓存
    onError: error => {
      console.error("❌ 产品数据加载失败:", error)
    },
  })
}

// 专门用于产品统计的hook
export function useProductStats() {
  return useApiData<any>(buildApiUrl("/products/stats"), {
    cacheTime: 5 * 60 * 1000, // 5分钟缓存
  })
}

// 专门用于分类数据的hook
export function useCategories() {
  return useApiData<{ categories: string[] }>(
    buildApiUrl("/products/categories"),
    {
      cacheTime: 10 * 60 * 1000, // 10分钟缓存
    }
  )
}
