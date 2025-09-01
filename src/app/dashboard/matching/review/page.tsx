"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import dynamic from "next/dynamic"
import { useSearchParams } from "next/navigation"
import {
  Card,
  CardHeader,
  CardBody,
  Button,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Badge,
  Textarea,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Progress,
  Accordion,
  AccordionItem,
  Checkbox,
  Input,
} from "@nextui-org/react"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ThumbsUp,
  ThumbsDown,
  Clock,
  Target,
  TrendingUp,
  Package,
  Search,
} from "lucide-react"
// 动态导入以避免 hydration 错误
const EmptyState = dynamic(
  () =>
    import("@/components/ui/empty-state").then(mod => ({
      default: mod.EmptyState,
    })),
  {
    ssr: false,
    loading: () => <div>加载中...</div>,
  }
)
import { useNotifications } from "@/stores/app"
import { buildApiUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/auth"

interface MatchingRecord {
  _id: string
  originalData: {
    name: string
    price: number
    quantity: number
    unit: string
  }
  candidates: Array<{
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
    score: {
      name: number
      brand: number
      keywords: number
      package: number
      price: number
      total: number
    }
    confidence: "high" | "medium" | "low"
    reasons: Array<{
      type: string
      description: string
      weight: number
    }>
    rank: number
  }>
  selectedMatch?: {
    productId: string
    confidence: number
    score: number
    matchType: string
  }
  status: "pending" | "reviewing" | "confirmed" | "rejected" | "exception"
  priority: "high" | "medium" | "low"
  exceptions: Array<{
    type: string
    message: string
    severity: string
  }>
  metadata: {
    source: {
      row: number
      file: string
    }
  }
}

const ConfidenceChip = ({ confidence }: { confidence: string }) => {
  const config = {
    high: { color: "success" as const, label: "高", icon: "🎯" },
    medium: { color: "warning" as const, label: "中", icon: "⚠️" },
    low: { color: "danger" as const, label: "低", icon: "🔴" },
  }

  const { color, label, icon } =
    config[confidence as keyof typeof config] || config.low

  return (
    <Chip variant="flat" color={color} size="sm">
      {icon} {label}置信度
    </Chip>
  )
}

const StatusChip = ({ status }: { status: string }) => {
  const config = {
    pending: { color: "default" as const, label: "等待" },
    reviewing: { color: "primary" as const, label: "审核中" },
    confirmed: { color: "success" as const, label: "已确认" },
    rejected: { color: "danger" as const, label: "已拒绝" },
    exception: { color: "warning" as const, label: "异常" },
  }

  const { color, label } =
    config[status as keyof typeof config] || config.pending

  return (
    <Chip variant="flat" color={color} size="sm">
      {label}
    </Chip>
  )
}

const PriorityChip = ({ priority }: { priority: string }) => {
  const config = {
    high: { color: "danger" as const, label: "高" },
    medium: { color: "warning" as const, label: "中" },
    low: { color: "default" as const, label: "低" },
  }

  const { color, label } =
    config[priority as keyof typeof config] || config.medium

  return (
    <Chip variant="flat" color={color} size="sm">
      {label}
    </Chip>
  )
}

function MatchingReviewPageContent() {
  const searchParams = useSearchParams()
  const taskId = searchParams.get("taskId")
  const taskName = searchParams.get("taskName") || "未知任务"
  const taskIdentifier = searchParams.get("taskIdentifier") || ""

  // 任务选择相关状态
  const [tasks, setTasks] = useState<any[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [selectedTaskInfo, setSelectedTaskInfo] = useState<any>(null)

  // 搜索相关状态
  const [searchTerm, setSearchTerm] = useState("")
  const [dateRange, setDateRange] = useState({ start: "", end: "" })

  const [records, setRecords] = useState<MatchingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewLoading, setReviewLoading] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<MatchingRecord | null>(
    null
  )
  const [reviewNote, setReviewNote] = useState("")
  const [filter, setFilter] = useState("all")
  const [pagination, setPagination] = useState({
    current: 1,
    limit: 50,
    total: 0,
    pages: 1,
  })
  const [loadingMore, setLoadingMore] = useState(false)

  // 批量选择相关状态
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [batchLoading, setBatchLoading] = useState(false)

  // 商品搜索状态
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [productSearchLoading, setProductSearchLoading] = useState(false)
  const [selectedAlternativeProduct, setSelectedAlternativeProduct] =
    useState<any>(null)

  // 模态框状态
  const {
    isOpen: isReviewOpen,
    onOpen: onReviewOpen,
    onClose: onReviewClose,
  } = useDisclosure()
  const {
    isOpen: isProductSearchOpen,
    onOpen: onProductSearchOpen,
    onClose: onProductSearchClose,
  } = useDisclosure()

  // 通知系统
  const notifications = useNotifications()

  // 搜索商品
  const searchProducts = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setAvailableProducts([])
      return
    }

    try {
      setProductSearchLoading(true)
      const response = await fetch(
        buildApiUrl(
          `/products?search=${encodeURIComponent(searchTerm)}&limit=20`
        ),
        {
          headers: getAuthHeaders(),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setAvailableProducts(data.data.products)
    } catch (error) {
      console.error("❌ 搜索商品失败:", error)
      notifications.error("搜索失败", "无法搜索商品")
    } finally {
      setProductSearchLoading(false)
    }
  }

  // 选择替代商品
  const selectAlternativeProduct = async (product: any) => {
    // 如果是批量模式
    if (selectedRecords.size > 0) {
      try {
        setBatchLoading(true)
        const recordIds = Array.from(selectedRecords)
        const productIds = recordIds.map(() => product._id)

        const requestBody = {
          recordIds,
          action: "confirm",
          productIds,
          note: `批量匹配到: ${product.name}`,
        }

        const response = await fetch(
          buildApiUrl("/matching/records/batch-review"),
          {
            method: "POST",
            headers: getAuthHeaders(),
            body: JSON.stringify(requestBody),
          }
        )

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const data = await response.json()
        notifications.success(
          "批量匹配完成",
          `成功将 ${data.data.success.length} 条记录匹配到 ${product.name}`
        )

        setSelectedRecords(new Set())
        await fetchReviews()
        onProductSearchClose()
      } catch (error) {
        console.error("❌ 批量匹配失败:", error)
        notifications.error("批量匹配失败", "无法完成批量匹配操作")
      } finally {
        setBatchLoading(false)
      }
    } else {
      // 单个记录模式
      setSelectedAlternativeProduct(product)
      onProductSearchClose()
    }
  }

  // 确认使用替代商品
  const confirmAlternativeProduct = async () => {
    if (!selectedRecord || !selectedAlternativeProduct) return

    try {
      setReviewLoading(true)
      await reviewRecord(
        selectedRecord._id,
        "confirm",
        selectedAlternativeProduct._id
      )
      setSelectedAlternativeProduct(null)
    } catch (error) {
      console.error("❌ 确认替代商品失败:", error)
    } finally {
      setReviewLoading(false)
    }
  }

  // 获取待审核任务列表
  const fetchTasks = async () => {
    try {
      setTasksLoading(true)
      const response = await fetch(buildApiUrl("/matching/tasks"), {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const allTasks = data.data.tasks || []

      // 只显示有待审核记录的任务
      const reviewTasks = allTasks.filter(
        (task: any) =>
          task.status === "review" &&
          (task.progress.pendingItems > 0 || task.progress.exceptionItems > 0)
      )

      setTasks(reviewTasks)
    } catch (error) {
      console.error("❌ 获取任务列表失败:", error)
      notifications.error("获取失败", "无法获取待审核任务列表")
    } finally {
      setTasksLoading(false)
    }
  }

  // 生成任务唯一标识
  const generateTaskIdentifier = (task: any) => {
    const date = new Date(task.createdAt)
      .toLocaleDateString("zh-CN", {
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "")
    const time = new Date(task.createdAt)
      .toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
      })
      .replace(/:/g, "")
    return `${date}-${time}-${task._id.slice(-4)}`
  }

  // 选择任务开始审核
  const selectTaskForReview = (task: any) => {
    const identifier = generateTaskIdentifier(task)
    const taskName = encodeURIComponent(task.originalFilename)
    const taskIdentifier = encodeURIComponent(identifier)

    // 跳转到具体任务的审核页面
    window.location.href = `/dashboard/matching/review?taskId=${task._id}&taskName=${taskName}&taskIdentifier=${taskIdentifier}`
  }

  // 过滤任务列表
  const filteredTasks = tasks.filter(task => {
    const identifier = generateTaskIdentifier(task)
    const filename = task.originalFilename.toLowerCase()
    const searchLower = searchTerm.toLowerCase()

    // 搜索匹配：任务ID、文件名、任务标识
    const matchesSearch =
      !searchTerm ||
      task._id.toLowerCase().includes(searchLower) ||
      filename.includes(searchLower) ||
      identifier.toLowerCase().includes(searchLower)

    // 时间范围过滤
    const taskDate = new Date(task.createdAt)
    const matchesDateRange =
      (!dateRange.start || taskDate >= new Date(dateRange.start)) &&
      (!dateRange.end || taskDate <= new Date(dateRange.end + "T23:59:59"))

    return matchesSearch && matchesDateRange
  })

  // 格式化详细时间（到秒）
  const formatDetailedTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
  }

  // 获取待审核记录
  const fetchReviews = async (loadMore = false) => {
    try {
      if (!loadMore) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      const currentPage = loadMore ? pagination.current + 1 : 1
      const url = new URL(buildApiUrl("/matching/reviews"))
      if (taskId) url.searchParams.set("taskId", taskId)
      url.searchParams.set("page", currentPage.toString())
      url.searchParams.set("limit", pagination.limit.toString())

      const response = await fetch(url.toString(), {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (loadMore) {
        setRecords(prev => [...prev, ...data.data.records])
      } else {
        setRecords(data.data.records)
      }

      setPagination({
        current: data.data.pagination.current,
        limit: data.data.pagination.limit,
        total: data.data.pagination.total,
        pages: data.data.pagination.pages,
      })
    } catch (error) {
      console.error("❌ 获取审核记录失败:", error)
      notifications.error("获取失败", "无法获取待审核记录")
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // 加载更多记录
  const loadMoreReviews = () => {
    if (pagination.current < pagination.pages && !loadingMore) {
      fetchReviews(true)
    }
  }

  // 审核记录
  const reviewRecord = async (
    recordId: string,
    action: "confirm" | "reject",
    productId?: string
  ) => {
    try {
      setReviewLoading(true)

      const response = await fetch(
        buildApiUrl(`/matching/records/${recordId}/review`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            action,
            productId,
            note: reviewNote,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      notifications.success(
        action === "confirm" ? "确认成功" : "拒绝成功",
        `匹配记录已${action === "confirm" ? "确认" : "拒绝"}`
      )

      onReviewClose()
      setReviewNote("")
      await fetchReviews()
    } catch (error) {
      console.error("❌ 审核失败:", error)
      notifications.error("审核失败", "无法完成审核操作")
    } finally {
      setReviewLoading(false)
    }
  }

  // 批量选择相关函数
  const handleSelectRecord = (recordId: string, checked: boolean) => {
    const newSelected = new Set(selectedRecords)
    if (checked) {
      newSelected.add(recordId)
    } else {
      newSelected.delete(recordId)
    }
    setSelectedRecords(newSelected)
  }

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allRecordIds = filteredRecords.map(record => record._id)
      setSelectedRecords(new Set(allRecordIds))
    } else {
      setSelectedRecords(new Set())
    }
  }

  // 批量审核函数
  const handleBatchReview = async (action: "confirm" | "reject") => {
    if (selectedRecords.size === 0) {
      notifications.error("请选择记录", "请先选择要审核的记录")
      return
    }

    setBatchLoading(true)
    try {
      const recordIds = Array.from(selectedRecords)
      let productIds: string[] = []

      // 如果是确认操作，需要获取每个记录的最佳匹配产品ID
      if (action === "confirm") {
        productIds = recordIds
          .map(recordId => {
            const record = records.find(r => r._id === recordId)
            // 获取产品ID字符串，处理populated和unpopulated情况
            const productId = record?.candidates[0]?.productId
            if (typeof productId === "string") {
              return productId
            } else if (productId && productId._id) {
              return productId._id
            }
            return ""
          })
          .filter(id => id !== "")

        // 检查是否所有记录都有匹配的产品
        if (productIds.length !== recordIds.length) {
          notifications.error("确认失败", "部分记录没有可匹配的产品")
          return
        }
      }

      const requestBody = {
        recordIds,
        action,
        ...(action === "confirm" && { productIds }),
        note: `批量${action === "confirm" ? "确认" : "拒绝"}`,
      }

      const response = await fetch(
        buildApiUrl("/matching/records/batch-review"),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(requestBody),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      notifications.success(
        `批量${action === "confirm" ? "确认" : "拒绝"}完成`,
        `成功处理 ${data.data.success.length} 条记录，失败 ${data.data.failed.length} 条`
      )

      // 清空选择并刷新数据
      setSelectedRecords(new Set())
      await fetchReviews()
    } catch (error) {
      console.error("❌ 批量审核失败:", error)
      notifications.error("批量审核失败", "无法完成批量审核操作")
    } finally {
      setBatchLoading(false)
    }
  }

  // 过滤记录
  const filteredRecords = useMemo(() => {
    return records.filter(record => {
      if (filter === "all") return true
      if (filter === "high") return record.priority === "high"
      if (filter === "exception") return record.exceptions.length > 0
      if (filter === "low-confidence") {
        const bestScore = record.candidates[0]?.score.total || 0
        return bestScore < 70
      }
      return true
    })
  }, [records, filter])

  // 开始审核
  const startReview = (record: MatchingRecord) => {
    setSelectedRecord(record)
    setReviewNote("")
    onReviewOpen()
  }

  // 格式化分数颜色
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-success"
    if (score >= 70) return "text-warning"
    return "text-danger"
  }

  // 渲染匹配原因
  const renderReasons = (reasons: any[]) => {
    if (!reasons || reasons.length === 0) return "-"

    return (
      <div className="flex flex-wrap gap-1">
        {reasons.map((reason, index) => (
          <Chip key={index} size="sm" variant="flat">
            {reason.description}
          </Chip>
        ))}
      </div>
    )
  }

  useEffect(() => {
    if (taskId) {
      // 有taskId，直接加载该任务的审核记录
      fetchReviews()
    } else {
      // 没有taskId，加载待审核任务列表
      fetchTasks()
    }
  }, [taskId])

  // 如果没有taskId，显示任务选择页面
  if (!taskId) {
    return (
      <div className="space-y-6" suppressHydrationWarning>
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">选择审核任务</h1>
            <p className="text-default-500">请选择要审核的匹配任务</p>
          </div>
          <Button variant="flat" size="sm" as="a" href="/dashboard/matching">
            返回任务列表
          </Button>
        </div>

        {/* 搜索区域 */}
        <Card className="mb-4">
          <CardBody className="p-4">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">搜索过滤</h3>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Input
                  placeholder="搜索任务ID、文件名或任务标识..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  startContent={<Search className="h-4 w-4" />}
                  isClearable
                  onClear={() => setSearchTerm("")}
                />
                <Input
                  type="date"
                  label="开始日期"
                  value={dateRange.start}
                  onChange={e =>
                    setDateRange(prev => ({ ...prev, start: e.target.value }))
                  }
                />
                <Input
                  type="date"
                  label="结束日期"
                  value={dateRange.end}
                  onChange={e =>
                    setDateRange(prev => ({ ...prev, end: e.target.value }))
                  }
                />
              </div>
              {(searchTerm || dateRange.start || dateRange.end) && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={() => {
                      setSearchTerm("")
                      setDateRange({ start: "", end: "" })
                    }}
                  >
                    清除筛选
                  </Button>
                  <p className="text-sm text-default-500">
                    找到 {filteredTasks.length} 个匹配的任务
                  </p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* 待审核任务列表 */}
        <Card>
          <CardHeader>
            <div>
              <h2 className="text-lg font-semibold">待审核任务</h2>
              <p className="text-sm text-default-500">
                {tasksLoading
                  ? "加载中..."
                  : `共 ${filteredTasks.length} 个任务待审核`}
              </p>
            </div>
          </CardHeader>
          <CardBody>
            {tasksLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <span className="ml-2">加载任务列表...</span>
              </div>
            ) : filteredTasks.length === 0 ? (
              <EmptyState
                icon={<Package className="h-12 w-12" />}
                title={
                  tasks.length === 0 ? "暂无待审核任务" : "未找到匹配的任务"
                }
                description={
                  tasks.length === 0
                    ? "当前没有需要审核的匹配任务"
                    : "请尝试修改搜索条件"
                }
                action={{
                  label: tasks.length === 0 ? "返回任务管理" : "清除筛选",
                  onClick: () => {
                    if (tasks.length === 0) {
                      window.location.href = "/dashboard/matching"
                    } else {
                      setSearchTerm("")
                      setDateRange({ start: "", end: "" })
                    }
                  },
                }}
              />
            ) : (
              <div className="space-y-4">
                {filteredTasks.map(task => (
                  <Card
                    key={task._id}
                    className="border transition-shadow hover:shadow-md"
                  >
                    <CardBody className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-3">
                            <h3 className="text-lg font-semibold">
                              {task.originalFilename}
                            </h3>
                            <Chip
                              size="sm"
                              variant="flat"
                              color="primary"
                              className="font-mono"
                            >
                              {generateTaskIdentifier(task)}
                            </Chip>
                            <Chip size="sm" variant="flat" color="warning">
                              待审核
                            </Chip>
                          </div>

                          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                            <div>
                              <span className="text-default-500">
                                待审核项目：
                              </span>
                              <span className="font-medium text-warning">
                                {task.progress.pendingItems}
                              </span>
                            </div>
                            <div>
                              <span className="text-default-500">
                                异常项目：
                              </span>
                              <span className="font-medium text-danger">
                                {task.progress.exceptionItems}
                              </span>
                            </div>
                            <div>
                              <span className="text-default-500">匹配率：</span>
                              <span className="font-medium text-success">
                                {task.statistics.matchRate.toFixed(1)}%
                              </span>
                            </div>
                            <div>
                              <span className="text-default-500">
                                创建时间：
                              </span>
                              <span className="font-medium">
                                {formatDetailedTime(task.createdAt)}
                              </span>
                            </div>
                          </div>

                          {task.metadata.description && (
                            <p className="mt-2 text-sm text-default-600">
                              {task.metadata.description}
                            </p>
                          )}
                        </div>

                        <div className="ml-4">
                          <Button
                            color="warning"
                            variant="flat"
                            onClick={() => selectTaskForReview(task)}
                            startContent={<Target className="h-4 w-4" />}
                          >
                            开始审核
                          </Button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    )
  }

  // 有taskId，显示具体任务的审核界面
  return (
    <div className="space-y-6" suppressHydrationWarning>
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">匹配审核</h1>
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
            正在审核任务：
            <span className="font-medium text-foreground">
              {decodeURIComponent(taskName)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="flat"
            size="sm"
            as="a"
            href="/dashboard/matching/review"
          >
            选择其他任务
          </Button>
          <Button variant="flat" size="sm" as="a" href="/dashboard/matching">
            返回任务列表
          </Button>
        </div>
      </div>

      {/* 统计信息 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Clock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-default-500">待审核</p>
                <p className="text-xl font-bold">{pagination.total}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-danger/10 p-2">
                <AlertTriangle className="h-5 w-5 text-danger" />
              </div>
              <div>
                <p className="text-sm text-default-500">高优先级</p>
                <p className="text-xl font-bold">
                  {records.filter(r => r.priority === "high").length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-warning/10 p-2">
                <XCircle className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-default-500">异常记录</p>
                <p className="text-xl font-bold">
                  {records.filter(r => r.exceptions.length > 0).length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success/10 p-2">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-default-500">平均分数</p>
                <p className="text-xl font-bold">
                  {records.length > 0
                    ? Math.round(
                        records.reduce(
                          (sum, r) => sum + (r.candidates[0]?.score.total || 0),
                          0
                        ) / records.length
                      )
                    : 0}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 审核列表 */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            {/* 标题和统计 */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-lg font-semibold">待审核记录</h2>
                <p className="text-sm text-default-500">
                  已显示 {filteredRecords.length} / {pagination.total} 条记录
                  {selectedRecords.size > 0 &&
                    ` (已选择 ${selectedRecords.size} 条)`}
                </p>
              </div>

              {/* 筛选器 */}
              <div className="flex items-center gap-4">
                <Select
                  placeholder="筛选条件"
                  selectedKeys={[filter]}
                  onSelectionChange={keys =>
                    setFilter(Array.from(keys)[0] as string)
                  }
                  className="w-48"
                  size="sm"
                >
                  <SelectItem key="all">全部记录</SelectItem>
                  <SelectItem key="high">高优先级</SelectItem>
                  <SelectItem key="exception">有异常</SelectItem>
                  <SelectItem key="low-confidence">低置信度</SelectItem>
                </Select>
              </div>
            </div>

            {/* 批量操作工具栏 */}
            {selectedRecords.size > 0 && (
              <div className="flex items-center justify-between rounded-lg border border-primary/20 bg-primary/5 p-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-primary">
                    已选择 {selectedRecords.size} 条记录
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    color="success"
                    variant="flat"
                    isLoading={batchLoading}
                    onClick={() => handleBatchReview("confirm")}
                  >
                    批量确认
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    isLoading={batchLoading}
                    onClick={() => handleBatchReview("reject")}
                  >
                    批量拒绝
                  </Button>
                  <Button
                    size="sm"
                    variant="light"
                    onClick={() => setSelectedRecords(new Set())}
                  >
                    取消选择
                  </Button>
                </div>
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
          ) : filteredRecords.length === 0 ? (
            <EmptyState
              icon={<CheckCircle className="h-12 w-12" />}
              title="暂无待审核记录"
              description="所有匹配记录都已处理完成"
            />
          ) : (
            <>
              <Table aria-label="审核记录表格">
                <TableHeader>
                  <TableColumn width={50}>
                    <Checkbox
                      isSelected={
                        filteredRecords.length > 0 &&
                        selectedRecords.size === filteredRecords.length
                      }
                      isIndeterminate={
                        selectedRecords.size > 0 &&
                        selectedRecords.size < filteredRecords.length
                      }
                      onValueChange={handleSelectAll}
                    />
                  </TableColumn>
                  <TableColumn>原始名称</TableColumn>
                  <TableColumn>最佳匹配</TableColumn>
                  <TableColumn>匹配分数</TableColumn>
                  <TableColumn>置信度</TableColumn>
                  <TableColumn>优先级</TableColumn>
                  <TableColumn>异常</TableColumn>
                  <TableColumn>操作</TableColumn>
                </TableHeader>
                <TableBody>
                  {filteredRecords.map(record => {
                    const bestCandidate = record.candidates[0]
                    return (
                      <TableRow key={record._id}>
                        <TableCell>
                          <Checkbox
                            isSelected={selectedRecords.has(record._id)}
                            onValueChange={checked =>
                              handleSelectRecord(record._id, checked)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {record.originalData.name}
                            </p>
                            <div className="space-y-1 text-xs text-default-500">
                              <p>价格: ¥{record.originalData.price}</p>
                              <p>来源: 第{record.metadata.source.row}行</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {bestCandidate && bestCandidate.productId ? (
                            <div className="space-y-1">
                              <p className="text-sm font-medium">
                                {bestCandidate.productId.name || "未知商品"}
                              </p>
                              <div className="flex flex-wrap gap-1 text-xs text-default-500">
                                <span className="inline-flex items-center gap-1">
                                  <span className="font-medium">
                                    {bestCandidate.productId.brand ||
                                      "未知品牌"}
                                  </span>
                                  <span>|</span>
                                  <span>
                                    {bestCandidate.productId.company ||
                                      "未知企业"}
                                  </span>
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1 text-xs">
                                {bestCandidate.productId.productType && (
                                  <Chip
                                    size="sm"
                                    variant="flat"
                                    color="primary"
                                  >
                                    {bestCandidate.productId.productType}
                                  </Chip>
                                )}
                                {bestCandidate.productId.pricing
                                  ?.priceCategory && (
                                  <Chip
                                    size="sm"
                                    variant="flat"
                                    color="secondary"
                                  >
                                    {
                                      bestCandidate.productId.pricing
                                        .priceCategory
                                    }
                                  </Chip>
                                )}
                                {bestCandidate.productId.features?.hasPop && (
                                  <Chip
                                    size="sm"
                                    variant="flat"
                                    color="success"
                                  >
                                    爆珠
                                  </Chip>
                                )}
                              </div>
                              <div className="text-xs font-medium text-primary">
                                公司价: ¥
                                {bestCandidate.productId.pricing
                                  ?.companyPrice ||
                                  bestCandidate.productId.pricing
                                    ?.retailPrice ||
                                  0}
                                {bestCandidate.productId.pricing?.unit &&
                                  ` / ${bestCandidate.productId.pricing.unit}`}
                              </div>
                            </div>
                          ) : (
                            <span className="text-default-400">无匹配</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {bestCandidate ? (
                            <div className="space-y-1">
                              <div
                                className={`font-bold ${getScoreColor(bestCandidate.score.total)}`}
                              >
                                {bestCandidate.score.total}%
                              </div>
                              <Progress
                                value={bestCandidate.score.total}
                                size="sm"
                                color={
                                  bestCandidate.score.total >= 90
                                    ? "success"
                                    : bestCandidate.score.total >= 70
                                      ? "warning"
                                      : "danger"
                                }
                              />
                            </div>
                          ) : (
                            <span className="text-default-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {bestCandidate ? (
                            <ConfidenceChip
                              confidence={bestCandidate.confidence}
                            />
                          ) : (
                            <span className="text-default-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <PriorityChip priority={record.priority} />
                        </TableCell>
                        <TableCell>
                          {record.exceptions.length > 0 ? (
                            <Badge
                              content={record.exceptions.length}
                              color="danger"
                            >
                              <AlertTriangle className="h-4 w-4 text-danger" />
                            </Badge>
                          ) : (
                            <span className="text-default-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            color="primary"
                            variant="flat"
                            onPress={() => startReview(record)}
                          >
                            审核
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>

              {/* 加载更多按钮 */}
              {!loading &&
                filteredRecords.length > 0 &&
                pagination.current < pagination.pages && (
                  <div className="flex justify-center pt-6">
                    <Button
                      variant="flat"
                      color="primary"
                      onPress={loadMoreReviews}
                      isLoading={loadingMore}
                      isDisabled={loadingMore}
                    >
                      {loadingMore
                        ? "加载中..."
                        : `加载更多 (还有 ${pagination.total - filteredRecords.length} 条)`}
                    </Button>
                  </div>
                )}
            </>
          )}
        </CardBody>
      </Card>

      {/* 审核模态框 */}
      {selectedRecord && (
        <Modal
          isOpen={isReviewOpen}
          onClose={onReviewClose}
          size="5xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader>
              <div>
                <h3>匹配审核</h3>
                <p className="text-sm text-default-500">
                  审核原始名称: {selectedRecord.originalData.name}
                </p>
              </div>
            </ModalHeader>
            <ModalBody>
              <div className="space-y-6">
                {/* 原始信息 */}
                <Card>
                  <CardHeader>
                    <h4 className="flex items-center gap-2 font-semibold">
                      <Package className="h-4 w-4" />
                      原始商品信息
                    </h4>
                  </CardHeader>
                  <CardBody>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm text-default-500">商品名称</p>
                        <p className="font-medium">
                          {selectedRecord.originalData.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">批发价格</p>
                        <p className="font-medium">
                          ¥{selectedRecord.originalData.price}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">数量</p>
                        <p className="font-medium">
                          {selectedRecord.originalData.quantity}{" "}
                          {selectedRecord.originalData.unit}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* 匹配候选项 */}
                <Card>
                  <CardHeader>
                    <h4 className="flex items-center gap-2 font-semibold">
                      <TrendingUp className="h-4 w-4" />
                      匹配候选项 ({selectedRecord.candidates.length})
                    </h4>
                  </CardHeader>
                  <CardBody>
                    <Accordion>
                      {selectedRecord.candidates
                        .slice(0, 5)
                        .map((candidate, index) => (
                          <AccordionItem
                            key={index}
                            aria-label={`候选项 ${index + 1}`}
                            title={
                              <div className="flex w-full items-center justify-between pr-4">
                                <div className="flex items-center gap-3">
                                  <Badge
                                    content={index + 1}
                                    color="primary"
                                    size="sm"
                                  >
                                    <div></div>
                                  </Badge>
                                  <div className="flex-1">
                                    <p className="font-medium">
                                      {candidate.productId?.name || "未知商品"}
                                    </p>
                                    <div className="flex flex-wrap gap-2 text-sm text-default-500">
                                      <span>
                                        {candidate.productId?.brand ||
                                          "未知品牌"}
                                      </span>
                                      <span>|</span>
                                      <span>
                                        {candidate.productId?.company ||
                                          "未知企业"}
                                      </span>
                                      <span>|</span>
                                      <span>
                                        {candidate.productId?.productType ||
                                          "未知类型"}
                                      </span>
                                      <span>|</span>
                                      <span>
                                        ¥
                                        {candidate.productId?.pricing
                                          ?.companyPrice ||
                                          candidate.productId?.pricing
                                            ?.retailPrice ||
                                          0}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap gap-1">
                                      {candidate.productId?.pricing
                                        ?.priceCategory && (
                                        <Chip
                                          size="sm"
                                          variant="flat"
                                          color="primary"
                                        >
                                          {
                                            candidate.productId.pricing
                                              .priceCategory
                                          }
                                        </Chip>
                                      )}
                                      {candidate.productId?.packageType && (
                                        <Chip
                                          size="sm"
                                          variant="flat"
                                          color="secondary"
                                        >
                                          {candidate.productId.packageType}
                                        </Chip>
                                      )}
                                      {candidate.productId?.features
                                        ?.hasPop && (
                                        <Chip
                                          size="sm"
                                          variant="flat"
                                          color="success"
                                        >
                                          爆珠
                                        </Chip>
                                      )}
                                      {candidate.productId?.appearance
                                        ?.color && (
                                        <Chip
                                          size="sm"
                                          variant="flat"
                                          color="default"
                                        >
                                          {candidate.productId.appearance.color}
                                        </Chip>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <ConfidenceChip
                                    confidence={candidate.confidence}
                                  />
                                  <div
                                    className={`font-bold ${getScoreColor(candidate.score.total)}`}
                                  >
                                    {candidate.score.total}%
                                  </div>
                                </div>
                              </div>
                            }
                          >
                            <div className="space-y-4">
                              {/* 详细分数 */}
                              <div>
                                <h5 className="mb-2 font-medium">详细评分</h5>
                                <div className="grid gap-2 md:grid-cols-2">
                                  <div className="flex justify-between">
                                    <span>名称匹配</span>
                                    <span
                                      className={getScoreColor(
                                        candidate.score.name
                                      )}
                                    >
                                      {candidate.score.name}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>品牌匹配</span>
                                    <span
                                      className={getScoreColor(
                                        candidate.score.brand
                                      )}
                                    >
                                      {candidate.score.brand}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>关键词匹配</span>
                                    <span
                                      className={getScoreColor(
                                        candidate.score.keywords
                                      )}
                                    >
                                      {candidate.score.keywords}%
                                    </span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>包装匹配</span>
                                    <span
                                      className={getScoreColor(
                                        candidate.score.package
                                      )}
                                    >
                                      {candidate.score.package}%
                                    </span>
                                  </div>

                                  <div className="flex justify-between font-bold">
                                    <span>综合得分</span>
                                    <span
                                      className={getScoreColor(
                                        candidate.score.total
                                      )}
                                    >
                                      {candidate.score.total}%
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* 匹配原因 */}
                              <div>
                                <h5 className="mb-2 font-medium">匹配原因</h5>
                                {renderReasons(candidate.reasons)}
                              </div>

                              {/* 商品详情 */}
                              <div>
                                <h5 className="mb-3 font-medium">商品详情</h5>
                                <div className="space-y-3">
                                  {/* 基本信息 */}
                                  <div>
                                    <h6 className="mb-2 text-sm font-medium text-default-600">
                                      基本信息
                                    </h6>
                                    <div className="grid gap-2 text-sm md:grid-cols-2">
                                      <div>
                                        <span className="text-default-500">
                                          产品编码:{" "}
                                        </span>
                                        <span>
                                          {candidate.productId?.productCode ||
                                            "无"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-default-500">
                                          盒码:{" "}
                                        </span>
                                        <span>
                                          {candidate.productId?.boxCode || "无"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-default-500">
                                          包装类型:{" "}
                                        </span>
                                        <span>
                                          {candidate.productId?.packageType ||
                                            "无"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-default-500">
                                          颜色:{" "}
                                        </span>
                                        <span>
                                          {candidate.productId?.appearance
                                            ?.color || "无"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* 物理规格 */}
                                  {candidate.productId?.specifications && (
                                    <div>
                                      <h6 className="mb-2 text-sm font-medium text-default-600">
                                        物理规格
                                      </h6>
                                      <div className="grid gap-2 text-sm md:grid-cols-3">
                                        {candidate.productId?.specifications
                                          ?.circumference && (
                                          <div>
                                            <span className="text-default-500">
                                              周长:{" "}
                                            </span>
                                            <span>
                                              {
                                                candidate.productId
                                                  ?.specifications
                                                  ?.circumference
                                              }
                                              mm
                                            </span>
                                          </div>
                                        )}
                                        {candidate.productId?.specifications
                                          ?.length && (
                                          <div>
                                            <span className="text-default-500">
                                              长度:{" "}
                                            </span>
                                            <span>
                                              {
                                                candidate.productId
                                                  ?.specifications?.length
                                              }
                                            </span>
                                          </div>
                                        )}
                                        {candidate.productId?.specifications
                                          ?.packageQuantity && (
                                          <div>
                                            <span className="text-default-500">
                                              包装数量:{" "}
                                            </span>
                                            <span>
                                              {
                                                candidate.productId
                                                  ?.specifications
                                                  ?.packageQuantity
                                              }
                                              支
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* 化学成分 */}
                                  {candidate.productId?.chemicalContent && (
                                    <div>
                                      <h6 className="mb-2 text-sm font-medium text-default-600">
                                        化学成分
                                      </h6>
                                      <div className="grid gap-2 text-sm md:grid-cols-3">
                                        {candidate.productId?.chemicalContent
                                          ?.tarContent !== undefined && (
                                          <div>
                                            <span className="text-default-500">
                                              焦油:{" "}
                                            </span>
                                            <span>
                                              {
                                                candidate.productId
                                                  ?.chemicalContent?.tarContent
                                              }
                                              mg
                                            </span>
                                          </div>
                                        )}
                                        {candidate.productId?.chemicalContent
                                          ?.nicotineContent !== undefined && (
                                          <div>
                                            <span className="text-default-500">
                                              烟碱:{" "}
                                            </span>
                                            <span>
                                              {
                                                candidate.productId
                                                  ?.chemicalContent
                                                  ?.nicotineContent
                                              }
                                              mg
                                            </span>
                                          </div>
                                        )}
                                        {candidate.productId?.chemicalContent
                                          ?.carbonMonoxideContent !==
                                          undefined && (
                                          <div>
                                            <span className="text-default-500">
                                              一氧化碳:{" "}
                                            </span>
                                            <span>
                                              {
                                                candidate.productId
                                                  ?.chemicalContent
                                                  ?.carbonMonoxideContent
                                              }
                                              mg
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}

                                  {/* 价格信息 */}
                                  <div>
                                    <h6 className="mb-2 text-sm font-medium text-default-600">
                                      价格信息
                                    </h6>
                                    <div className="grid gap-2 text-sm md:grid-cols-2">
                                      <div>
                                        <span className="text-default-500">
                                          价格类型:{" "}
                                        </span>
                                        <span>
                                          {candidate.productId?.pricing
                                            ?.priceCategory || "无"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-default-500">
                                          公司价:{" "}
                                        </span>
                                        <span className="font-medium text-primary">
                                          ¥
                                          {candidate.productId?.pricing
                                            ?.companyPrice || 0}{" "}
                                          /{" "}
                                          {candidate.productId?.pricing?.unit ||
                                            "条"}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="text-default-500">
                                          零售价:{" "}
                                        </span>
                                        <span className="text-sm text-default-400">
                                          ¥
                                          {candidate.productId?.pricing
                                            ?.retailPrice || 0}{" "}
                                          /{" "}
                                          {candidate.productId?.pricing?.unit ||
                                            "条"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* 操作按钮 */}
                              <div className="flex gap-2 pt-2">
                                <Button
                                  size="sm"
                                  color="success"
                                  variant="flat"
                                  startContent={
                                    <ThumbsUp className="h-4 w-4" />
                                  }
                                  onPress={() =>
                                    reviewRecord(
                                      selectedRecord._id,
                                      "confirm",
                                      candidate.productId?._id
                                    )
                                  }
                                  isLoading={reviewLoading}
                                >
                                  确认此匹配
                                </Button>
                                <Button
                                  size="sm"
                                  color="danger"
                                  variant="flat"
                                  startContent={
                                    <ThumbsDown className="h-4 w-4" />
                                  }
                                  onPress={() =>
                                    reviewRecord(selectedRecord._id, "reject")
                                  }
                                  isLoading={reviewLoading}
                                >
                                  拒绝所有匹配
                                </Button>
                              </div>
                            </div>
                          </AccordionItem>
                        ))}
                    </Accordion>
                  </CardBody>
                </Card>

                {/* 异常信息 */}
                {selectedRecord.exceptions.length > 0 && (
                  <Card>
                    <CardHeader>
                      <h4 className="flex items-center gap-2 font-semibold text-warning">
                        <AlertTriangle className="h-4 w-4" />
                        异常信息
                      </h4>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-2">
                        {selectedRecord.exceptions.map((exception, index) => (
                          <div
                            key={index}
                            className="rounded-lg bg-warning/10 p-3"
                          >
                            <div className="flex items-center gap-2">
                              <Chip size="sm" color="warning" variant="flat">
                                {exception.type}
                              </Chip>
                              <span className="text-sm">
                                {exception.message}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardBody>
                  </Card>
                )}

                {/* 审核备注 */}
                <Card>
                  <CardHeader>
                    <h4 className="font-semibold">审核备注</h4>
                  </CardHeader>
                  <CardBody>
                    <Textarea
                      placeholder="添加审核备注（可选）"
                      value={reviewNote}
                      onValueChange={setReviewNote}
                      rows={3}
                    />
                  </CardBody>
                </Card>
              </div>
            </ModalBody>
            <ModalFooter>
              <div className="flex w-full items-center justify-between">
                <div className="flex gap-2">
                  <Button variant="light" onPress={onReviewClose}>
                    取消
                  </Button>
                  {selectedAlternativeProduct && (
                    <Button
                      color="warning"
                      variant="flat"
                      onPress={() => setSelectedAlternativeProduct(null)}
                    >
                      取消选择
                    </Button>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    color="primary"
                    variant="flat"
                    startContent={<Search className="h-4 w-4" />}
                    onPress={() => {
                      setProductSearchTerm("")
                      setAvailableProducts([])
                      onProductSearchOpen()
                    }}
                  >
                    手动选择商品
                  </Button>
                  <Button
                    color="danger"
                    variant="flat"
                    startContent={<XCircle className="h-4 w-4" />}
                    onPress={() => reviewRecord(selectedRecord._id, "reject")}
                    isLoading={reviewLoading}
                  >
                    拒绝匹配
                  </Button>
                  {(selectedAlternativeProduct ||
                    selectedRecord.candidates.length > 0) && (
                    <Button
                      color="success"
                      startContent={<CheckCircle className="h-4 w-4" />}
                      onPress={
                        selectedAlternativeProduct
                          ? confirmAlternativeProduct
                          : () =>
                              reviewRecord(
                                selectedRecord._id,
                                "confirm",
                                selectedRecord.candidates[0]?.productId?._id
                              )
                      }
                      isLoading={reviewLoading}
                    >
                      {selectedAlternativeProduct
                        ? `确认选择: ${selectedAlternativeProduct.name}`
                        : "确认最佳匹配"}
                    </Button>
                  )}
                </div>
              </div>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* 商品搜索模态框 */}
      <Modal
        isOpen={isProductSearchOpen}
        onClose={onProductSearchClose}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>
            <div>
              <h3>
                {selectedRecords.size > 0
                  ? `批量手动匹配 (${selectedRecords.size} 条记录)`
                  : "选择正确的商品"}
              </h3>
              <p className="text-sm text-default-500">
                {selectedRecords.size > 0
                  ? "选择一个商品将应用于所有选中的记录"
                  : `当前匹配: ${selectedRecord?.originalData.name}`}
              </p>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {/* 搜索框 */}
              <Input
                placeholder="搜索商品名称、品牌、企业、盒码或关键词..."
                value={productSearchTerm}
                onChange={e => {
                  setProductSearchTerm(e.target.value)
                  searchProducts(e.target.value)
                }}
                startContent={<Search className="h-4 w-4" />}
                isClearable
                onClear={() => {
                  setProductSearchTerm("")
                  setAvailableProducts([])
                }}
              />

              {/* 搜索结果 */}
              {productSearchLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-b-2 border-primary"></div>
                    <p>搜索中...</p>
                  </div>
                </div>
              ) : availableProducts.length > 0 ? (
                <div className="space-y-3">
                  <h4 className="font-medium">
                    搜索结果 ({availableProducts.length})
                  </h4>
                  <div className="max-h-96 space-y-2 overflow-y-auto">
                    {availableProducts.map(product => (
                      <Card
                        key={product._id}
                        isPressable
                        isHoverable
                        onPress={() => selectAlternativeProduct(product)}
                        className="p-3"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{product.name}</p>
                              <div className="flex flex-wrap gap-2 text-sm text-default-500">
                                <span>{product.brand}</span>
                                <span>|</span>
                                <span>{product.company}</span>
                                <span>|</span>
                                <span>{product.productType}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-success">
                                ¥
                                {product.pricing?.retailPrice ||
                                  product.pricing?.companyPrice ||
                                  0}
                              </p>
                              <p className="text-xs text-default-500">
                                {product.pricing?.unit || "元/条"}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1">
                            <Chip size="sm" variant="flat" color="primary">
                              {product.pricing?.priceCategory}
                            </Chip>
                            <Chip size="sm" variant="flat" color="secondary">
                              {product.packageType}
                            </Chip>
                            {product.features?.hasPop && (
                              <Chip size="sm" variant="flat" color="success">
                                爆珠
                              </Chip>
                            )}
                            {product.appearance?.color && (
                              <Chip size="sm" variant="flat" color="default">
                                {product.appearance.color}
                              </Chip>
                            )}
                          </div>

                          {/* 详细信息 */}
                          <div className="grid gap-2 text-xs text-default-500 md:grid-cols-2">
                            {product.productCode && (
                              <div>
                                <span>产品编码: </span>
                                <span>{product.productCode}</span>
                              </div>
                            )}
                            {product.boxCode && (
                              <div>
                                <span>盒码: </span>
                                <span>{product.boxCode}</span>
                              </div>
                            )}
                            {product.specifications?.circumference && (
                              <div>
                                <span>周长: </span>
                                <span>
                                  {product.specifications.circumference}mm
                                </span>
                              </div>
                            )}
                            {product.specifications?.length && (
                              <div>
                                <span>长度: </span>
                                <span>{product.specifications.length}</span>
                              </div>
                            )}
                            {product.chemicalContent?.tarContent !==
                              undefined && (
                              <div>
                                <span>焦油: </span>
                                <span>
                                  {product.chemicalContent.tarContent}mg
                                </span>
                              </div>
                            )}
                            {product.chemicalContent?.nicotineContent !==
                              undefined && (
                              <div>
                                <span>烟碱: </span>
                                <span>
                                  {product.chemicalContent.nicotineContent}mg
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : productSearchTerm.length > 0 ? (
                <div className="py-8 text-center">
                  <p className="text-default-500">未找到匹配的商品</p>
                  <p className="text-sm text-default-400">请尝试其他关键词</p>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <Search className="mx-auto h-12 w-12 text-default-300" />
                  <p className="mt-2 text-default-500">输入关键词搜索商品</p>
                  <p className="text-sm text-default-400">
                    支持商品名称、品牌、企业、盒码等
                  </p>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onProductSearchClose}>
              取消
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}

export default function MatchingReviewPage() {
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
      <MatchingReviewPageContent />
    </Suspense>
  )
}
