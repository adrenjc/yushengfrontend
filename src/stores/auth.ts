import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import type { User, LoginCredentials, AuthResponse } from "@/types"
import { STORAGE_KEYS } from "@/constants"
import { buildApiUrl } from "@/lib/api"

interface AuthState {
  user: User | null
  token: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  initializeAuth: () => void
  login: (credentials: LoginCredentials) => Promise<boolean>
  logout: () => void
  refreshAuth: () => Promise<boolean>
  clearError: () => void
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
}

type AuthStore = AuthState & AuthActions

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
}

export const useAuthStore = create<AuthStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        // 初始化时验证token
        initializeAuth: () => {
          if (typeof window === "undefined") return

          const storedToken = localStorage.getItem(STORAGE_KEYS.TOKEN)
          const storedRefreshToken = localStorage.getItem(
            STORAGE_KEYS.REFRESH_TOKEN
          )
          const storedUser = localStorage.getItem(STORAGE_KEYS.USER)

          if (storedToken && storedRefreshToken && storedUser) {
            try {
              const user = JSON.parse(storedUser)

              // 开发模式下跳过JWT解析，直接使用mock token
              if (
                process.env.NODE_ENV === "development" &&
                storedToken === "dev-mock-token"
              ) {
                set({
                  user,
                  token: storedToken,
                  refreshToken: storedRefreshToken,
                  isAuthenticated: true,
                })
                return
              }

              // 生产模式下检查token是否过期
              try {
                const tokenPayload = JSON.parse(atob(storedToken.split(".")[1]))
                const isExpired = tokenPayload.exp * 1000 < Date.now()

                if (!isExpired) {
                  set({
                    user,
                    token: storedToken,
                    refreshToken: storedRefreshToken,
                    isAuthenticated: true,
                  })
                } else {
                  // Token过期，清除存储
                  get().logout()
                }
              } catch (tokenError) {
                console.error("JWT token parsing failed:", tokenError)
                // JWT解析失败，可能是格式不正确，清除存储
                get().logout()
              }
            } catch (error) {
              console.error("Auth initialization failed:", error)
              get().logout()
            }
          }
        },

        login: async (credentials: LoginCredentials) => {
          set({ isLoading: true, error: null })

          try {
            const response = await fetch(buildApiUrl("/auth/login"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                username: credentials.username,
                password: credentials.password,
              }),
            })

            const data: AuthResponse = await response.json()

            if (response.ok && data.success && data.data) {
              // 后端返回的token结构是 { tokens: { accessToken, refreshToken } }
              const { user, tokens } = data.data
              const { accessToken, refreshToken } = tokens

              set({
                user,
                token: accessToken,
                refreshToken,
                isAuthenticated: true,
                isLoading: false,
                error: null,
              })

              // 设置默认的授权头
              if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken)
                localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken)
                localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
              }

              return true
            } else {
              set({
                isLoading: false,
                error: data.message || "登录失败",
              })
              return false
            }
          } catch (error) {
            console.error("Login error:", error)
            set({
              isLoading: false,
              error:
                error instanceof Error ? error.message : "网络错误，请稍后重试",
            })
            return false
          }
        },

        logout: () => {
          set(initialState)

          // 清除本地存储
          if (typeof window !== "undefined") {
            localStorage.removeItem(STORAGE_KEYS.TOKEN)
            localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN)
            localStorage.removeItem(STORAGE_KEYS.USER)
          }
        },

        refreshAuth: async () => {
          const { refreshToken } = get()

          if (!refreshToken) {
            return false
          }

          try {
            const response = await fetch(buildApiUrl("/auth/refresh"), {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                refreshToken: refreshToken,
              }),
            })

            const data: AuthResponse = await response.json()

            if (data.success && data.data) {
              const { tokens } = data.data
              const { accessToken, refreshToken: newRefreshToken } = tokens

              set({
                token: accessToken,
                refreshToken: newRefreshToken,
                error: null,
              })

              // 更新本地存储
              if (typeof window !== "undefined") {
                localStorage.setItem(STORAGE_KEYS.TOKEN, accessToken)
                localStorage.setItem(
                  STORAGE_KEYS.REFRESH_TOKEN,
                  newRefreshToken
                )
              }

              return true
            } else {
              get().logout()
              return false
            }
          } catch (error) {
            console.error("Refresh auth error:", error)
            get().logout()
            return false
          }
        },

        clearError: () => {
          set({ error: null })
        },

        setUser: (user: User | null) => {
          set({ user })

          if (typeof window !== "undefined") {
            if (user) {
              localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user))
            } else {
              localStorage.removeItem(STORAGE_KEYS.USER)
            }
          }
        },

        setLoading: (loading: boolean) => {
          set({ isLoading: loading })
        },
      }),
      {
        name: "auth-storage",
        partialize: state => ({
          user: state.user,
          token: state.token,
          refreshToken: state.refreshToken,
          isAuthenticated: state.isAuthenticated,
        }),
      }
    ),
    {
      name: "auth-store",
    }
  )
)

// 权限检查工具函数
export const usePermissions = () => {
  const user = useAuthStore(state => state.user)

  const hasPermission = (permission: string): boolean => {
    if (!user || !user.permissions) return false
    return user.permissions.includes(permission)
  }

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user || !user.permissions) return false
    return permissions.some(permission => user.permissions.includes(permission))
  }

  const hasAllPermissions = (permissions: string[]): boolean => {
    if (!user || !user.permissions) return false
    return permissions.every(permission =>
      user.permissions.includes(permission)
    )
  }

  const isAdmin = (): boolean => {
    return user?.role === "admin"
  }

  const isOperator = (): boolean => {
    return user?.role === "operator"
  }

  const isReviewer = (): boolean => {
    return user?.role === "reviewer"
  }

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isOperator,
    isReviewer,
  }
}
