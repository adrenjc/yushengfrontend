import { Providers } from "./providers"
import { Inter } from "next/font/google"
import "./globals.css"
import type { Metadata } from "next"
import { APP_NAME, APP_DESCRIPTION } from "@/constants"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
  keywords: ["商品匹配", "AI", "价格管理", "智能系统"],
  authors: [{ name: "Smart Match Team" }],
  icons: {
    icon: "/favicon.ico",
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
