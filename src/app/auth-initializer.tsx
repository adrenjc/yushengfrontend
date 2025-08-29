"use client"

import { useEffect } from "react"
import { useAuthStore } from "@/stores/auth"

/**
 * 认证初始化组件
 * 在应用启动时自动验证和恢复登录状态
 */
export function AuthInitializer() {
  const initializeAuth = useAuthStore(state => state.initializeAuth)

  useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  return null
}
