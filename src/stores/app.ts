import { create } from "zustand"
import { devtools, persist } from "zustand/middleware"
import { STORAGE_KEYS } from "@/constants"

interface AppState {
  theme: "light" | "dark" | "system"
  sidebarCollapsed: boolean
  sidebarWidth: number
  loading: boolean
  notifications: Notification[]
  lastActivity: number
}

interface Notification {
  id: string
  type: "success" | "warning" | "error" | "info"
  title: string
  message: string
  duration?: number
  timestamp: number
  read: boolean
}

interface AppActions {
  setTheme: (theme: "light" | "dark" | "system") => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setSidebarWidth: (width: number) => void
  setLoading: (loading: boolean) => void
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void
  removeNotification: (id: string) => void
  markNotificationAsRead: (id: string) => void
  clearNotifications: () => void
  updateLastActivity: () => void
}

type AppStore = AppState & AppActions

const initialState: AppState = {
  theme: "system",
  sidebarCollapsed: false,
  sidebarWidth: 280,
  loading: false,
  notifications: [],
  lastActivity: Date.now(),
}

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,

        setTheme: (theme: "light" | "dark" | "system") => {
          set({ theme })
        },

        toggleSidebar: () => {
          set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }))
        },

        setSidebarCollapsed: (collapsed: boolean) => {
          set({ sidebarCollapsed: collapsed })
        },

        setSidebarWidth: (width: number) => {
          set({ sidebarWidth: width })
        },

        setLoading: (loading: boolean) => {
          set({ loading })
        },

        addNotification: (notification) => {
          const id = Math.random().toString(36).substring(2, 15)
          const newNotification: Notification = {
            ...notification,
            id,
            timestamp: Date.now(),
            read: false,
          }

          set(state => ({
            notifications: [newNotification, ...state.notifications],
          }))

          // 自动移除通知
          if (notification.duration !== 0) {
            setTimeout(() => {
              get().removeNotification(id)
            }, notification.duration || 5000)
          }
        },

        removeNotification: (id: string) => {
          set(state => ({
            notifications: state.notifications.filter(n => n.id !== id),
          }))
        },

        markNotificationAsRead: (id: string) => {
          set(state => ({
            notifications: state.notifications.map(n =>
              n.id === id ? { ...n, read: true } : n
            ),
          }))
        },

        clearNotifications: () => {
          set({ notifications: [] })
        },

        updateLastActivity: () => {
          set({ lastActivity: Date.now() })
        },
      }),
      {
        name: STORAGE_KEYS.THEME,
        partialize: (state) => ({
          theme: state.theme,
          sidebarCollapsed: state.sidebarCollapsed,
          sidebarWidth: state.sidebarWidth,
        }),
      }
    ),
    {
      name: "app-store",
    }
  )
)

// 便捷的通知函数
export const useNotifications = () => {
  const addNotification = useAppStore(state => state.addNotification)

  return {
    success: (title: string, message: string, duration?: number) =>
      addNotification({ type: "success", title, message, duration }),
    
    error: (title: string, message: string, duration?: number) =>
      addNotification({ type: "error", title, message, duration }),
    
    warning: (title: string, message: string, duration?: number) =>
      addNotification({ type: "warning", title, message, duration }),
    
    info: (title: string, message: string, duration?: number) =>
      addNotification({ type: "info", title, message, duration }),
  }
}
