"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
  Navbar,
  NavbarContent,
  NavbarItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Badge,
  Avatar,
  Input,
  Switch,
} from "@nextui-org/react"
import {
  Search,
  Bell,
  Settings,
  User,
  LogOut,
  Moon,
  Sun,
  Monitor,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useAuthStore } from "@/stores/auth"
import { useAppStore, useNotifications } from "@/stores/app"
import { formatDate } from "@/lib/utils"
import { ROUTES } from "@/constants"

interface HeaderProps {
  title?: string
  className?: string
}

export function Header({ title, className }: HeaderProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const { user, logout } = useAuthStore()
  const { notifications } = useAppStore()
  const { success: showSuccess } = useNotifications()

  const [searchValue, setSearchValue] = useState("")

  const unreadNotifications = notifications.filter(n => !n.read)

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    showSuccess("主题切换", `已切换到${getThemeLabel(newTheme)}模式`)
  }

  const getThemeLabel = (theme: string) => {
    switch (theme) {
      case "light":
        return "浅色"
      case "dark":
        return "深色"
      case "system":
        return "系统"
      default:
        return "未知"
    }
  }

  const handleLogout = () => {
    logout()
    showSuccess("退出成功", "您已安全退出系统")
    // 立即跳转到登录页面
    router.push(ROUTES.LOGIN)
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchValue.trim()) {
      console.log("搜索:", searchValue)
      // TODO: 实现搜索逻辑
    }
  }

  return (
    <Navbar
      maxWidth="full"
      className={className}
      classNames={{
        wrapper: "px-4",
        content: "gap-4",
      }}
    >
      {/* 左侧标题 */}
      <NavbarContent justify="start">
        {title && (
          <h1 className="text-xl font-semibold text-foreground">{title}</h1>
        )}
      </NavbarContent>

      {/* 中间搜索框 */}
      <NavbarContent justify="center" className="hidden sm:flex">
        <form onSubmit={handleSearch} className="w-full max-w-md">
          <Input
            placeholder="搜索商品、任务或用户..."
            value={searchValue}
            onValueChange={setSearchValue}
            startContent={<Search className="h-4 w-4 text-default-400" />}
            variant="bordered"
            size="sm"
            className="w-full"
          />
        </form>
      </NavbarContent>

      {/* 右侧操作区 */}
      <NavbarContent justify="end">
        {/* 搜索按钮 (移动端) */}
        <NavbarItem className="sm:hidden">
          <Button isIconOnly variant="light" size="sm">
            <Search className="h-4 w-4" />
          </Button>
        </NavbarItem>

        {/* 主题切换 */}
        <NavbarItem>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm">
                {theme === "light" ? (
                  <Sun className="h-4 w-4" />
                ) : theme === "dark" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Monitor className="h-4 w-4" />
                )}
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              selectedKeys={[theme || "system"]}
              onAction={key => handleThemeChange(key as string)}
            >
              <DropdownItem
                key="light"
                startContent={<Sun className="h-4 w-4" />}
              >
                浅色模式
              </DropdownItem>
              <DropdownItem
                key="dark"
                startContent={<Moon className="h-4 w-4" />}
              >
                深色模式
              </DropdownItem>
              <DropdownItem
                key="system"
                startContent={<Monitor className="h-4 w-4" />}
              >
                跟随系统
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>

        {/* 通知中心 */}
        <NavbarItem>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm">
                <Badge
                  content={unreadNotifications.length || ""}
                  color="danger"
                  isInvisible={unreadNotifications.length === 0}
                  shape="circle"
                >
                  <Bell className="h-4 w-4" />
                </Badge>
              </Button>
            </DropdownTrigger>
            <DropdownMenu className="w-80">
              <>
                {notifications.length === 0 ? (
                  <DropdownItem key="empty" className="text-center opacity-50">
                    暂无通知
                  </DropdownItem>
                ) : (
                  notifications.slice(0, 5).map(notification => (
                    <DropdownItem
                      key={notification.id}
                      className="py-3"
                      description={formatDate(notification.timestamp)}
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {notification.title}
                        </span>
                        <span className="text-sm text-default-500">
                          {notification.message}
                        </span>
                      </div>
                    </DropdownItem>
                  ))
                )}
                {notifications.length > 5 ? (
                  <DropdownItem key="more" className="text-center text-primary">
                    查看更多通知
                  </DropdownItem>
                ) : null}
              </>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>

        {/* 用户菜单 */}
        <NavbarItem>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                size="sm"
                name={user?.username?.charAt(0).toUpperCase()}
                className="cursor-pointer"
                showFallback
              />
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem
                key="profile"
                className="py-2"
                description={
                  user?.role === "admin"
                    ? "管理员"
                    : user?.role === "reviewer"
                      ? "审核员"
                      : user?.role === "operator"
                        ? "操作员"
                        : "未知角色"
                }
                startContent={<User className="h-4 w-4" />}
              >
                <span className="font-medium">{user?.username}</span>
              </DropdownItem>
              <DropdownItem
                key="settings"
                startContent={<Settings className="h-4 w-4" />}
              >
                个人设置
              </DropdownItem>
              <DropdownItem
                key="logout"
                className="text-danger"
                color="danger"
                startContent={<LogOut className="h-4 w-4" />}
                onPress={handleLogout}
              >
                退出登录
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  )
}
