"use client"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import {
  Card,
  CardHeader,
  CardBody,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Button,
  Select,
  SelectItem,
  Progress,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Input,
  Pagination,
  Checkbox,
} from "@nextui-org/react"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  ArrowLeft,
  Package,
  Target,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  Edit,
  Search,
  Check,
  X,
} from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { useNotifications } from "@/stores/app"
import { buildApiUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/auth"
import BatchEditModal from "./batch-edit-modal"

interface MatchingResult {
  _id: string
  originalData: {
    name: string
    price: number
    quantity: number
    unit: string
    supplier: string
  }
  selectedMatch?: {
    productId: {
      _id: string
      name: string
      brand: string
      company: string
      productType: string
      packageType: string
      specifications: {
        circumference: number
        length: string
        packageQuantity: number
      }
      chemicalContent: {
        tarContent: number
        nicotineContent: number
        carbonMonoxideContent: number
      }
      appearance: {
        color: string
      }
      features: {
        hasPop: boolean
      }
      pricing: {
        priceCategory: string
        retailPrice: number
        unit: string
        companyPrice: number
      }
      productCode: string
      boxCode: string
    }
    confidence: number
    score: number
    matchType: string
  }
  status: "confirmed" | "rejected" | "exception"
  metadata: {
    source: {
      row: number
      file: string
    }
  }
}

interface TaskInfo {
  _id: string
  templateId: string
  originalFilename: string
  status: string
  progress: {
    totalItems: number
    confirmedItems: number
    pendingItems: number
    rejectedItems: number
    exceptionItems: number
  }
  statistics: {
    averageConfidence: number
    matchRate: number
  }
}

interface Product {
  _id: string
  name: string
  brand: string
  company: string
  productType: string
  packageType: string
  specifications: {
    circumference: number
    length: string
    packageQuantity: number
  }
  chemicalContent: {
    tarContent: number
    nicotineContent: number
    carbonMonoxideContent: number
  }
  appearance: {
    color: string
  }
  features: {
    hasPop: boolean
  }
  pricing: {
    priceCategory: string
    retailPrice: number
    unit: string
    companyPrice: number
  }
  productCode: string
  boxCode: string
  keywords: string[]
  category: string
}

const StatusChip = ({ status }: { status: string }) => {
  const config = {
    confirmed: { color: "success" as const, label: "已确认", icon: "✅" },
    rejected: { color: "danger" as const, label: "已拒绝", icon: "❌" },
    exception: { color: "warning" as const, label: "异常", icon: "⚠️" },
  }

  const { color, label, icon } =
    config[status as keyof typeof config] || config.exception

  return (
    <Chip variant="flat" color={color} size="sm">
      {icon} {label}
    </Chip>
  )
}

const MatchTypeChip = ({ matchType }: { matchType: string }) => {
  const config = {
    auto: { color: "primary" as const, label: "自动匹配" },
    manual: { color: "secondary" as const, label: "人工确认" },
    expert: { color: "warning" as const, label: "专家审核" },
  }

  const { color, label } =
    config[matchType as keyof typeof config] || config.auto

  return (
    <Chip variant="flat" color={color} size="sm">
      {label}
    </Chip>
  )
}

function MatchingResultsPageContent() {
  const searchParams = useSearchParams()
  const taskId = searchParams.get("taskId")
  const taskName = searchParams.get("taskName") || "未知任务"
  const taskIdentifier = searchParams.get("taskIdentifier") || ""

  const [results, setResults] = useState<MatchingResult[]>([])
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  // 修改匹配相关状态
  const [editingRecord, setEditingRecord] = useState<MatchingResult | null>(
    null
  )
  const [templateProducts, setTemplateProducts] = useState<Product[]>([])
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [isLoadingProducts, setIsLoadingProducts] = useState(false)

  // 批量编辑模式
  const [batchEditMode, setBatchEditMode] = useState(false)
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [batchChanges, setBatchChanges] = useState<Map<string, string>>(
    new Map()
  )

  // 原始名字编辑相关状态
  const [editingOriginalName, setEditingOriginalName] = useState<string | null>(
    null
  )
  const [tempOriginalName, setTempOriginalName] = useState("")

  // Modal控制
  const {
    isOpen: isEditModalOpen,
    onOpen: onEditModalOpen,
    onClose: onEditModalClose,
  } = useDisclosure()
  const {
    isOpen: isBatchModalOpen,
    onOpen: onBatchModalOpen,
    onClose: onBatchModalClose,
  } = useDisclosure()

  // 通知系统
  const notifications = useNotifications()

  // 获取匹配结果
  const fetchResults = async () => {
    if (!taskId) return

    try {
      setLoading(true)
      console.log("🔄 开始获取匹配结果")

      // 获取任务信息
      const taskResponse = await fetch(
        buildApiUrl(`/matching/tasks/${taskId}`),
        {
          headers: getAuthHeaders(),
        }
      )

      if (taskResponse.ok) {
        const taskData = await taskResponse.json()
        setTaskInfo(taskData.data.task)
      }

      // 获取匹配记录（所有状态）
      const url = new URL(buildApiUrl("/matching/records"))
      url.searchParams.set("taskId", taskId)
      url.searchParams.set("limit", "1000") // 获取所有记录

      const response = await fetch(url.toString(), {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setResults(data.data.records || [])
    } catch (error) {
      console.error("❌ 获取匹配结果失败:", error)
      notifications.error("获取失败", "无法获取匹配结果")
    } finally {
      setLoading(false)
    }
  }

  // 过滤结果
  const filteredResults = results.filter(result => {
    if (filter === "all") return true
    return result.status === filter
  })

  // 导出状态
  const [isExporting, setIsExporting] = useState(false)

  // 导出Excel结果
  const exportResults = async (format: "excel" | "csv" = "excel") => {
    if (!taskId) return

    setIsExporting(true)
    try {
      const response = await fetch(
        buildApiUrl(`/matching/tasks/${taskId}/export?format=${format}`),
        {
          method: "GET",
          headers: getAuthHeaders(),
        }
      )

      if (!response.ok) {
        throw new Error(`导出失败: ${response.status}`)
      }

      // 获取文件名
      const contentDisposition = response.headers.get("content-disposition")
      const fileNameMatch = contentDisposition?.match(/filename\*?=([^;]+)/)

      // 从原文件名中提取基础名称（去掉扩展名）
      const baseFilename = taskInfo?.originalFilename
        ? taskInfo.originalFilename.replace(/\.[^/.]+$/, "") // 去掉任何扩展名
        : "结果"
      let fileName = `匹配结果_${baseFilename}.${format === "excel" ? "xlsx" : "csv"}`

      if (fileNameMatch) {
        fileName = decodeURIComponent(fileNameMatch[1].replace(/"/g, ""))
      }

      // 下载文件
      const blob = await response.blob()
      const link = document.createElement("a")
      link.href = URL.createObjectURL(blob)
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)

      notifications.success(
        "导出成功",
        `匹配结果已导出为${format === "excel" ? "Excel" : "CSV"}文件`
      )
    } catch (error) {
      console.error("❌ 导出失败:", error)
      notifications.error("导出失败", "无法导出匹配结果，请稍后重试")
    } finally {
      setIsExporting(false)
    }
  }

  // 获取模板商品列表（分页获取所有商品）
  const fetchTemplateProducts = async () => {
    console.log("📋 开始获取商品列表, taskInfo:", taskInfo)

    if (!taskInfo?.templateId) {
      console.error("❌ templateId 不存在:", taskInfo)
      notifications.error("参数错误", "缺少模板ID信息")
      return false
    }

    try {
      setIsLoadingProducts(true)
      let allProducts: Product[] = []
      let currentPage = 1
      const pageSize = 100
      let hasMore = true
      const maxPages = 50 // 安全限制，最多获取50页

      console.log("🔄 开始分页获取商品列表...")

      while (hasMore && currentPage <= maxPages) {
        const url = buildApiUrl(
          `/products?templateId=${taskInfo.templateId}&page=${currentPage}&limit=${pageSize}`
        )
        console.log(`🚀 获取第${currentPage}页商品 URL:`, url)

        const response = await fetch(url, {
          headers: getAuthHeaders(),
        })

        console.log(`📡 第${currentPage}页响应状态:`, response.status)

        if (!response.ok) {
          const errorText = await response.text()
          console.error("❌ API 错误:", errorText)
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }

        const data = await response.json()
        console.log(`📦 第${currentPage}页数据:`, {
          success: data.success,
          productsLength: data.data?.products?.length || 0,
          pagination: data.data?.pagination || data.data,
        })

        if (data.success && data.data?.products) {
          allProducts = [...allProducts, ...data.data.products]

          // 检查分页信息，判断是否还有更多页面
          const pagination = data.data.pagination || data.data
          if (
            pagination?.hasNext === false ||
            (pagination?.pages && currentPage >= pagination.pages) ||
            data.data.products.length < pageSize ||
            currentPage >= maxPages
          ) {
            hasMore = false
            console.log(
              `🏁 分页结束：hasNext=${pagination?.hasNext}, currentPage=${currentPage}, totalPages=${pagination?.pages}, maxPagesReached=${currentPage >= maxPages}`
            )
          } else {
            currentPage++
            console.log(`📄 继续下一页：第${currentPage}页`)
          }
        } else {
          console.error("❌ 数据格式错误，停止分页:", data)
          hasMore = false
        }
      }

      console.log("✅ 分页获取完成，总计:", allProducts.length, "个商品")
      setTemplateProducts(allProducts)

      if (allProducts.length > 0) {
        notifications.success("加载成功", `已加载 ${allProducts.length} 个商品`)
      } else {
        notifications.warning("暂无商品", "模板下暂无商品数据")
      }

      return allProducts.length > 0
    } catch (error) {
      console.error("❌ 获取商品列表失败:", error)
      notifications.error(
        "获取失败",
        `无法获取商品列表: ${error instanceof Error ? error.message : "未知错误"}`
      )
      return false
    } finally {
      setIsLoadingProducts(false)
    }
  }

  // 打开修改匹配Modal
  const openEditModal = async (record: MatchingResult) => {
    setEditingRecord(record)
    setProductSearchTerm("")
    setCurrentPage(1)
    await fetchTemplateProducts()
    onEditModalOpen()
  }

  // 更新匹配记录
  const updateMatchingRecord = async (productId: string) => {
    if (!editingRecord) return

    try {
      setIsUpdating(true)
      const response = await fetch(
        buildApiUrl(`/matching/records/${editingRecord._id}/review`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            action: "confirm",
            productId,
            note: "手动修改匹配",
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      notifications.success("修改成功", "匹配记录已更新")
      onEditModalClose()
      await fetchResults() // 刷新结果列表
    } catch (error) {
      console.error("❌ 更新匹配记录失败:", error)
      notifications.error("修改失败", "无法更新匹配记录")
    } finally {
      setIsUpdating(false)
    }
  }

  // 过滤和分页商品 - 支持全字段搜索
  const filteredProducts = templateProducts.filter(product => {
    const lowerSearchTerm = productSearchTerm.toLowerCase()
    return (
      product.name.toLowerCase().includes(lowerSearchTerm) ||
      product.brand.toLowerCase().includes(lowerSearchTerm) ||
      product.company?.toLowerCase().includes(lowerSearchTerm) ||
      product.productType?.toLowerCase().includes(lowerSearchTerm) ||
      product.packageType?.toLowerCase().includes(lowerSearchTerm) ||
      product.productCode?.toLowerCase().includes(lowerSearchTerm) ||
      product.boxCode?.toLowerCase().includes(lowerSearchTerm) ||
      product.pricing?.priceCategory?.toLowerCase().includes(lowerSearchTerm) ||
      product.keywords.some(keyword =>
        keyword.toLowerCase().includes(lowerSearchTerm)
      )
    )
  })

  const productsPerPage = 10
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * productsPerPage,
    currentPage * productsPerPage
  )

  // 批量编辑相关函数
  const toggleRecordSelection = (recordId: string) => {
    setSelectedRecords(prev => {
      const newSet = new Set(prev)
      if (newSet.has(recordId)) {
        newSet.delete(recordId)
      } else {
        newSet.add(recordId)
      }
      return newSet
    })
  }

  const toggleAllSelection = () => {
    if (
      selectedRecords.size === filteredResults.length &&
      filteredResults.length > 0
    ) {
      setSelectedRecords(new Set())
    } else {
      setSelectedRecords(new Set(filteredResults.map(r => r._id)))
    }
  }

  const openBatchProductSelector = async () => {
    if (selectedRecords.size === 0) {
      notifications.warning("未选择记录", "请先选择要修改的记录")
      return
    }

    console.log("🔍 准备打开批量商品选择器")
    console.log("📊 当前商品列表状态:", {
      productsCount: templateProducts.length,
      isLoadingProducts,
      taskInfoExists: !!taskInfo,
      templateId: taskInfo?.templateId,
    })

    // 如果还没有加载商品列表，先加载
    if (templateProducts.length === 0 && !isLoadingProducts) {
      console.log("🔄 批量编辑时加载商品列表")
      const success = await fetchTemplateProducts()
      if (!success) {
        console.error("❌ 商品列表加载失败，取消打开选择器")
        return
      }
    }

    setProductSearchTerm("")
    setCurrentPage(1)
    onBatchModalOpen()
  }

  // 保存批量修改
  // 开始编辑原始名字
  const startEditingOriginalName = (recordId: string, currentName: string) => {
    setEditingOriginalName(recordId)
    setTempOriginalName(currentName)
  }

  // 取消编辑原始名字
  const cancelEditingOriginalName = () => {
    setEditingOriginalName(null)
    setTempOriginalName("")
  }

  // 保存原始名字修改
  const saveOriginalName = async (recordId: string) => {
    if (!tempOriginalName.trim()) {
      notifications.warning("输入错误", "原始名称不能为空")
      return
    }

    try {
      setIsUpdating(true)
      const response = await fetch(
        buildApiUrl(`/matching/records/${recordId}/original-name`),
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            originalName: tempOriginalName.trim(),
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      notifications.success("修改成功", "原始名称已更新")
      setEditingOriginalName(null)
      setTempOriginalName("")
      await fetchResults() // 刷新结果列表
    } catch (error) {
      console.error("❌ 更新原始名称失败:", error)
      notifications.error("修改失败", "无法更新原始名称")
    } finally {
      setIsUpdating(false)
    }
  }

  const saveBatchChanges = async () => {
    if (batchChanges.size === 0) {
      notifications.warning("无修改", "没有需要保存的修改")
      return
    }

    setIsUpdating(true)
    let successCount = 0
    let failCount = 0

    try {
      for (const [recordId, productId] of batchChanges) {
        try {
          const response = await fetch(
            buildApiUrl(`/matching/records/${recordId}/review`),
            {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({
                action: "confirm",
                productId,
                note: "批量编辑修改",
              }),
            }
          )

          if (response.ok) {
            successCount++
          } else {
            failCount++
          }
        } catch {
          failCount++
        }
      }

      notifications.success(
        "批量修改完成",
        `成功修改 ${successCount} 条记录${failCount > 0 ? `，失败 ${failCount} 条` : ""}`
      )

      // 清空所有选择并刷新数据
      setSelectedRecords(new Set())
      setBatchChanges(new Map())
      setBatchEditMode(false)

      await fetchResults()
      onBatchModalClose()
    } catch (error) {
      console.error("❌ 批量修改失败:", error)
      notifications.error("修改失败", "批量修改时发生错误")
    } finally {
      setIsUpdating(false)
    }
  }

  // 快速CSV导出（客户端）
  const exportCSV = () => {
    const csvContent = [
      [
        "原始名称",
        "原始价格",
        "数量",
        "供应商",
        "匹配商品",
        "匹配品牌",
        "所属企业",
        "产品类型",
        "价格类型",
        "公司价",
        "单位",
        "产品编码",
        "盒码",
        "包装类型",
        "是否爆珠",
        "置信度",
        "匹配方式",
        "状态",
        "来源行号",
      ],
      ...filteredResults.map(result => [
        result.originalData.name,
        result.originalData.price || 0,
        result.originalData.quantity || 1,
        result.originalData.supplier || "",
        result.selectedMatch?.productId?.name || "无匹配",
        result.selectedMatch?.productId?.brand || "-",
        result.selectedMatch?.productId?.company || "-",
        result.selectedMatch?.productId?.productType || "-",
        result.selectedMatch?.productId?.pricing?.priceCategory || "-",
        result.selectedMatch?.productId?.pricing?.companyPrice ||
          result.selectedMatch?.productId?.pricing?.retailPrice ||
          0,
        result.selectedMatch?.productId?.pricing?.unit || "元/条",
        result.selectedMatch?.productId?.productCode || "-",
        result.selectedMatch?.productId?.boxCode || "-",
        result.selectedMatch?.productId?.packageType || "-",
        result.selectedMatch?.productId?.features?.hasPop ? "是" : "否",
        result.selectedMatch?.confidence
          ? `${result.selectedMatch.confidence}%`
          : "-",
        result.selectedMatch?.matchType === "auto"
          ? "自动匹配"
          : result.selectedMatch?.matchType === "manual"
            ? "人工确认"
            : "专家审核",
        result.status === "confirmed"
          ? "已确认"
          : result.status === "rejected"
            ? "已拒绝"
            : "异常",
        result.metadata.source.row,
      ]),
    ]
      .map(row => row.join(","))
      .join("\n")

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = `匹配结果_${taskInfo?.originalFilename || "结果"}.csv`
    link.click()
    URL.revokeObjectURL(link.href)

    notifications.success("导出成功", "匹配结果已导出到CSV文件")
  }

  useEffect(() => {
    console.log("🔄 useEffect 触发，taskId:", taskId)
    fetchResults()
  }, [taskId])

  if (!taskId) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <EmptyState
          icon={<AlertTriangle className="h-12 w-12" />}
          title="任务ID缺失"
          description="无法加载匹配结果"
        />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="light"
            startContent={<ArrowLeft className="h-4 w-4" />}
            as="a"
            href="/dashboard/matching"
          >
            返回
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">匹配结果</h1>
              {taskIdentifier && (
                <Chip
                  size="sm"
                  variant="flat"
                  color="primary"
                  className="font-mono"
                >
                  {taskIdentifier}
                </Chip>
              )}
            </div>
            <p className="text-default-500">
              任务：
              <span className="font-medium text-foreground">
                {decodeURIComponent(taskName)}
              </span>{" "}
              的匹配结果
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Select
            size="sm"
            placeholder="筛选结果"
            selectedKeys={[filter]}
            onChange={e => setFilter(e.target.value)}
            className="w-48"
          >
            <SelectItem key="all">全部结果</SelectItem>
            <SelectItem key="confirmed">已确认</SelectItem>
            <SelectItem key="rejected">已拒绝</SelectItem>
            <SelectItem key="exception">异常</SelectItem>
          </Select>
          <Button
            color="warning"
            variant="flat"
            startContent={<Edit className="h-4 w-4" />}
            onClick={async () => {
              const newMode = !batchEditMode
              setBatchEditMode(newMode)

              // 如果进入批量编辑模式且还没有商品列表，预先加载
              if (
                newMode &&
                templateProducts.length === 0 &&
                !isLoadingProducts
              ) {
                console.log("🔄 进入批量编辑模式，预加载商品列表")
                await fetchTemplateProducts()
              }
            }}
            isDisabled={filteredResults.length === 0}
          >
            {batchEditMode ? "退出批量编辑" : "批量编辑"}
          </Button>
          <Dropdown>
            <DropdownTrigger>
              <Button
                color="primary"
                endContent={<ChevronDown className="h-4 w-4" />}
                isDisabled={filteredResults.length === 0}
                isLoading={isExporting}
              >
                导出结果
              </Button>
            </DropdownTrigger>
            <DropdownMenu aria-label="导出格式选择">
              <DropdownItem
                key="excel"
                startContent={<FileSpreadsheet className="h-4 w-4" />}
                description="完整的Excel文件，包含样式和汇总"
                onClick={() => exportResults("excel")}
              >
                导出Excel (.xlsx)
              </DropdownItem>
              <DropdownItem
                key="csv"
                startContent={<FileText className="h-4 w-4" />}
                description="简单的CSV文件，快速导出"
                onClick={exportCSV}
              >
                导出CSV (.csv)
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      {/* 任务统计 */}
      {taskInfo && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-default-500">总条目</p>
                  <p className="text-xl font-bold">
                    {taskInfo.progress.totalItems}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-success/10 p-2">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-default-500">已确认</p>
                  <p className="text-xl font-bold">
                    {taskInfo.progress.confirmedItems}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-danger/10 p-2">
                  <XCircle className="h-5 w-5 text-danger" />
                </div>
                <div>
                  <p className="text-sm text-default-500">已拒绝</p>
                  <p className="text-xl font-bold">
                    {taskInfo.progress.rejectedItems}
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-warning/10 p-2">
                  <Target className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-default-500">匹配率</p>
                  <p className="text-xl font-bold">
                    {taskInfo.statistics.matchRate}%
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* 结果列表 */}
      <Card>
        <CardHeader>
          <div className="flex w-full items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">匹配结果详情</h2>
              <p className="text-sm text-default-500">
                {filteredResults.length} 条匹配结果
                {batchEditMode && selectedRecords.size > 0 && (
                  <span className="ml-2 text-primary-600">
                    · 已选择 {selectedRecords.size} 条
                  </span>
                )}
              </p>
            </div>
            {batchEditMode && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="flat"
                  onClick={toggleAllSelection}
                  disabled={filteredResults.length === 0}
                >
                  {selectedRecords.size === filteredResults.length &&
                  filteredResults.length > 0
                    ? "取消全选"
                    : "全选"}
                </Button>
                <Button
                  size="sm"
                  color="primary"
                  onClick={openBatchProductSelector}
                  disabled={selectedRecords.size === 0}
                  startContent={<Edit className="h-4 w-4" />}
                >
                  开始编辑 ({selectedRecords.size})
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardBody>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                <p>加载中...</p>
              </div>
            </div>
          ) : filteredResults.length === 0 ? (
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title="暂无匹配结果"
              description="当前筛选条件下没有找到匹配结果"
            />
          ) : (
            <Table
              aria-label="匹配结果表格"
              key={batchEditMode ? "batch" : "normal"}
            >
              <TableHeader>
                <TableColumn
                  style={{ display: batchEditMode ? "table-cell" : "none" }}
                >
                  选择
                </TableColumn>
                <TableColumn>原始名称</TableColumn>
                <TableColumn>匹配商品</TableColumn>
                <TableColumn>置信度</TableColumn>
                <TableColumn>匹配方式</TableColumn>
                <TableColumn>状态</TableColumn>
                <TableColumn>来源</TableColumn>
                <TableColumn
                  style={{ display: batchEditMode ? "none" : "table-cell" }}
                >
                  操作
                </TableColumn>
              </TableHeader>
              <TableBody>
                {filteredResults.map(result => (
                  <TableRow
                    key={result._id}
                    className={
                      selectedRecords.has(result._id) ? "bg-primary-50" : ""
                    }
                  >
                    <TableCell
                      style={{ display: batchEditMode ? "table-cell" : "none" }}
                    >
                      <Checkbox
                        isSelected={selectedRecords.has(result._id)}
                        onChange={() => toggleRecordSelection(result._id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {editingOriginalName === result._id ? (
                          <div className="flex items-center gap-2">
                            <Input
                              size="sm"
                              value={tempOriginalName}
                              onChange={e =>
                                setTempOriginalName(e.target.value)
                              }
                              onKeyDown={e => {
                                if (e.key === "Enter") {
                                  saveOriginalName(result._id)
                                } else if (e.key === "Escape") {
                                  cancelEditingOriginalName()
                                }
                              }}
                              autoFocus
                              className="max-w-xs"
                            />
                            <Button
                              size="sm"
                              color="success"
                              variant="flat"
                              isIconOnly
                              onClick={() => saveOriginalName(result._id)}
                              isLoading={isUpdating}
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              color="danger"
                              variant="flat"
                              isIconOnly
                              onClick={cancelEditingOriginalName}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <p className="font-medium">
                                {result.originalData.name}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              variant="light"
                              isIconOnly
                              onClick={() =>
                                startEditingOriginalName(
                                  result._id,
                                  result.originalData.name
                                )
                              }
                              className="opacity-60 hover:opacity-100"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        <p className="text-xs text-default-500">
                          ¥{result.originalData.price}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {result.selectedMatch &&
                      result.selectedMatch.productId ? (
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {result.selectedMatch.productId?.name || "产品名称"}
                          </p>
                          <div className="flex flex-wrap gap-1 text-xs text-default-500">
                            <span className="font-medium">
                              {result.selectedMatch.productId?.brand ||
                                "未知品牌"}
                            </span>
                            {result.selectedMatch.productId?.company && (
                              <>
                                <span>|</span>
                                <span>
                                  {result.selectedMatch.productId.company}
                                </span>
                              </>
                            )}
                          </div>
                          <div className="flex flex-wrap gap-1 text-xs">
                            {result.selectedMatch.productId?.productType && (
                              <Chip size="sm" variant="flat" color="primary">
                                {result.selectedMatch.productId.productType}
                              </Chip>
                            )}
                            {result.selectedMatch.productId?.pricing
                              ?.priceCategory && (
                              <Chip size="sm" variant="flat" color="secondary">
                                {
                                  result.selectedMatch.productId.pricing
                                    .priceCategory
                                }
                              </Chip>
                            )}
                            {result.selectedMatch.productId?.features
                              ?.hasPop && (
                              <Chip size="sm" variant="flat" color="success">
                                爆珠
                              </Chip>
                            )}
                          </div>
                          <div className="text-xs text-default-500">
                            ¥
                            {result.selectedMatch.productId?.pricing
                              ?.companyPrice ||
                              result.selectedMatch.productId?.pricing
                                ?.retailPrice ||
                              "0"}
                            {result.selectedMatch.productId?.pricing?.unit &&
                              ` / ${result.selectedMatch.productId.pricing.unit}`}
                          </div>
                          {(result.selectedMatch.productId?.productCode ||
                            result.selectedMatch.productId?.boxCode) && (
                            <div className="space-y-0.5">
                              {result.selectedMatch.productId?.productCode && (
                                <p className="text-xs text-default-400">
                                  产品编码:{" "}
                                  {result.selectedMatch.productId.productCode}
                                </p>
                              )}
                              {result.selectedMatch.productId?.boxCode && (
                                <p className="text-xs text-default-400">
                                  盒码: {result.selectedMatch.productId.boxCode}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-default-400">无匹配</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.selectedMatch ? (
                        <div className="space-y-1">
                          <div className="font-bold text-success">
                            {result.selectedMatch.confidence}%
                          </div>
                          <Progress
                            value={result.selectedMatch.confidence}
                            size="sm"
                            color="success"
                          />
                        </div>
                      ) : (
                        <span className="text-default-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {result.selectedMatch ? (
                        <MatchTypeChip
                          matchType={result.selectedMatch.matchType}
                        />
                      ) : (
                        <span className="text-default-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip status={result.status} />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-default-500">
                        第{result.metadata.source.row}行
                      </span>
                    </TableCell>
                    <TableCell
                      style={{ display: batchEditMode ? "none" : "table-cell" }}
                    >
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        color="primary"
                        onClick={() => openEditModal(result)}
                        title="修改匹配"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* 修改匹配Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={onEditModalClose}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>
            修改匹配 - {editingRecord?.originalData.name}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {/* 当前匹配信息 */}
              <div className="rounded-lg bg-default-50 p-4">
                <h4 className="mb-2 font-medium">当前匹配</h4>
                {editingRecord?.selectedMatch?.productId ? (
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        {editingRecord.selectedMatch.productId.name}
                      </p>
                      <p className="text-sm text-default-500">
                        {editingRecord.selectedMatch.productId.brand} | ¥
                        {editingRecord.selectedMatch.productId.pricing
                          ?.companyPrice ||
                          editingRecord.selectedMatch.productId.pricing
                            ?.retailPrice ||
                          0}
                      </p>
                    </div>
                    <Chip color="success" variant="flat">
                      置信度: {editingRecord.selectedMatch.confidence}%
                    </Chip>
                  </div>
                ) : (
                  <p className="text-default-500">当前无匹配</p>
                )}
              </div>

              {/* 商品搜索 */}
              <Input
                ref={input => {
                  if (input && isEditModalOpen) {
                    setTimeout(() => input.focus(), 100)
                  }
                }}
                placeholder="搜索商品名称、品牌、企业、产品类型、价格类型、条码、盒码或关键词..."
                value={productSearchTerm}
                onChange={e => {
                  setProductSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                startContent={<Search className="h-4 w-4" />}
                isClearable
                onClear={() => setProductSearchTerm("")}
              />

              {/* 商品列表 */}
              <div className="space-y-2">
                <h4 className="font-medium">选择正确的商品</h4>
                {isLoadingProducts ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                      <p className="text-sm">加载商品中...</p>
                    </div>
                  </div>
                ) : paginatedProducts.length === 0 ? (
                  <div className="py-8 text-center text-default-500">
                    {productSearchTerm
                      ? "没有找到匹配的商品"
                      : "模板下暂无商品"}
                  </div>
                ) : (
                  <>
                    <div className="max-h-96 overflow-y-auto scroll-smooth will-change-scroll">
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                        {paginatedProducts.map(product => {
                          const isSelected =
                            editingRecord?.selectedMatch?.productId?._id ===
                            product._id
                          return (
                            <Card
                              key={product._id}
                              className={`cursor-pointer transition-all duration-200 ease-in-out ${
                                isSelected
                                  ? "bg-primary-50 shadow-lg ring-2 ring-primary"
                                  : "hover:bg-default-50 hover:shadow-md"
                              }`}
                              onClick={() => updateMatchingRecord(product._id)}
                              isPressable
                            >
                              <CardBody className="relative p-3">
                                {isSelected && (
                                  <div className="absolute right-2 top-2">
                                    <Chip
                                      size="sm"
                                      color="primary"
                                      variant="solid"
                                      className="text-xs"
                                    >
                                      ✓ 已选
                                    </Chip>
                                  </div>
                                )}
                                <div className="space-y-2">
                                  <p
                                    className={`line-clamp-2 text-sm font-medium ${
                                      isSelected ? "text-primary-700" : ""
                                    }`}
                                  >
                                    {product.name}
                                  </p>

                                  {/* 基本信息 */}
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap gap-2 text-xs text-default-600">
                                      <span>{product.brand}</span>
                                      {product.company && (
                                        <>
                                          <span>|</span>
                                          <span>{product.company}</span>
                                        </>
                                      )}
                                      {product.productType && (
                                        <>
                                          <span>|</span>
                                          <span>{product.productType}</span>
                                        </>
                                      )}
                                    </div>

                                    {/* 价格信息 */}
                                    <div className="flex items-center justify-between">
                                      <p
                                        className={`text-xs font-medium ${
                                          isSelected
                                            ? "text-primary-600"
                                            : "text-success"
                                        }`}
                                      >
                                        ¥
                                        {product.pricing?.companyPrice ||
                                          product.pricing?.retailPrice ||
                                          0}
                                        {product.pricing?.unit &&
                                          ` / ${product.pricing.unit}`}
                                      </p>
                                      {product.pricing?.priceCategory && (
                                        <Chip
                                          size="sm"
                                          variant="flat"
                                          color="secondary"
                                          className="text-xs"
                                        >
                                          {product.pricing.priceCategory}
                                        </Chip>
                                      )}
                                    </div>

                                    {/* 规格信息 */}
                                    {product.specifications && (
                                      <div className="space-y-0.5">
                                        {product.specifications
                                          .circumference && (
                                          <p className="text-xs text-default-500">
                                            周长:{" "}
                                            {
                                              product.specifications
                                                .circumference
                                            }
                                            mm
                                          </p>
                                        )}
                                        {product.specifications.length && (
                                          <p className="text-xs text-default-500">
                                            长度:{" "}
                                            {product.specifications.length}
                                          </p>
                                        )}
                                      </div>
                                    )}

                                    {/* 化学成分 */}
                                    {product.chemicalContent && (
                                      <div className="flex flex-wrap gap-2 text-xs text-default-500">
                                        {product.chemicalContent.tarContent !==
                                          undefined && (
                                          <span>
                                            焦油:
                                            {product.chemicalContent.tarContent}
                                            mg
                                          </span>
                                        )}
                                        {product.chemicalContent
                                          .nicotineContent !== undefined && (
                                          <span>
                                            烟碱:
                                            {
                                              product.chemicalContent
                                                .nicotineContent
                                            }
                                            mg
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    {/* 编码信息 */}
                                    <div className="space-y-0.5">
                                      {product.productCode && (
                                        <p className="text-xs text-default-500">
                                          产品编码: {product.productCode}
                                        </p>
                                      )}
                                      {product.boxCode && (
                                        <p className="text-xs text-default-500">
                                          盒码: {product.boxCode}
                                        </p>
                                      )}
                                    </div>
                                  </div>

                                  {/* 特殊属性标签 */}
                                  <div className="flex flex-wrap gap-1">
                                    {product.packageType && (
                                      <Chip
                                        size="sm"
                                        variant="flat"
                                        color="default"
                                        className="text-xs"
                                      >
                                        {product.packageType}
                                      </Chip>
                                    )}
                                    {product.features?.hasPop && (
                                      <Chip
                                        size="sm"
                                        variant="flat"
                                        color="success"
                                        className="text-xs"
                                      >
                                        爆珠
                                      </Chip>
                                    )}
                                    {product.appearance?.color && (
                                      <Chip
                                        size="sm"
                                        variant="flat"
                                        color="warning"
                                        className="text-xs"
                                      >
                                        {product.appearance.color}
                                      </Chip>
                                    )}
                                  </div>

                                  {/* 关键词 */}
                                  {product.keywords &&
                                    product.keywords.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {product.keywords
                                          .slice(0, 2)
                                          .map((keyword, index) => (
                                            <Chip
                                              key={index}
                                              size="sm"
                                              variant="flat"
                                              color={
                                                isSelected
                                                  ? "primary"
                                                  : "default"
                                              }
                                              className="text-xs"
                                            >
                                              {keyword}
                                            </Chip>
                                          ))}
                                        {product.keywords.length > 2 && (
                                          <Chip
                                            size="sm"
                                            variant="flat"
                                            color={
                                              isSelected ? "primary" : "default"
                                            }
                                            className="text-xs"
                                          >
                                            +{product.keywords.length - 2}
                                          </Chip>
                                        )}
                                      </div>
                                    )}
                                </div>
                              </CardBody>
                            </Card>
                          )
                        })}
                      </div>
                    </div>

                    {/* 分页 */}
                    {totalPages > 1 && (
                      <div className="flex justify-center pt-4">
                        <Pagination
                          total={totalPages}
                          page={currentPage}
                          onChange={setCurrentPage}
                          size="sm"
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onEditModalClose}>
              取消
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 批量编辑界面Modal - 使用新组件 */}
      <BatchEditModal
        isOpen={isBatchModalOpen}
        onClose={onBatchModalClose}
        selectedRecords={selectedRecords}
        records={filteredResults}
        templateProducts={templateProducts}
        batchChanges={batchChanges}
        setBatchChanges={setBatchChanges}
        onSave={saveBatchChanges}
        isLoading={isUpdating}
        isLoadingProducts={isLoadingProducts}
      />
    </div>
  )
}

export default function MatchingResultsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
            <p>加载中...</p>
          </div>
        </div>
      }
    >
      <MatchingResultsPageContent />
    </Suspense>
  )
}
