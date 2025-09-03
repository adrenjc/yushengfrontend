"use client"

import { useState, useEffect, useMemo, Suspense, useRef } from "react"
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
  Tooltip,
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
  const [sortBy, setSortBy] = useState("score") // 默认按分数排序
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

  // 仅保留模板搜索输入框

  // 通知系统
  const notifications = useNotifications()

  // 模板商品搜索（独立栏）
  const [templateSearch, setTemplateSearch] = useState({
    keyword: "",
    brand: "",
    company: "",
  })
  const [templateProducts, setTemplateProducts] = useState<any[]>([])
  const templateSearchInputRef = useRef<HTMLInputElement>(null)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [templateSearchLoading, setTemplateSearchLoading] = useState(false)

  // 通过任务拿到 templateId
  useEffect(() => {
    if (!taskId) return
    const run = async () => {
      try {
        const res = await fetch(buildApiUrl(`/matching/tasks/${taskId}`), {
          headers: getAuthHeaders(),
        })
        if (res.ok) {
          const data = await res.json()
          setTemplateId(data.data?.task?.templateId || null)
        }
      } catch (e) {
        // ignore
      }
    }
    run()
  }, [taskId])

  // 搜索模板商品
  const searchTemplateProducts = async () => {
    if (!templateId) return
    try {
      setTemplateSearchLoading(true)
      const params = new URLSearchParams()
      params.set("templateId", templateId)
      // 解析关键词，支持 brand:xx company:xx code:xx 等前缀
      const kw = templateSearch.keyword?.trim() || ""
      const parts = kw.split(/\s+/)
      let free: string[] = []
      parts.forEach(p => {
        const [k, ...rest] = p.split(":")
        const v = rest.join(":")
        if (v) {
          if (k === "brand") params.set("brand", v)
          else if (k === "company") params.set("company", v)
          else if (k === "code") params.set("productCode", v)
          else free.push(p)
        } else if (k) {
          free.push(k)
        }
      })
      if (free.length > 0) params.set("search", free.join(" "))
      const url = buildApiUrl(`/products?${params.toString()}`)
      const res = await fetch(url, { headers: getAuthHeaders() })
      if (!res.ok) throw new Error(String(res.status))
      const data = await res.json()
      setTemplateProducts(data.data?.products || [])
    } catch (err) {
      console.error("模板商品搜索失败", err)
    } finally {
      // 保留loading状态稍长，避免频繁抖动
      setTimeout(() => setTemplateSearchLoading(false), 300)
    }
  }

  // 关键词防抖自动搜索
  useEffect(() => {
    if (!isReviewOpen) return
    const kw = templateSearch.keyword?.trim() || ""
    const handler = setTimeout(() => {
      if (kw.length > 0) {
        searchTemplateProducts()
      } else {
        setTemplateProducts([])
      }
    }, 800) // 稍长的防抖时间
    return () => clearTimeout(handler)
  }, [templateSearch.keyword, templateId, isReviewOpen])

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
      url.searchParams.set("sortBy", sortBy)

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
      if (filter === "exception")
        return record.status === "exception" || record.exceptions.length > 0
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
  }, [taskId, sortBy])

  // 弹窗打开后聚焦模板搜索框
  useEffect(() => {
    if (isReviewOpen) {
      setTimeout(() => templateSearchInputRef.current?.focus(), 100)
    } else {
      // 关闭弹窗时清空搜索信息
      setTemplateSearch({ keyword: "", brand: "", company: "" })
      setTemplateProducts([])
    }
  }, [isReviewOpen])

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
                  {
                    records.filter(
                      r => r.status === "exception" || r.exceptions.length > 0
                    ).length
                  }
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

              {/* 筛选器和排序 */}
              <div className="grid grid-cols-2 items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-sm text-default-600">
                    筛选条件
                  </span>
                  <Select
                    aria-label="筛选条件"
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

                <div className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-sm text-default-600">
                    排序方式
                  </span>
                  <Select
                    aria-label="排序方式（可选择排序）"
                    selectedKeys={[sortBy]}
                    onSelectionChange={keys =>
                      setSortBy(Array.from(keys)[0] as string)
                    }
                    className="w-48"
                    size="sm"
                  >
                    <SelectItem key="score">按匹配分数</SelectItem>
                    <SelectItem key="priority">按优先级</SelectItem>
                    <SelectItem key="confidence">按置信度</SelectItem>
                    <SelectItem key="name">按原始名称</SelectItem>
                  </Select>
                </div>
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
                            <p className="text-base font-medium">
                              {record.originalData.name}
                            </p>
                            <div className="mt-2 space-y-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-default-500">
                                  原始价格:
                                </span>
                                <span className="rounded bg-danger/10 px-2 py-1 text-sm font-bold text-danger">
                                  ¥{record.originalData.price}
                                </span>
                              </div>
                              <p className="text-xs text-default-500">
                                来源: 第{record.metadata.source.row}行
                              </p>
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
                              <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-default-500">
                                  公司价:
                                </span>
                                <span className="rounded bg-success/10 px-2 py-1 text-sm font-bold text-success">
                                  ¥
                                  {bestCandidate.productId.pricing
                                    ?.companyPrice ||
                                    bestCandidate.productId.pricing
                                      ?.retailPrice ||
                                    0}
                                  {bestCandidate.productId.pricing?.unit &&
                                    ` / ${bestCandidate.productId.pricing.unit}`}
                                </span>
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
                          {record.status === "exception" ||
                          record.exceptions.length > 0 ? (
                            <Tooltip
                              content={
                                <div className="max-w-xs">
                                  {record.exceptions.length > 0 ? (
                                    <div className="space-y-1">
                                      {record.exceptions.map(
                                        (exception, index) => (
                                          <div key={index} className="text-xs">
                                            {exception.message}
                                          </div>
                                        )
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-xs">
                                      匹配分数过低，需要人工审核
                                    </div>
                                  )}
                                </div>
                              }
                              placement="top"
                            >
                              <Chip
                                size="sm"
                                color="warning"
                                variant="flat"
                                className="cursor-help"
                              >
                                {record.exceptions.length > 0
                                  ? record.exceptions[0].type ===
                                    "low_confidence"
                                    ? "低分数"
                                    : "异常"
                                  : "低分数"}
                              </Chip>
                            </Tooltip>
                          ) : (
                            <span className="text-default-400">正常</span>
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
                        <p className="text-sm text-default-500">原始价格</p>
                        <div className="inline-block rounded-lg bg-danger/10 px-3 py-2 text-base font-bold text-danger">
                          ¥{selectedRecord.originalData.price}
                        </div>
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

                {/* 模板商品搜索（独立栏） */}
                <Card>
                  <CardHeader>
                    <h4 className="font-semibold">模板商品搜索</h4>
                  </CardHeader>
                  <CardBody>
                    <div className="flex items-center gap-3">
                      <Input
                        ref={templateSearchInputRef}
                        placeholder="关键词（名称/品牌/企业/编码）"
                        value={templateSearch.keyword}
                        onChange={e =>
                          setTemplateSearch(prev => ({
                            ...prev,
                            keyword: e.target.value,
                          }))
                        }
                        size="sm"
                        className="w-full md:max-w-[560px]"
                        endContent={
                          templateSearchLoading ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                          ) : null
                        }
                      />
                    </div>

                    {templateProducts.length > 0 && (
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {templateProducts.slice(0, 8).map((product: any) => (
                          <Card key={product._id} className="border">
                            <CardBody className="p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate font-medium">
                                    {product.name}
                                  </p>
                                  <div className="mt-1 space-y-1 text-xs text-default-500">
                                    <div>{product.brand}</div>
                                    <div>{product.company}</div>
                                    <div>{product.productType}</div>
                                    {product.productCode && (
                                      <>
                                        <div>产品码: {product.productCode}</div>
                                      </>
                                    )}
                                    {product.boxCode && (
                                      <>
                                        <div>盒码: {product.boxCode}</div>
                                      </>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="font-bold text-success">
                                    ¥
                                    {product.pricing?.companyPrice ||
                                      product.pricing?.retailPrice ||
                                      0}
                                  </div>
                                  <div className="text-xs text-default-400">
                                    {product.pricing?.unit || "条"}
                                  </div>
                                </div>
                              </div>
                              <div className="pt-3">
                                <Button
                                  size="sm"
                                  color="success"
                                  variant="flat"
                                  onPress={() =>
                                    reviewRecord(
                                      selectedRecord._id,
                                      "confirm",
                                      product._id
                                    )
                                  }
                                >
                                  匹配为此商品
                                </Button>
                              </div>
                            </CardBody>
                          </Card>
                        ))}
                      </div>
                    )}
                    {!templateSearchLoading &&
                      templateSearch.keyword &&
                      templateProducts.length === 0 && (
                        <div className="mt-6 text-center text-sm text-default-500">
                          未找到模板中的相关商品
                        </div>
                      )}
                  </CardBody>
                </Card>

                {/* 匹配候选项（网格多列） */}
                <Card>
                  <CardHeader>
                    <h4 className="flex items-center gap-2 font-semibold">
                      <TrendingUp className="h-4 w-4" />
                      匹配候选项 ({selectedRecord.candidates.length})
                    </h4>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {selectedRecord.candidates.map((candidate, index) => (
                        <Card
                          key={index}
                          className="border transition-colors hover:border-primary/40"
                        >
                          <CardBody className="p-4">
                            <div className="flex items-start gap-3">
                              <Badge
                                content={index + 1}
                                color="primary"
                                size="sm"
                              >
                                <div className="h-2 w-2"></div>
                              </Badge>
                              <div className="grid w-full grid-cols-1 gap-2 md:grid-cols-3">
                                <div className="min-w-0 md:col-span-2">
                                  <div className="flex items-center justify-between">
                                    <p className="truncate font-medium">
                                      {candidate.productId?.name || "未知商品"}
                                    </p>
                                    <div
                                      className={`font-bold ${getScoreColor(candidate.score.total)}`}
                                    >
                                      {candidate.score.total}%
                                    </div>
                                  </div>
                                  <div className="mt-1 space-y-1 text-xs text-default-500">
                                    <div>
                                      {candidate.productId?.brand || "未知品牌"}
                                    </div>
                                    <div>
                                      {candidate.productId?.company ||
                                        "未知企业"}
                                    </div>
                                    <div>
                                      {candidate.productId?.productType ||
                                        "未知类型"}
                                    </div>
                                    {candidate.productId?.productCode && (
                                      <>
                                        <div>
                                          产品码:
                                          {candidate.productId.productCode}
                                        </div>
                                      </>
                                    )}
                                    {candidate.productId?.boxCode && (
                                      <>
                                        <div>
                                          盒码:{candidate.productId.boxCode}
                                        </div>
                                      </>
                                    )}
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
                                    {candidate.productId?.features?.hasPop && (
                                      <Chip
                                        size="sm"
                                        variant="flat"
                                        color="success"
                                      >
                                        爆珠
                                      </Chip>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <ConfidenceChip
                                    confidence={candidate.confidence}
                                  />
                                  <div className="mt-1 text-sm font-bold text-success">
                                    ¥
                                    {candidate.productId?.pricing
                                      ?.companyPrice ||
                                      candidate.productId?.pricing
                                        ?.retailPrice ||
                                      0}
                                  </div>
                                  <div className="text-xs text-default-400">
                                    {candidate.productId?.pricing?.unit || "条"}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 pt-3">
                              <Button
                                size="sm"
                                color="success"
                                variant="flat"
                                onPress={() =>
                                  reviewRecord(
                                    selectedRecord._id,
                                    "confirm",
                                    candidate.productId?._id
                                  )
                                }
                              >
                                确认此匹配
                              </Button>
                              <Button
                                size="sm"
                                color="danger"
                                variant="flat"
                                onPress={() =>
                                  reviewRecord(selectedRecord._id, "reject")
                                }
                              >
                                拒绝
                              </Button>
                            </div>
                          </CardBody>
                        </Card>
                      ))}
                    </div>
                  </CardBody>
                </Card>
                {/* 结束：匹配候选项 */}

                {/* 异常信息 */}
                {(selectedRecord.status === "exception" ||
                  selectedRecord.exceptions.length > 0) && (
                  <Card>
                    <CardHeader>
                      <h4 className="flex items-center gap-2 font-semibold text-warning">
                        <AlertTriangle className="h-4 w-4" />
                        异常信息
                      </h4>
                    </CardHeader>
                    <CardBody>
                      <div className="space-y-2">
                        {selectedRecord.exceptions.length > 0 ? (
                          selectedRecord.exceptions.map((exception, index) => (
                            <div
                              key={index}
                              className="rounded-lg bg-warning/10 p-3"
                            >
                              <div className="flex items-center gap-2">
                                <Chip size="sm" color="warning" variant="flat">
                                  {exception.type === "low_confidence"
                                    ? "低分数"
                                    : "异常"}
                                </Chip>
                                <span className="text-sm">
                                  {exception.message}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="rounded-lg bg-warning/10 p-3">
                            <div className="flex items-center gap-2">
                              <Chip size="sm" color="warning" variant="flat">
                                异常记录
                              </Chip>
                              <span className="text-sm">
                                该记录被标记为异常状态，需要人工审核
                              </span>
                            </div>
                          </div>
                        )}
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
                <Button variant="light" onPress={onReviewClose}>
                  取消
                </Button>
                <div className="flex gap-2">
                  <Button
                    color="danger"
                    variant="flat"
                    startContent={<XCircle className="h-4 w-4" />}
                    onPress={() => reviewRecord(selectedRecord._id, "reject")}
                    isLoading={reviewLoading}
                  >
                    拒绝匹配
                  </Button>
                  {selectedRecord.candidates.length > 0 && (
                    <Button
                      color="success"
                      startContent={<CheckCircle className="h-4 w-4" />}
                      onPress={() =>
                        reviewRecord(
                          selectedRecord._id,
                          "confirm",
                          selectedRecord.candidates[0]?.productId?._id
                        )
                      }
                      isLoading={reviewLoading}
                    >
                      确认最佳匹配
                    </Button>
                  )}
                </div>
              </div>
            </ModalFooter>
          </ModalContent>
        </Modal>
      )}

      {/* 已移除手动搜索商品模块 */}
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
