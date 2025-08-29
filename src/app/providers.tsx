"use client"

import { NextUIProvider } from "@nextui-org/react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import { SWRConfig } from "swr"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/stores/auth"
import { useNotifications } from "@/stores/app"
import { API_BASE_URL, ERROR_MESSAGES } from "@/constants"
import { NotificationProvider } from "@/components/ui/notification-provider"
import { AuthInitializer } from "./auth-initializer"

// SWR fetcher 函数
const fetcher = async (url: string) => {
  const token = useAuthStore.getState().token

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
  })

  if (!response.ok) {
    const error = new Error("An error occurred while fetching the data.")

    // 根据状态码处理不同错误
    switch (response.status) {
      case 401:
        useAuthStore.getState().logout()
        throw new Error(ERROR_MESSAGES.UNAUTHORIZED)
      case 403:
        throw new Error(ERROR_MESSAGES.FORBIDDEN)
      case 404:
        throw new Error(ERROR_MESSAGES.NOT_FOUND)
      case 500:
        throw new Error(ERROR_MESSAGES.SERVER_ERROR)
      default:
        throw error
    }
  }

  return response.json()
}

export function Providers({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { error: showError } = useNotifications()

  return (
    <NextUIProvider navigate={router.push}>
      <NextThemesProvider
        attribute="class"
        defaultTheme="system"
        themes={["light", "dark"]}
        enableSystem
        disableTransitionOnChange
      >
        <SWRConfig
          value={{
            fetcher,
            errorRetryCount: 3,
            errorRetryInterval: 5000,
            revalidateOnFocus: false,
            revalidateOnReconnect: true,
            dedupingInterval: 60000,
            onError: error => {
              console.error("SWR Error:", error)
              showError(
                "请求失败",
                error.message || ERROR_MESSAGES.NETWORK_ERROR
              )
            },
            onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
              // 401错误不重试
              if (error.status === 401) return

              // 最多重试3次
              if (retryCount >= 3) return

              // 延迟重试
              setTimeout(() => revalidate({ retryCount }), 5000)
            },
          }}
        >
          <AuthInitializer />
          {children}
          <NotificationProvider />
        </SWRConfig>
      </NextThemesProvider>
    </NextUIProvider>
  )
}
