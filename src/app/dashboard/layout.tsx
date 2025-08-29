"use client"

import { useAppStore } from "@/stores/app"
import { Sidebar } from "@/components/layout/sidebar"
import { Header } from "@/components/layout/header"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { sidebarCollapsed } = useAppStore()

  // 开发模式直接渲染，跳过所有认证检查
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* 侧边栏 */}
      <Sidebar />

      {/* 主内容区域 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <Header />

        {/* 主内容 */}
        <main
          className={`flex-1 overflow-auto p-6 transition-all duration-300 ${
            sidebarCollapsed ? "ml-0" : "ml-0"
          }`}
        >
          <div className="mx-auto h-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  )
}
