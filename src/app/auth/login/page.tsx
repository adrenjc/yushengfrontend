"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Card,
  CardBody,
  CardHeader,
  Input,
  Button,
  Divider,
  Link,
  Checkbox,
} from "@nextui-org/react"
import { Eye, EyeOff, User, Lock, LogIn } from "lucide-react"
import { useAuthStore } from "@/stores/auth"
import { useNotifications } from "@/stores/app"
import { ROUTES, APP_NAME } from "@/constants"
import type { LoginCredentials } from "@/types"

export default function LoginPage() {
  const router = useRouter()
  const { login, isAuthenticated, isLoading, error, clearError } =
    useAuthStore()
  const { success: showSuccess, error: showError } = useNotifications()

  const [credentials, setCredentials] = useState<LoginCredentials>({
    username: "",
    password: "",
  })
  const [isVisible, setIsVisible] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({})

  // 如果已登录，重定向到商品管理
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(ROUTES.PRODUCTS)
    }
  }, [isAuthenticated, router])

  // 清除错误信息
  useEffect(() => {
    if (error) {
      showError("登录失败", error)
      clearError()
    }
  }, [error, showError, clearError])

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!credentials.username.trim()) {
      errors.username = "请输入用户名"
    }

    if (!credentials.password) {
      errors.password = "请输入密码"
    } else if (credentials.password.length < 6) {
      errors.password = "密码长度不能少于6位"
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleInputChange = (field: keyof LoginCredentials, value: string) => {
    setCredentials(prev => ({ ...prev, [field]: value }))

    // 清除对应字段的验证错误
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: "" }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const success = await login(credentials)

    if (success) {
      showSuccess("登录成功", "欢迎回到智能商品匹配系统")
      router.replace(ROUTES.PRODUCTS)
    }
  }

  const toggleVisibility = () => setIsVisible(!isVisible)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardHeader className="flex flex-col gap-3 pb-6">
            <div className="flex items-center justify-center">
              <div className="rounded-full bg-primary/10 p-3">
                <LogIn className="h-8 w-8 text-primary" />
              </div>
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold">{APP_NAME}</h1>
              <p className="text-sm text-default-500">
                请登录您的账户以继续使用
              </p>
            </div>
          </CardHeader>

          <Divider />

          <CardBody className="gap-4 py-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input
                label="用户名"
                placeholder="请输入用户名"
                value={credentials.username}
                onValueChange={value => handleInputChange("username", value)}
                startContent={<User className="h-4 w-4 text-default-400" />}
                isRequired
                isInvalid={!!validationErrors.username}
                errorMessage={validationErrors.username}
                variant="bordered"
              />

              <Input
                label="密码"
                placeholder="请输入密码"
                value={credentials.password}
                onValueChange={value => handleInputChange("password", value)}
                startContent={<Lock className="h-4 w-4 text-default-400" />}
                endContent={
                  <button
                    className="focus:outline-none"
                    type="button"
                    onClick={toggleVisibility}
                  >
                    {isVisible ? (
                      <EyeOff className="h-4 w-4 text-default-400" />
                    ) : (
                      <Eye className="h-4 w-4 text-default-400" />
                    )}
                  </button>
                }
                type={isVisible ? "text" : "password"}
                isRequired
                isInvalid={!!validationErrors.password}
                errorMessage={validationErrors.password}
                variant="bordered"
              />

              <div className="flex items-center justify-between">
                <Checkbox
                  isSelected={rememberMe}
                  onValueChange={setRememberMe}
                  size="sm"
                >
                  记住我
                </Checkbox>
                <Link href="#" size="sm" className="text-primary">
                  忘记密码？
                </Link>
              </div>

              <Button
                type="submit"
                color="primary"
                size="lg"
                isLoading={isLoading}
                className="w-full"
              >
                {isLoading ? "登录中..." : "登录"}
              </Button>
            </form>

            <Divider />

            <div className="text-center">
              <p className="text-sm text-default-500">
                还没有账户？{" "}
                <Link href="#" size="sm" className="text-primary">
                  联系管理员
                </Link>
              </p>
            </div>
          </CardBody>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-xs text-default-400">
            © 2024 Smart Match System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
