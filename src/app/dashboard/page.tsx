"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function DashboardPage() {
  const router = useRouter()

  useEffect(() => {
    // 重定向到商品管理页面
    router.replace("/dashboard/products")
  }, [router])

  // 显示加载状态，避免闪烁
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <p className="text-default-500">正在跳转...</p>
      </div>
    </div>
  )
}
