"use client"

import { useState, useMemo } from "react"
import { Card, CardBody, Button, Input, Chip, Spinner } from "@nextui-org/react"
import {
  Search,
  Download,
  RefreshCw,
  DollarSign,
  TrendingUp,
  AlertTriangle,
} from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { formatCurrency, formatPercentage } from "@/lib/utils"
import { useNotifications } from "@/stores/app"
import { useProducts, useProductStats, useCategories } from "@/hooks/useApiData"

interface Product {
  _id: string
  name: string
  brand: string
  category?: string
  specifications?: {
    price?: number
  }
  wholesalePrice?: number
  isActive: boolean
  updatedAt: string
}

export default function PricesPage() {
  const { success: showSuccess } = useNotifications()
  const [searchValue, setSearchValue] = useState("")

  // 使用优化的数据获取hooks
  const {
    data: productsData,
    isLoading: isProductsLoading,
    refresh: refreshProducts,
  } = useProducts()

  const { data: statsData, refresh: refreshStats } = useProductStats()

  const { data: categoriesData } = useCategories()

  const products = productsData?.products || []
  const stats = statsData
  const categories = categoriesData?.categories || []

  // 使用 useMemo 优化过滤性能
  const filteredProducts = useMemo(() => {
    return products.filter(
      (product: Product) =>
        product.name.toLowerCase().includes(searchValue.toLowerCase()) ||
        product.brand.toLowerCase().includes(searchValue.toLowerCase())
    )
  }, [products, searchValue])

  // 优化的刷新函数
  const handleRefresh = async () => {
    try {
      await Promise.all([refreshProducts(), refreshStats()])
      showSuccess("刷新成功", "价格数据已更新")
    } catch (error) {
      console.error("刷新数据失败:", error)
    }
  }

  if (isProductsLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">价格管理</h1>
        <p className="text-default-500">管理商品价格，监控价格变动和毛利率</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <DollarSign className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-default-500">商品总数</p>
              <p className="text-xl font-bold">
                {stats?.totalProducts || products.length}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-4">
            <div className="rounded-lg bg-success/10 p-3">
              <TrendingUp className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-default-500">启用商品</p>
              <p className="text-xl font-bold">
                {products.filter(p => p.isActive).length}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-4">
            <div className="rounded-lg bg-warning/10 p-3">
              <AlertTriangle className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-default-500">待完善</p>
              <p className="text-xl font-bold">
                {products.filter(p => !p.specifications?.price).length}
              </p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-4">
            <div className="rounded-lg bg-danger/10 p-3">
              <AlertTriangle className="h-6 w-6 text-danger" />
            </div>
            <div>
              <p className="text-sm text-default-500">停用商品</p>
              <p className="text-xl font-bold">
                {products.filter(p => !p.isActive).length}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Input
                placeholder="搜索商品..."
                value={searchValue}
                onValueChange={setSearchValue}
                startContent={<Search className="h-4 w-4" />}
                className="max-w-sm"
                variant="bordered"
                size="sm"
              />
              <div className="flex gap-2">
                <Button
                  variant="flat"
                  size="sm"
                  startContent={<Download className="h-4 w-4" />}
                >
                  导出
                </Button>
                <Button
                  color="primary"
                  size="sm"
                  startContent={<RefreshCw className="h-4 w-4" />}
                  onPress={handleRefresh}
                >
                  刷新
                </Button>
              </div>
            </div>

            <div className="text-sm text-default-400">
              共 {filteredProducts.length} 个商品
            </div>

            <div className="space-y-3">
              {filteredProducts.map(product => (
                <Card key={product._id} className="border border-default-200">
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-2">
                          <h3 className="text-lg font-semibold">
                            {product.name}
                          </h3>
                          <Chip variant="flat" size="sm">
                            {product.brand}
                          </Chip>
                          {product.category && (
                            <Chip variant="flat" size="sm" color="primary">
                              {product.category}
                            </Chip>
                          )}
                          <Chip
                            variant="flat"
                            size="sm"
                            color={product.isActive ? "success" : "default"}
                          >
                            {product.isActive ? "正常" : "停用"}
                          </Chip>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-3">
                          <div>
                            <p className="text-xs text-default-500">零售价格</p>
                            <p className="text-lg font-semibold">
                              {product.specifications?.price
                                ? formatCurrency(product.specifications.price)
                                : "未设置"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-default-500">批发价格</p>
                            <p className="font-medium">
                              {product.wholesalePrice
                                ? formatCurrency(product.wholesalePrice)
                                : "未设置"}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs text-default-500">毛利率</p>
                            <div className="flex items-center gap-2">
                              {product.specifications?.price &&
                              product.wholesalePrice ? (
                                <Chip
                                  variant="flat"
                                  color={
                                    ((product.specifications.price -
                                      product.wholesalePrice) /
                                      product.specifications.price) *
                                      100 >=
                                    8
                                      ? "success"
                                      : ((product.specifications.price -
                                            product.wholesalePrice) /
                                            product.specifications.price) *
                                            100 >=
                                          5
                                        ? "warning"
                                        : "danger"
                                  }
                                  size="sm"
                                >
                                  {formatPercentage(
                                    ((product.specifications.price -
                                      product.wholesalePrice) /
                                      product.specifications.price) *
                                      100
                                  )}
                                </Chip>
                              ) : (
                                <span className="text-sm text-default-400">
                                  无法计算
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="py-8 text-center">
                <p className="text-default-500">没有找到匹配的商品</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
