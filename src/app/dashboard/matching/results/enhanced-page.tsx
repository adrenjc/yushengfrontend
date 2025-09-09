"use client"

import {
  useState,
  useEffect,
  Suspense,
  useMemo,
  useCallback,
  useRef,
} from "react"
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
  Input,
  Pagination,
  Checkbox,
  Progress,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Tooltip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Badge,
} from "@nextui-org/react"
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  Search,
  Filter,
  Edit,
  Check,
  X,
  RefreshCw,
  Zap,
  Brain,
  ChevronDown,
  FileSpreadsheet,
  Target,
  TrendingUp,
  HelpCircle,
  ChevronUp,
  Settings,
  Info,
  ArrowRight,
  Star,
  Clock,
  ShoppingCart,
  Copy,
  Download,
  RotateCcw,
  BookPlus,
  BookMinus,
  BookOpen,
} from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { useNotifications, useAppStore } from "@/stores/app"
import { buildApiUrl } from "@/lib/api"
import { getAuthHeaders } from "@/lib/auth"

// 接口定义
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
    isMemoryMatch?: boolean
  }
  status: "confirmed" | "rejected" | "exception" | "pending"
  metadata: {
    source: {
      row: number
      file: string
    }
    exceptionReason?: string
    exceptionDetails?: string
  }
  candidates?: Array<{
    productId: any
    confidence: string // "high" | "medium" | "low"
    score: {
      name: number
      brand: number
      keywords: number
      package: number
      price: number
      total: number
    }
    matchType: string
    reasons: Array<{
      type: string
      description: string
      weight: number
    }>
    rank: number
  }>
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

// 状态芯片组件
const StatusChip = ({ status }: { status: string }) => {
  const config = {
    confirmed: { color: "success" as const, label: "已确认", icon: "✅" },
    rejected: { color: "danger" as const, label: "已拒绝", icon: "❌" },
    exception: { color: "warning" as const, label: "异常", icon: "⚠️" },
    pending: { color: "secondary" as const, label: "待审核", icon: "🔍" },
  }

  const { color, label, icon } =
    config[status as keyof typeof config] || config.exception

  return (
    <Chip variant="flat" color={color} size="sm">
      {icon} {label}
    </Chip>
  )
}

// 匹配类型芯片组件
const MatchTypeChip = ({
  matchType,
  isMemoryMatch,
}: {
  matchType: string
  isMemoryMatch?: boolean
}) => {
  const config = {
    auto: { color: "primary" as const, label: "自动匹配", icon: "🤖" },
    manual: { color: "secondary" as const, label: "人工确认", icon: "👤" },
    expert: { color: "warning" as const, label: "专家审核", icon: "🎯" },
    memory: { color: "success" as const, label: "记忆匹配", icon: "🧠" },
  }

  const { color, label, icon } =
    config[matchType as keyof typeof config] || config.auto

  return (
    <div className="flex gap-1">
      <Chip variant="flat" color={color} size="sm">
        {icon} {label}
      </Chip>
      {isMemoryMatch && (
        <Tooltip content="基于历史记忆匹配">
          <Chip variant="flat" color="success" size="sm">
            <Brain className="h-3 w-3" />
          </Chip>
        </Tooltip>
      )}
    </div>
  )
}

// 置信度显示组件
const ConfidenceDisplay = ({
  confidence,
  score,
  confidenceLevel,
}: {
  confidence?: number
  score?: number
  confidenceLevel?: string
}) => {
  // 将字符串置信度转换为数字
  const getConfidenceValue = (level?: string, scoreValue?: number): number => {
    if (scoreValue && typeof scoreValue === "number") {
      return Math.round(scoreValue)
    }
    if (level) {
      switch (level.toLowerCase()) {
        case "high":
          return 85
        case "medium":
          return 70
        case "low":
          return 50
        default:
          return 50
      }
    }
    // 修复：对 confidence 值进行舍入处理，保留1位小数
    return Math.round((confidence || 0) * 10) / 10
  }

  const confidenceValue = getConfidenceValue(confidenceLevel, score)

  const getColor = (conf: number) => {
    if (conf >= 90) return "success"
    if (conf >= 70) return "warning"
    return "danger"
  }

  const getDisplayText = (level?: string, conf?: number): string => {
    if (level) {
      const levelMap = {
        high: "高",
        medium: "中",
        low: "低",
      }
      return `${levelMap[level as keyof typeof levelMap] || level} (${confidenceValue}%)`
    }
    // 修复：对 conf 也进行舍入处理，保留1位小数
    const displayValue = conf ? Math.round(conf * 10) / 10 : confidenceValue
    return `${displayValue}%`
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold">
          {getDisplayText(confidenceLevel, confidence)}
        </span>
      </div>
      <Progress
        value={confidenceValue}
        size="sm"
        color={getColor(confidenceValue)}
        className="w-16"
      />
    </div>
  )
}

// 可复制文本组件
const CopyableText = ({ text, label }: { text: string; label: string }) => {
  const notifications = useNotifications()

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(text)
      notifications.success("复制成功", `${label}已复制到剪贴板`)
    } catch (error) {
      notifications.error("复制失败", "无法复制到剪贴板")
    }
  }

  if (!text) return <span className="text-default-400">-</span>

  return (
    <div
      className="group flex cursor-pointer items-center gap-1 rounded p-1 transition-colors hover:bg-default-100"
      onClick={copyToClipboard}
      title={`点击复制${label}`}
    >
      <span className="font-mono text-xs">{text}</span>
      <Copy className="h-3 w-3 text-default-400 opacity-0 transition-opacity group-hover:opacity-100" />
    </div>
  )
}

// 快速编辑组件
const QuickEditCell = ({
  record,
  onSave,
}: {
  record: MatchingResult
  onSave: (recordId: string, newName: string) => void
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [tempName, setTempName] = useState(record.originalData.name)

  const handleSave = () => {
    if (tempName.trim() !== record.originalData.name) {
      onSave(record._id, tempName.trim())
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setTempName(record.originalData.name)
    setIsEditing(false)
  }

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <Input
          size="sm"
          value={tempName}
          onChange={e => setTempName(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") handleSave()
            if (e.key === "Escape") handleCancel()
          }}
          className="min-w-0 flex-1"
          autoFocus
        />
        <Button
          size="sm"
          isIconOnly
          color="success"
          variant="light"
          onClick={handleSave}
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          isIconOnly
          color="danger"
          variant="light"
          onClick={handleCancel}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    )
  }

  return (
    <div
      className="group flex cursor-pointer items-center justify-between rounded px-1 hover:bg-default-50"
      onClick={() => setIsEditing(true)}
    >
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{record.originalData.name}</p>
        <p className="text-xs text-default-500">¥{record.originalData.price}</p>
      </div>
      <Edit className="h-3 w-3 text-default-400 opacity-0 group-hover:opacity-100" />
    </div>
  )
}

// 主要组件
function EnhancedMatchingResultsContent() {
  const searchParams = useSearchParams()
  const taskId = searchParams.get("taskId")
  const taskName = searchParams.get("taskName") || "未知任务"
  const taskIdentifier = searchParams.get("taskIdentifier") || ""

  // 基础状态
  const [results, setResults] = useState<MatchingResult[]>([])
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // 过滤和搜索状态
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [confidenceFilter, setConfidenceFilter] = useState("all")
  const [memoryFilter, setMemoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("confidence_desc")

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // 批量操作状态
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [batchMode, setBatchMode] = useState(false)

  // 高级功能状态
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [showUserGuide, setShowUserGuide] = useState(false)

  // 商品选择相关状态
  const [selectedRecord, setSelectedRecord] = useState<MatchingResult | null>(
    null
  )
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [productSearchTerm, setProductSearchTerm] = useState("")
  const [loadingProducts, setLoadingProducts] = useState(false)

  // 防抖搜索定时器
  const productSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [exceptionDetails, setExceptionDetails] = useState<{
    recordId: string
    reason: string
    details: string
  } | null>(null)

  // 模态窗口控制
  const productSelectModal = useDisclosure()
  const exceptionModal = useDisclosure()

  // 通知系统
  const notifications = useNotifications()

  // 过滤和排序逻辑
  const filteredAndSortedResults = useMemo(() => {
    console.log("🔍 开始过滤数据:", {
      totalRecords: results.length,
      searchTerm,
      statusFilter,
      confidenceFilter,
      memoryFilter,
    })

    let filtered = results.filter(result => {
      // 搜索过滤
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesOriginalName = result.originalData.name
          ?.toLowerCase()
          .includes(searchLower)
        const matchesProductName = result.selectedMatch?.productId?.name
          ?.toLowerCase()
          .includes(searchLower)
        const matchesBrand = result.selectedMatch?.productId?.brand
          ?.toLowerCase()
          .includes(searchLower)
        const matchesCompany = result.selectedMatch?.productId?.company
          ?.toLowerCase()
          .includes(searchLower)
        const matchesProductCode = result.selectedMatch?.productId?.productCode
          ?.toLowerCase()
          .includes(searchLower)
        const matchesBoxCode = result.selectedMatch?.productId?.boxCode
          ?.toLowerCase()
          .includes(searchLower)

        if (
          !matchesOriginalName &&
          !matchesProductName &&
          !matchesBrand &&
          !matchesCompany &&
          !matchesProductCode &&
          !matchesBoxCode
        ) {
          return false
        }
      }

      // 状态过滤
      if (statusFilter !== "all" && result.status !== statusFilter) {
        return false
      }

      // 置信度过滤
      if (confidenceFilter !== "all") {
        const confidence = result.selectedMatch?.confidence || 0
        switch (confidenceFilter) {
          case "high":
            if (confidence < 90) return false
            break
          case "medium":
            if (confidence < 70 || confidence >= 90) return false
            break
          case "low":
            if (confidence >= 70) return false
            break
        }
      }

      // 记忆匹配过滤
      if (memoryFilter !== "all") {
        const isMemoryMatch = result.selectedMatch?.isMemoryMatch || false
        if (memoryFilter === "memory" && !isMemoryMatch) return false
        if (memoryFilter === "no_memory" && isMemoryMatch) return false
      }

      return true
    })

    console.log("🔍 过滤完成:", {
      originalCount: results.length,
      filteredCount: filtered.length,
      difference: results.length - filtered.length,
      statusCounts: {
        confirmed: results.filter(r => r.status === "confirmed").length,
        reviewing: results.filter(r => r.status === "pending").length,
        exception: results.filter(r => r.status === "exception").length,
        rejected: results.filter(r => r.status === "rejected").length,
      },
    })

    // 排序
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "confidence_desc":
          return (
            (b.selectedMatch?.confidence || 0) -
            (a.selectedMatch?.confidence || 0)
          )
        case "confidence_asc":
          return (
            (a.selectedMatch?.confidence || 0) -
            (b.selectedMatch?.confidence || 0)
          )
        case "price_desc":
          return (b.originalData.price || 0) - (a.originalData.price || 0)
        case "price_asc":
          return (a.originalData.price || 0) - (b.originalData.price || 0)
        case "name_asc":
          return a.originalData.name.localeCompare(b.originalData.name)
        case "name_desc":
          return b.originalData.name.localeCompare(a.originalData.name)
        case "status":
          return a.status.localeCompare(b.status)
        default:
          return 0
      }
    })

    return filtered
  }, [
    results,
    searchTerm,
    statusFilter,
    confidenceFilter,
    memoryFilter,
    sortBy,
  ])

  // 分页逻辑
  const paginatedResults = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedResults.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedResults, currentPage])

  const totalPages = Math.ceil(filteredAndSortedResults.length / itemsPerPage)

  // 获取匹配结果
  const fetchResults = useCallback(async () => {
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

      // 获取匹配记录
      const url = new URL(buildApiUrl("/matching/records"))
      url.searchParams.set("taskId", taskId)
      url.searchParams.set("limit", "1000")

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
      // 避免在callback中使用notifications，改为直接使用store
      const { addNotification } = useAppStore.getState()
      addNotification({
        type: "error",
        title: "获取失败",
        message: "无法获取匹配结果",
      })
    } finally {
      setLoading(false)
    }
  }, [taskId])

  // 保存原始名称修改
  const saveOriginalName = async (recordId: string, newName: string) => {
    try {
      const response = await fetch(
        buildApiUrl(`/matching/records/${recordId}/original-name`),
        {
          method: "PATCH",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            originalName: newName,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      notifications.success("修改成功", "原始名称已更新")
      await fetchResults()
    } catch (error) {
      console.error("❌ 更新原始名称失败:", error)
      notifications.error("修改失败", "无法更新原始名称")
    }
  }

  // 批量选择处理
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
    if (selectedRecords.size === paginatedResults.length) {
      setSelectedRecords(new Set())
    } else {
      setSelectedRecords(new Set(paginatedResults.map(r => r._id)))
    }
  }

  // 确认匹配
  const confirmMatch = async (recordId: string) => {
    try {
      console.log("🔄 开始确认匹配:", recordId)

      // 找到对应的记录，获取productId
      const record = filteredAndSortedResults.find(r => r._id === recordId)
      if (!record) {
        throw new Error("找不到对应的匹配记录")
      }

      let productId: string | undefined

      // 优先使用已确认的匹配商品
      if (record.selectedMatch?.productId?._id) {
        productId = record.selectedMatch.productId._id
      }
      // 如果没有确认的匹配，但有候选商品，使用第一个候选商品
      else if (
        record.candidates &&
        record.candidates.length > 0 &&
        record.candidates[0]?.productId?._id
      ) {
        productId = record.candidates[0].productId._id
        console.log(
          "📋 使用候选商品进行确认:",
          record.candidates[0].productId.name
        )
      }

      if (!productId) {
        throw new Error("该记录没有可确认的商品，请先选择商品")
      }

      console.log("📋 确认匹配信息:", {
        recordId,
        productId,
        status: record.status,
        hasSelectedMatch: !!record.selectedMatch,
        candidatesCount: record.candidates?.length || 0,
      })

      const response = await fetch(
        buildApiUrl(`/matching/records/${recordId}/review`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            action: "confirm",
            productId: productId,
            note: "用户手动确认",
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ 确认匹配响应错误:", errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      console.log("✅ 确认匹配成功")
      notifications.success("确认成功", "匹配结果已确认")

      // 在更新数据前先计算下一个待处理记录
      const pendingRecords = filteredAndSortedResults.filter(
        r => r.status === "pending" || r.status === "exception"
      )
      const currentIndex = pendingRecords.findIndex(r => r._id === recordId)
      let nextRecord = null
      if (currentIndex >= 0 && currentIndex < pendingRecords.length - 1) {
        nextRecord = pendingRecords[currentIndex + 1]
      } else if (pendingRecords.length > 1) {
        nextRecord =
          pendingRecords[0]._id !== recordId
            ? pendingRecords[0]
            : pendingRecords[1] || null
      }

      await fetchResults()

      // 如果有下一个记录，自动跳转
      if (nextRecord) {
        jumpToNextPending(recordId)
      }
    } catch (error) {
      console.error("❌ 确认匹配失败:", error)
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      notifications.error("确认失败", `无法确认匹配结果: ${errorMessage}`)
    }
  }

  // 拒绝匹配
  const rejectMatch = async (recordId: string) => {
    try {
      console.log("🔄 开始拒绝匹配:", recordId)

      const response = await fetch(
        buildApiUrl(`/matching/records/${recordId}/review`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            action: "reject",
            note: "用户手动拒绝",
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ 拒绝匹配响应错误:", errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      console.log("✅ 拒绝匹配成功")
      notifications.success("拒绝成功", "匹配结果已拒绝")
      await fetchResults()
    } catch (error) {
      console.error("❌ 拒绝匹配失败:", error)
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      notifications.error("拒绝失败", `无法拒绝匹配结果: ${errorMessage}`)
    }
  }

  // 清空匹配
  const clearMatch = async (recordId: string) => {
    try {
      console.log("🔄 开始清空匹配:", recordId)

      const response = await fetch(
        buildApiUrl(`/matching/records/${recordId}/review`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            action: "clear",
            note: "用户清空匹配商品",
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ 清空匹配响应错误:", errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      console.log("✅ 清空匹配成功")
      notifications.success("清空成功", "匹配商品已清空，可重新选择")
      await fetchResults()
    } catch (error) {
      console.error("❌ 清空匹配失败:", error)
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      notifications.error("清空失败", `无法清空匹配结果: ${errorMessage}`)
    }
  }

  // 手动学习到记忆库
  const learnToMemory = async (recordId: string) => {
    try {
      console.log("🧠 开始学习到记忆库:", recordId)

      const response = await fetch(
        buildApiUrl(`/matching/records/${recordId}/learn`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            note: "用户手动学习",
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ 学习响应错误:", errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      const result = await response.json()
      console.log("✅ 学习到记忆库成功")
      notifications.success("学习成功", result.message || "已成功学习到记忆库")
    } catch (error) {
      console.error("❌ 学习到记忆库失败:", error)
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      notifications.error("学习失败", `无法学习到记忆库: ${errorMessage}`)
    }
  }

  // 批量学习到记忆库
  const batchLearnToMemory = async () => {
    if (selectedRecords.size === 0) return

    try {
      const recordIds = Array.from(selectedRecords)
      const response = await fetch(
        buildApiUrl("/matching/records/batch-learn"),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            recordIds,
            note: "批量手动学习",
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const result = await response.json()
      notifications.success("批量学习成功", result.message)
      setSelectedRecords(new Set())
    } catch (error) {
      console.error("❌ 批量学习失败:", error)
      notifications.error("批量学习失败", "无法批量学习到记忆库")
    }
  }

  // 批量确认
  const batchConfirm = async () => {
    if (selectedRecords.size === 0) return

    try {
      const recordIds = Array.from(selectedRecords)

      // 为每个记录找到对应的productId
      const recordsWithProductIds = recordIds.map(recordId => {
        const record = paginatedResults.find(r => r._id === recordId)
        if (!record) {
          throw new Error(`找不到记录: ${recordId}`)
        }

        // 优先使用已选择的匹配商品，否则使用第一个候选商品
        let productId: string | undefined
        if (record.selectedMatch?.productId?._id) {
          productId = record.selectedMatch.productId._id
        } else if (
          record.candidates &&
          record.candidates.length > 0 &&
          record.candidates[0]?.productId?._id
        ) {
          productId = record.candidates[0].productId._id
        }

        if (!productId) {
          throw new Error(
            `记录 ${record.originalData?.name || recordId} 没有可确认的商品`
          )
        }

        return productId
      })

      const response = await fetch(
        buildApiUrl("/matching/records/batch-review"),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            recordIds,
            productIds: recordsWithProductIds,
            action: "confirm",
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      notifications.success("批量确认成功", `已确认 ${recordIds.length} 条记录`)
      setSelectedRecords(new Set())
      await fetchResults()
    } catch (error) {
      console.error("❌ 批量确认失败:", error)
      notifications.error(
        "批量确认失败",
        error instanceof Error ? error.message : "无法批量确认匹配结果"
      )
    }
  }

  // 批量拒绝
  const batchReject = async () => {
    if (selectedRecords.size === 0) return

    try {
      const recordIds = Array.from(selectedRecords)
      const response = await fetch(
        buildApiUrl("/matching/records/batch-review"),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            recordIds,
            action: "reject",
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      notifications.success("批量拒绝成功", `已拒绝 ${recordIds.length} 条记录`)
      setSelectedRecords(new Set())
      await fetchResults()
    } catch (error) {
      console.error("❌ 批量拒绝失败:", error)
      notifications.error("批量拒绝失败", "无法批量拒绝匹配结果")
    }
  }

  // 智能批量确认（只确认高置信度的）
  const smartBatchConfirm = async () => {
    if (selectedRecords.size === 0) return

    const highConfidenceRecords = paginatedResults.filter(
      r =>
        selectedRecords.has(r._id) &&
        r.selectedMatch &&
        r.selectedMatch.confidence >= 90
    )

    if (highConfidenceRecords.length === 0) {
      notifications.warning(
        "没有高置信度记录",
        "请选择置信度≥90%的记录进行智能确认"
      )
      return
    }

    try {
      const recordIds = highConfidenceRecords.map(r => r._id)
      const productIds = highConfidenceRecords.map(record => {
        if (record.selectedMatch?.productId?._id) {
          return record.selectedMatch.productId._id
        } else if (
          record.candidates &&
          record.candidates.length > 0 &&
          record.candidates[0]?.productId?._id
        ) {
          return record.candidates[0].productId._id
        } else {
          throw new Error(`记录 ${record.originalData?.name} 没有可确认的商品`)
        }
      })

      const response = await fetch(
        buildApiUrl("/matching/records/batch-review"),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            recordIds,
            productIds,
            action: "confirm",
          }),
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      notifications.success(
        "智能确认成功",
        `已确认 ${highConfidenceRecords.length} 条高置信度记录`
      )
      setSelectedRecords(new Set())
      await fetchResults()
    } catch (error) {
      console.error("❌ 智能确认失败:", error)
      notifications.error("智能确认失败", "无法执行智能确认")
    }
  }

  // 获取可选商品列表
  const fetchAvailableProducts = async (searchTerm: string = "") => {
    try {
      setLoadingProducts(true)

      // 直接从当前任务信息中获取模板ID
      let templateId = taskInfo?.templateId

      console.log("🔄 开始获取商品列表")
      console.log("📋 当前任务信息:", taskInfo)
      console.log("🎯 使用模板ID:", templateId)

      // 如果任务信息中没有模板ID，尝试从模板接口获取
      if (!templateId) {
        console.log("⚠️ 任务中无模板ID，尝试获取模板选项")

        const templatesResponse = await fetch(
          buildApiUrl("/templates/options"),
          {
            headers: getAuthHeaders(),
          }
        )

        if (!templatesResponse.ok) {
          throw new Error(`获取模板选项失败: HTTP ${templatesResponse.status}`)
        }

        const templatesData = await templatesResponse.json()
        console.log("📋 模板数据:", templatesData)

        const templates = templatesData.data?.templates || []

        if (templates.length === 0) {
          throw new Error("没有可用的商品模板，请先创建商品模板")
        }

        // 使用第一个默认模板或第一个模板
        const activeTemplate =
          templates.find((t: any) => t.isDefault) || templates[0]

        if (!activeTemplate || (!activeTemplate._id && !activeTemplate.id)) {
          console.error("❌ 模板数据异常:", activeTemplate)
          throw new Error("无法获取有效的模板ID")
        }

        templateId = activeTemplate._id || activeTemplate.id
        console.log(
          "✅ 从模板选项获取ID:",
          templateId,
          "模板名称:",
          activeTemplate.name
        )
      }

      if (!templateId) {
        throw new Error("无法获取模板ID，请刷新页面重试")
      }

      // 构建产品搜索URL - 使用商品搜索API
      const url = new URL(buildApiUrl("/products/search"))
      url.searchParams.set("templateId", templateId)
      url.searchParams.set("limit", "50")
      url.searchParams.set("q", searchTerm.trim())

      console.log("🔗 产品API URL:", url.toString())

      const response = await fetch(url.toString(), {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ 产品API响应错误:", errorText)
        throw new Error(`获取商品列表失败: HTTP ${response.status}`)
      }

      const data = await response.json()

      const products = data.data?.products || []
      setAvailableProducts(products)

      if (products.length === 0) {
        notifications.warning("提示", "当前模板下没有可用商品")
      }
    } catch (error) {
      console.error("❌ 获取商品列表失败:", error)
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      notifications.error("获取失败", `无法获取商品列表: ${errorMessage}`)
      // 如果获取失败，设置一个空数组
      setAvailableProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }

  // 防抖搜索商品
  const debouncedProductSearch = useCallback((searchTerm: string) => {
    // 清除之前的定时器
    if (productSearchTimeoutRef.current) {
      clearTimeout(productSearchTimeoutRef.current)
    }

    // 如果搜索词为空，直接清空商品列表
    if (!searchTerm || !searchTerm.trim()) {
      setAvailableProducts([])
      setLoadingProducts(false)
      return
    }

    // 显示搜索状态
    setLoadingProducts(true)

    // 设置新的定时器 - 800ms防抖延迟
    productSearchTimeoutRef.current = setTimeout(() => {
      fetchAvailableProducts(searchTerm)
    }, 800) // 800ms 防抖延迟
  }, [])

  // 打开商品选择窗口
  const openProductSelector = async (record: MatchingResult) => {
    setSelectedRecord(record)
    setProductSearchTerm("")
    setAvailableProducts([]) // 清空商品列表
    productSelectModal.onOpen()
    // 不再自动搜索，等待用户输入搜索词
  }

  // 查看异常详情
  const viewExceptionDetails = (record: MatchingResult) => {
    setExceptionDetails({
      recordId: record._id,
      reason: record.metadata.exceptionReason || "未知异常",
      details: record.metadata.exceptionDetails || "暂无详细信息",
    })
    exceptionModal.onOpen()
  }

  // 手动选择商品
  const selectProduct = async (productId: string) => {
    if (!selectedRecord) return

    try {
      // 使用审核接口，先选择商品再确认
      const response = await fetch(
        buildApiUrl(`/matching/records/${selectedRecord._id}/review`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            action: "confirm",
            productId: productId,
            note: "手动选择商品",
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error("❌ 手动选择商品响应错误:", errorText)
        throw new Error(`HTTP ${response.status}: ${errorText}`)
      }

      notifications.success("选择成功", "商品匹配已更新")

      // 记录当前选中的记录ID，用于跳转逻辑
      const currentRecordId = selectedRecord._id

      // 在更新数据前先计算下一个待处理记录
      const pendingRecords = filteredAndSortedResults.filter(
        r => r.status === "pending" || r.status === "exception"
      )
      const currentIndex = pendingRecords.findIndex(
        r => r._id === currentRecordId
      )
      let nextRecord = null
      if (currentIndex >= 0 && currentIndex < pendingRecords.length - 1) {
        nextRecord = pendingRecords[currentIndex + 1]
      } else if (pendingRecords.length > 1) {
        nextRecord =
          pendingRecords[0]._id !== currentRecordId
            ? pendingRecords[0]
            : pendingRecords[1] || null
      }

      productSelectModal.onClose()
      setSelectedRecord(null)
      await fetchResults()

      // 如果有下一个记录，自动跳转
      if (nextRecord) {
        jumpToNextPending(currentRecordId)
      }
    } catch (error) {
      console.error("❌ 选择商品失败:", error)
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      notifications.error("选择失败", `无法更新商品匹配: ${errorMessage}`)
    }
  }

  // 导出Excel功能
  const exportToExcel = async (exportType: "filtered" | "all") => {
    try {
      // 动态导入exceljs库
      const ExcelJS = await import("exceljs")

      let dataToExport: MatchingResult[]

      if (exportType === "filtered") {
        // 导出当前筛选和排序的数据
        dataToExport = filteredAndSortedResults
        notifications.info(
          "导出提示",
          `正在导出${dataToExport.length}条筛选后的记录...`
        )
      } else {
        // 导出全部数据
        dataToExport = results
        notifications.info(
          "导出提示",
          `正在导出${dataToExport.length}条全部记录...`
        )
      }

      if (dataToExport.length === 0) {
        notifications.warning("导出提示", "没有数据可以导出")
        return
      }

      // 创建工作簿
      const workbook = new ExcelJS.Workbook()
      const worksheet = workbook.addWorksheet("智能匹配结果")

      // 设置列宽和表头
      worksheet.columns = [
        { header: "商品名称", key: "productName", width: 25 },
        { header: "盒码", key: "boxCode", width: 15 },
        { header: "条码", key: "productCode", width: 15 },
        { header: "公司价", key: "companyPrice", width: 12 },
        { header: "品牌", key: "brand", width: 15 },
        { header: "批发名", key: "wholesaleName", width: 25 },
        { header: "批发价", key: "wholesalePrice", width: 12 },
      ]

      // 设置表头样式 - 蓝底白字
      const headerRow = worksheet.getRow(1)
      headerRow.eachCell(cell => {
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF4472C4" }, // 蓝色背景
        }
        cell.font = {
          color: { argb: "FFFFFFFF" }, // 白色字体
          bold: true,
          size: 11,
        }
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
        }
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        }
      })
      headerRow.height = 25

      // 设置自动筛选器 - 让用户可以按列筛选数据
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 7 },
      }

      // 添加数据行
      dataToExport.forEach(result => {
        const row = worksheet.addRow({
          productName:
            result.selectedMatch?.productId?.name ||
            result.originalData.name ||
            "-",
          boxCode: result.selectedMatch?.productId?.boxCode || "-",
          productCode: result.selectedMatch?.productId?.productCode || "-",
          companyPrice:
            result.selectedMatch?.productId?.pricing?.companyPrice ||
            result.originalData.price ||
            0,
          brand: result.selectedMatch?.productId?.brand || "-",
          wholesaleName: result.originalData.name || "-",
          wholesalePrice: result.originalData.price || 0,
        })

        // 设置数据行样式 - 居中对齐
        row.eachCell(cell => {
          cell.alignment = {
            horizontal: "center",
            vertical: "middle",
          }
          cell.border = {
            top: { style: "thin", color: { argb: "FFD0D0D0" } },
            left: { style: "thin", color: { argb: "FFD0D0D0" } },
            bottom: { style: "thin", color: { argb: "FFD0D0D0" } },
            right: { style: "thin", color: { argb: "FFD0D0D0" } },
          }
        })
      })

      // 生成文件名
      const now = new Date()
      const timestamp = now
        .toISOString()
        .slice(0, 19)
        .replace(/[:-]/g, "")
        .replace("T", "_")
      const fileName = `智能匹配结果_${exportType === "filtered" ? "筛选数据" : "全部数据"}_${timestamp}.xlsx`

      // 导出文件
      const buffer = await workbook.xlsx.writeBuffer()
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      })

      // 创建下载链接
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      notifications.success(
        "导出成功",
        `已导出 ${dataToExport.length} 条记录到 ${fileName}`
      )
    } catch (error) {
      console.error("❌ 导出Excel失败:", error)
      const errorMessage = error instanceof Error ? error.message : "未知错误"
      notifications.error("导出失败", `无法导出Excel文件: ${errorMessage}`)
    }
  }

  // 跳转到下一个待处理记录
  const jumpToNextPending = (currentRecordId?: string) => {
    const pendingRecords = filteredAndSortedResults.filter(
      r => r.status === "pending" || r.status === "exception"
    )

    if (pendingRecords.length > 0) {
      const currentIndex = pendingRecords.findIndex(
        r => r._id === currentRecordId
      )

      // 如果当前记录已经处理完成，找下一个未处理的记录
      let nextRecord = null
      if (currentIndex >= 0 && currentIndex < pendingRecords.length - 1) {
        nextRecord = pendingRecords[currentIndex + 1]
      } else if (pendingRecords.length > 1) {
        // 如果是最后一个或没找到当前记录，取第一个
        nextRecord = pendingRecords[0]
      }

      if (nextRecord) {
        // 找到该记录在当前页中的位置
        const recordIndex = paginatedResults.findIndex(
          r => r._id === nextRecord._id
        )
        if (recordIndex === -1) {
          // 如果不在当前页，需要跳转页面
          const totalIndex = filteredAndSortedResults.findIndex(
            r => r._id === nextRecord._id
          )
          const targetPage = Math.floor(totalIndex / itemsPerPage) + 1
          setCurrentPage(targetPage)

          // 等待页面跳转后再打开选择窗口
          setTimeout(() => {
            openProductSelector(nextRecord)
          }, 500)
        } else {
          // 在当前页，直接打开选择窗口
          setTimeout(() => {
            openProductSelector(nextRecord)
          }, 100)
        }

        notifications.info(
          "自动跳转",
          `已跳转到下一个待处理记录: ${nextRecord.originalData.name}`
        )
      } else {
        notifications.success("处理完成", "所有记录都已处理完成！")
      }
    } else {
      notifications.success("处理完成", "没有更多待处理的记录")
    }
  }

  // 处理异常记录
  const handleException = async (
    recordId: string,
    action: "assign_manual" | "skip"
  ) => {
    try {
      const response = await fetch(
        buildApiUrl(`/matching/records/${recordId}/handle-exception`),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({ action }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const actionText =
        action === "assign_manual" ? "转为手动处理" : "跳过处理"
      notifications.success("处理成功", `异常记录已${actionText}`)
      exceptionModal.onClose()
      await fetchResults()
    } catch (error) {
      console.error("❌ 处理异常失败:", error)
      notifications.error("处理失败", "无法处理异常记录")
    }
  }

  // 统计信息 - 使用原始数据而不是过滤后的数据
  const statistics = useMemo(() => {
    // 使用原始数据计算统计
    const originalTotal = results.length
    const originalConfirmed = results.filter(
      r => r.status === "confirmed"
    ).length
    const originalReviewing = results.filter(r => r.status === "pending").length
    const originalException = results.filter(
      r => r.status === "exception"
    ).length
    const originalRejected = results.filter(r => r.status === "rejected").length
    const originalMemoryMatches = results.filter(
      r => r.selectedMatch?.isMemoryMatch
    ).length

    // 当前显示的过滤后数据
    const filteredTotal = filteredAndSortedResults.length
    const filteredConfirmed = filteredAndSortedResults.filter(
      r => r.status === "confirmed"
    ).length
    const filteredReviewing = filteredAndSortedResults.filter(
      r => r.status === "pending"
    ).length
    const filteredException = filteredAndSortedResults.filter(
      r => r.status === "exception"
    ).length
    const filteredRejected = filteredAndSortedResults.filter(
      r => r.status === "rejected"
    ).length
    const filteredMemoryMatches = filteredAndSortedResults.filter(
      r => r.selectedMatch?.isMemoryMatch
    ).length

    return {
      // 显示原始统计
      total: originalTotal,
      confirmed: originalConfirmed,
      reviewing: originalReviewing,
      exception: originalException,
      rejected: originalRejected,
      memoryMatches: originalMemoryMatches,
      confirmRate:
        originalTotal > 0
          ? Math.round((originalConfirmed / originalTotal) * 100)
          : 0,
      memoryRate:
        originalTotal > 0
          ? Math.round((originalMemoryMatches / originalTotal) * 100)
          : 0,
      // 过滤后的统计（用于显示当前过滤结果）
      filteredTotal,
      filteredConfirmed,
      filteredReviewing,
      filteredException,
      filteredRejected,
      filteredMemoryMatches,
    }
  }, [results, filteredAndSortedResults])

  // 自动刷新
  useEffect(() => {
    if (autoRefresh && taskId) {
      const interval = setInterval(() => {
        fetchResults()
      }, 5000) // 5秒刷新一次，更平滑的进度更新
      return () => clearInterval(interval)
    }
  }, [autoRefresh, taskId]) // 移除fetchResults依赖

  // 初始化数据加载
  useEffect(() => {
    if (taskId) {
      fetchResults()
    }
  }, [taskId]) // 只依赖taskId，避免无限循环

  useEffect(() => {
    setCurrentPage(1) // 重置页码当过滤条件变化时
  }, [searchTerm, statusFilter, confidenceFilter, memoryFilter])

  // 组件卸载时清理搜索定时器
  useEffect(() => {
    return () => {
      if (productSearchTimeoutRef.current) {
        clearTimeout(productSearchTimeoutRef.current)
      }
    }
  }, [])

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
      {/* 页面标题和操作栏 */}
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
              <h1 className="text-2xl font-bold">智能匹配管理</h1>
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
            <div className="space-y-1">
              <p className="text-default-500">
                任务：{decodeURIComponent(taskName)} |
                <span className="font-medium"> {statistics.total} 条记录</span>
              </p>
              {/* 过滤状态提示 */}
              {statistics.filteredTotal < statistics.total && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-warning-600">
                    🔍 当前显示 {statistics.filteredTotal} / {statistics.total}{" "}
                    条记录 ({statistics.total - statistics.filteredTotal}{" "}
                    条被过滤)
                  </p>
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    onClick={() => {
                      setSearchTerm("")
                      setStatusFilter("all")
                      setConfidenceFilter("all")
                      setMemoryFilter("all")
                      setSortBy("confidence_desc")
                    }}
                  >
                    显示全部
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="flat"
            size="sm"
            startContent={<RefreshCw className="h-4 w-4" />}
            onClick={fetchResults}
            isLoading={loading}
          >
            刷新
          </Button>
          <Button
            variant="flat"
            size="sm"
            color={autoRefresh ? "primary" : "default"}
            startContent={<TrendingUp className="h-4 w-4" />}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            自动刷新
          </Button>
          <Button
            variant="flat"
            size="sm"
            color={showUserGuide ? "primary" : "default"}
            startContent={<HelpCircle className="h-4 w-4" />}
            onClick={() => setShowUserGuide(!showUserGuide)}
          >
            使用指南
          </Button>
          <Dropdown>
            <DropdownTrigger>
              <Button
                color="primary"
                size="sm"
                endContent={<ChevronDown className="h-4 w-4" />}
              >
                导出结果
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              onAction={key => {
                if (key === "filtered") {
                  exportToExcel("filtered")
                } else if (key === "all") {
                  exportToExcel("all")
                }
              }}
            >
              <DropdownItem
                key="filtered"
                startContent={<FileSpreadsheet className="h-4 w-4" />}
                description={`导出当前筛选的 ${filteredAndSortedResults.length} 条记录为Excel文件`}
              >
                按照当前筛选导出
              </DropdownItem>
              <DropdownItem
                key="all"
                startContent={<Download className="h-4 w-4" />}
                description={`导出全部 ${results.length} 条记录为Excel文件`}
              >
                导出全部数据
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </div>
      </div>

      {/* 快速统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-default-500">总记录</p>
              <p className="text-lg font-bold">{statistics.total}</p>
            </div>
            <Target className="h-5 w-5 text-primary" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-default-500">已确认</p>
              <p className="text-lg font-bold text-success">
                {statistics.confirmed}
              </p>
            </div>
            <CheckCircle className="h-5 w-5 text-success" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-default-500">待审核</p>
              <p className="text-lg font-bold text-secondary">
                {statistics.reviewing}
              </p>
            </div>
            <AlertTriangle className="h-5 w-5 text-warning" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-default-500">异常</p>
              <p className="text-lg font-bold text-danger">
                {statistics.exception}
              </p>
            </div>
            <XCircle className="h-5 w-5 text-danger" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-default-500">记忆匹配</p>
              <p className="text-lg font-bold text-secondary">
                {statistics.memoryMatches}
              </p>
            </div>
            <Brain className="h-5 w-5 text-secondary" />
          </div>
        </Card>

        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-default-500">确认率</p>
              <p className="text-lg font-bold">{statistics.confirmRate}%</p>
            </div>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
        </Card>
      </div>

      {/* 用户指南面板 */}
      {showUserGuide && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold">
                <HelpCircle className="h-5 w-5 text-primary" />
                智能匹配管理使用指南
              </h3>
              <Button
                isIconOnly
                size="sm"
                variant="light"
                onClick={() => setShowUserGuide(false)}
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 text-sm font-medium text-primary">
                  🔍 搜索与筛选功能
                </h4>
                <ul className="space-y-1 text-sm text-default-600">
                  <li>
                    • <strong>搜索框：</strong>可搜索商品名称、品牌、条码、盒码
                  </li>
                  <li>
                    • <strong>状态筛选：</strong>已确认、待审核、异常、已拒绝
                  </li>
                  <li>
                    • <strong>置信度筛选：</strong>
                    高(≥90%)、中(70-89%)、低(&lt;70%)
                  </li>
                  <li>
                    • <strong>匹配类型：</strong>记忆匹配、算法匹配
                  </li>
                  <li>
                    • <strong>排序功能：</strong>置信度、价格、名称、状态排序
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-success">
                  ✅ 单条记录操作
                </h4>
                <ul className="space-y-1 text-sm text-default-600">
                  <li>
                    • <strong>⚙️ 蓝色设置按钮：</strong>选择/更换匹配商品
                    (全状态可用)
                  </li>
                  <li>
                    • <strong>✅ 绿色按钮：</strong>确认当前匹配结果
                  </li>
                  <li>
                    • <strong>❌ 红色按钮：</strong>拒绝当前匹配结果
                  </li>
                  <li>
                    • <strong>🔄 清空按钮：</strong>清空匹配商品，重新选择
                  </li>
                  <li>
                    • <strong>📚 学习按钮：</strong>手动将当前匹配学习到记忆库
                  </li>
                  <li>
                    • <strong>📝 编辑按钮：</strong>重新审核已确认的记录
                  </li>
                  <li>
                    • <strong>ℹ️ 信息按钮：</strong>查看异常详情和处理建议
                  </li>
                  <li>
                    • <strong>原始商品名：</strong>点击可直接编辑修改
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-warning">
                  🔧 批量操作功能
                </h4>
                <ul className="space-y-1 text-sm text-default-600">
                  <li>
                    • <strong>开启批量模式：</strong>点击"批量操作"按钮
                  </li>
                  <li>
                    • <strong>选择记录：</strong>勾选表格左侧复选框
                  </li>
                  <li>
                    • <strong>全选/反选：</strong>点击表头复选框
                  </li>
                  <li>
                    • <strong>智能确认：</strong>只确认置信度≥90%的记录
                  </li>
                  <li>
                    • <strong>批量确认/拒绝：</strong>对所有选中记录执行操作
                  </li>
                  <li>
                    • <strong>批量学习：</strong>将选中的已确认记录学习到记忆库
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="mb-2 text-sm font-medium text-secondary">
                  🧠 记忆匹配系统
                </h4>
                <ul className="space-y-1 text-sm text-default-600">
                  <li>
                    • <strong>🧠 记忆图标：</strong>表示基于历史记忆的匹配
                  </li>
                  <li>
                    • <strong>自动学习：</strong>每次确认都会被系统记住
                  </li>
                  <li>
                    • <strong>手动学习：</strong>点击📚按钮主动学习正确匹配
                  </li>
                  <li>
                    • <strong>优先匹配：</strong>记忆匹配比算法匹配优先级更高
                  </li>
                  <li>
                    • <strong>持续优化：</strong>使用越多，匹配越准确
                  </li>
                  <li>
                    • <strong>记忆统计：</strong>顶部卡片显示记忆匹配占比
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t pt-3">
              <h4 className="mb-2 text-sm font-medium text-primary">
                💡 最佳实践建议
              </h4>
              <div className="grid gap-2 text-sm text-default-600 md:grid-cols-3">
                <div>• 先处理高置信度(绿色)记录</div>
                <div>• 使用智能确认批量处理</div>
                <div>• 优先处理异常状态记录</div>
                <div>• 利用搜索快速定位问题</div>
                <div>• 善用商品选择功能重新匹配</div>
                <div>• 及时修正错误的原始名称</div>
                <div>• 选择商品后自动跳转提高效率</div>
                <div>• 查看异常详情了解处理方法</div>
                <div>• 善用记忆匹配提高准确率</div>
                <div>• 手动学习正确匹配到记忆库</div>
                <div>• 批量学习优质数据提升系统</div>
                <div>• 清空错误匹配重新选择商品</div>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* 搜索和过滤工具栏 */}
      <Card>
        <CardBody>
          <div className="space-y-4">
            {/* 主要搜索栏 */}
            <div className="flex items-center gap-3">
              <Input
                placeholder="搜索商品名称、品牌、条码、盒码..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                startContent={<Search className="h-4 w-4" />}
                className="flex-1"
                isClearable
                onClear={() => setSearchTerm("")}
              />
              <Button
                variant={batchMode ? "solid" : "flat"}
                color={batchMode ? "warning" : "default"}
                startContent={<Edit className="h-4 w-4" />}
                onClick={() => setBatchMode(!batchMode)}
              >
                批量操作
              </Button>
            </div>

            {/* 筛选器 */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Select
                label="状态"
                size="sm"
                selectedKeys={[statusFilter]}
                onChange={e => {
                  const newValue = e.target.value
                  // 如果新值为空或未定义，保持当前状态不变
                  if (newValue && newValue.trim() !== "") {
                    setStatusFilter(newValue)
                  }
                }}
              >
                <SelectItem key="all">全部状态</SelectItem>
                <SelectItem key="confirmed">已确认</SelectItem>
                <SelectItem key="pending">待审核</SelectItem>
                <SelectItem key="exception">异常</SelectItem>
                <SelectItem key="rejected">已拒绝</SelectItem>
              </Select>

              <Select
                label="置信度"
                size="sm"
                selectedKeys={[confidenceFilter]}
                onChange={e => {
                  const newValue = e.target.value
                  // 如果新值为空或未定义，保持当前状态不变
                  if (newValue && newValue.trim() !== "") {
                    setConfidenceFilter(newValue)
                  }
                }}
              >
                <SelectItem key="all">全部置信度</SelectItem>
                <SelectItem key="high">高 (≥90%)</SelectItem>
                <SelectItem key="medium">中 (70-89%)</SelectItem>
                <SelectItem key="low">低 (&lt;70%)</SelectItem>
              </Select>

              <Select
                label="匹配类型"
                size="sm"
                selectedKeys={[memoryFilter]}
                onChange={e => {
                  const newValue = e.target.value
                  // 如果新值为空或未定义，保持当前状态不变
                  if (newValue && newValue.trim() !== "") {
                    setMemoryFilter(newValue)
                  }
                }}
              >
                <SelectItem key="all">全部类型</SelectItem>
                <SelectItem key="memory">记忆匹配</SelectItem>
                <SelectItem key="no_memory">算法匹配</SelectItem>
              </Select>

              <Select
                label="排序方式"
                size="sm"
                selectedKeys={[sortBy]}
                onChange={e => {
                  const newValue = e.target.value
                  // 如果新值为空或未定义，保持当前状态不变
                  if (newValue && newValue.trim() !== "") {
                    setSortBy(newValue)
                  }
                }}
              >
                <SelectItem key="confidence_desc">置信度 (高→低)</SelectItem>
                <SelectItem key="confidence_asc">置信度 (低→高)</SelectItem>
                <SelectItem key="price_desc">价格 (高→低)</SelectItem>
                <SelectItem key="price_asc">价格 (低→高)</SelectItem>
                <SelectItem key="name_asc">名称 (A→Z)</SelectItem>
                <SelectItem key="name_desc">名称 (Z→A)</SelectItem>
                <SelectItem key="status">状态</SelectItem>
              </Select>

              <div className="flex items-end">
                <Button
                  size="sm"
                  variant="flat"
                  onClick={() => {
                    setSearchTerm("")
                    setStatusFilter("all")
                    setConfidenceFilter("all")
                    setMemoryFilter("all")
                    setSortBy("confidence_desc")
                  }}
                >
                  重置筛选
                </Button>
              </div>
            </div>

            {/* 批量操作工具栏 */}
            {batchMode && (
              <div className="flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3">
                <Checkbox
                  isSelected={
                    selectedRecords.size === paginatedResults.length &&
                    paginatedResults.length > 0
                  }
                  isIndeterminate={
                    selectedRecords.size > 0 &&
                    selectedRecords.size < paginatedResults.length
                  }
                  onChange={toggleAllSelection}
                />
                <span className="text-sm">
                  已选择 {selectedRecords.size} / {paginatedResults.length}{" "}
                  条记录
                </span>
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    startContent={<Zap className="h-3 w-3" />}
                    isDisabled={selectedRecords.size === 0}
                    onClick={smartBatchConfirm}
                  >
                    智能确认 ({selectedRecords.size})
                  </Button>
                  <Button
                    size="sm"
                    color="success"
                    variant="flat"
                    isDisabled={selectedRecords.size === 0}
                    onClick={batchConfirm}
                  >
                    批量确认 ({selectedRecords.size})
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    isDisabled={selectedRecords.size === 0}
                    onClick={batchReject}
                  >
                    批量拒绝 ({selectedRecords.size})
                  </Button>
                  <Button
                    size="sm"
                    color="secondary"
                    variant="flat"
                    isDisabled={selectedRecords.size === 0}
                    onClick={batchLearnToMemory}
                    startContent={<BookPlus className="h-4 w-4" />}
                  >
                    学习到记忆库 ({selectedRecords.size})
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    onClick={() => setSelectedRecords(new Set())}
                  >
                    清空选择
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>

      {/* 主要数据表格 */}
      <Card>
        <CardBody>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                <p>加载中...</p>
              </div>
            </div>
          ) : filteredAndSortedResults.length === 0 ? (
            <EmptyState
              icon={<Search className="h-12 w-12" />}
              title="没有找到匹配的记录"
              description="请调整搜索条件或过滤器"
            />
          ) : (
            <div className="space-y-4">
              <Table
                aria-label="匹配结果表格"
                classNames={{
                  table: "min-h-[400px]",
                  wrapper: "shadow-none",
                }}
              >
                <TableHeader>
                  <TableColumn width={40}>
                    {batchMode ? (
                      <Checkbox
                        isSelected={
                          selectedRecords.size === paginatedResults.length &&
                          paginatedResults.length > 0
                        }
                        isIndeterminate={
                          selectedRecords.size > 0 &&
                          selectedRecords.size < paginatedResults.length
                        }
                        onChange={toggleAllSelection}
                      />
                    ) : (
                      <span className="text-xs">#</span>
                    )}
                  </TableColumn>
                  <TableColumn width={180}>批发名</TableColumn>
                  <TableColumn width={250}>匹配商品</TableColumn>
                  <TableColumn width={100}>条码</TableColumn>
                  <TableColumn width={100}>盒码</TableColumn>
                  <TableColumn width={70}>置信度</TableColumn>
                  <TableColumn width={100}>匹配类型</TableColumn>
                  <TableColumn width={70}>状态</TableColumn>
                  <TableColumn width={60}>来源行</TableColumn>
                  <TableColumn width={120}>操作</TableColumn>
                </TableHeader>
                <TableBody>
                  {paginatedResults.map((result, index) => (
                    <TableRow key={result._id}>
                      <TableCell>
                        {batchMode ? (
                          <Checkbox
                            isSelected={selectedRecords.has(result._id)}
                            onChange={() => toggleRecordSelection(result._id)}
                          />
                        ) : (
                          <span className="text-xs text-default-400">
                            {(currentPage - 1) * itemsPerPage + index + 1}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <QuickEditCell
                          record={result}
                          onSave={saveOriginalName}
                        />
                      </TableCell>
                      <TableCell>
                        {result.selectedMatch?.productId ? (
                          // 已选择匹配商品（confirmed状态）
                          <div className="space-y-1">
                            <p className="line-clamp-2 text-sm font-medium">
                              {result.selectedMatch.productId?.name ||
                                "未知商品"}
                            </p>
                            <div className="flex flex-wrap gap-1 text-xs">
                              <span className="text-primary">
                                {result.selectedMatch.productId?.brand ||
                                  "未知品牌"}
                              </span>
                              {result.selectedMatch.productId?.company && (
                                <span className="text-default-500">
                                  | {result.selectedMatch.productId.company}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {result.selectedMatch.productId?.productType && (
                                <Chip size="sm" variant="flat" color="primary">
                                  {result.selectedMatch.productId.productType}
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
                                0}
                              {result.selectedMatch.productId?.pricing?.unit &&
                                ` / ${result.selectedMatch.productId.pricing.unit}`}
                            </div>
                          </div>
                        ) : result.status === "pending" &&
                          result.candidates &&
                          result.candidates.length > 0 ? (
                          // 待审核状态：显示最佳候选商品
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="line-clamp-2 text-sm font-medium text-warning-700">
                                {result.candidates[0]?.productId?.name ||
                                  "未知商品"}
                              </p>
                              <Chip size="sm" variant="flat" color="warning">
                                候选
                              </Chip>
                            </div>
                            <div className="flex flex-wrap gap-1 text-xs">
                              <span className="text-warning-600">
                                {result.candidates[0]?.productId?.brand ||
                                  "未知品牌"}
                              </span>
                              {result.candidates[0]?.productId?.company && (
                                <span className="text-default-500">
                                  | {result.candidates[0].productId.company}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {result.candidates[0]?.productId?.productType && (
                                <Chip size="sm" variant="flat" color="primary">
                                  {result.candidates[0].productId.productType}
                                </Chip>
                              )}
                              {result.candidates[0]?.productId?.features
                                ?.hasPop && (
                                <Chip size="sm" variant="flat" color="success">
                                  爆珠
                                </Chip>
                              )}
                            </div>
                            <div className="text-xs text-default-500">
                              ¥
                              {result.candidates[0]?.productId?.pricing
                                ?.companyPrice ||
                                result.candidates[0]?.productId?.pricing
                                  ?.retailPrice ||
                                0}
                              {result.candidates[0]?.productId?.pricing?.unit &&
                                ` / ${result.candidates[0].productId.pricing.unit}`}
                            </div>
                          </div>
                        ) : result.status === "exception" ? (
                          // 异常状态：显示异常原因
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <AlertTriangle className="h-4 w-4 text-warning" />
                              <span className="text-sm font-medium text-warning-700">
                                匹配异常
                              </span>
                            </div>
                            <div className="text-xs text-default-600">
                              {result.metadata.exceptionReason ||
                                "自动匹配失败"}
                            </div>
                            <Chip size="sm" variant="flat" color="warning">
                              需要人工选择
                            </Chip>
                          </div>
                        ) : (
                          // 其他情况：无匹配
                          <div className="space-y-1">
                            <span className="text-sm text-default-400">
                              无匹配商品
                            </span>
                            <div className="text-xs text-default-500">
                              请手动选择商品
                            </div>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.selectedMatch?.productId ? (
                          <CopyableText
                            text={
                              result.selectedMatch.productId.productCode || ""
                            }
                            label="条码"
                          />
                        ) : result.status === "pending" &&
                          result.candidates &&
                          result.candidates.length > 0 ? (
                          <CopyableText
                            text={
                              result.candidates[0]?.productId?.productCode || ""
                            }
                            label="条码"
                          />
                        ) : (
                          <span className="text-default-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.selectedMatch?.productId ? (
                          <CopyableText
                            text={result.selectedMatch.productId.boxCode || ""}
                            label="盒码"
                          />
                        ) : result.status === "pending" &&
                          result.candidates &&
                          result.candidates.length > 0 ? (
                          <CopyableText
                            text={
                              result.candidates[0]?.productId?.boxCode || ""
                            }
                            label="盒码"
                          />
                        ) : (
                          <span className="text-default-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.selectedMatch ? (
                          <ConfidenceDisplay
                            confidence={result.selectedMatch.confidence}
                            score={result.selectedMatch.score}
                          />
                        ) : result.status === "pending" &&
                          result.candidates &&
                          result.candidates.length > 0 ? (
                          <ConfidenceDisplay
                            confidenceLevel={result.candidates[0].confidence}
                            score={
                              typeof result.candidates[0].score === "object"
                                ? result.candidates[0].score?.total
                                : result.candidates[0].score
                            }
                            confidence={
                              typeof result.candidates[0].score === "number"
                                ? result.candidates[0].score
                                : undefined
                            }
                          />
                        ) : (
                          <span className="text-default-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {result.selectedMatch ? (
                          <MatchTypeChip
                            matchType={result.selectedMatch.matchType}
                            isMemoryMatch={result.selectedMatch.isMemoryMatch}
                          />
                        ) : result.status === "pending" &&
                          result.candidates &&
                          result.candidates.length > 0 ? (
                          <MatchTypeChip
                            matchType={result.candidates[0].matchType}
                            isMemoryMatch={false}
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
                          #{result.metadata.source.row}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {/* 选择匹配商品按钮 - 所有状态都可用 */}
                          <Tooltip content="选择匹配商品">
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              color="primary"
                              onClick={() => openProductSelector(result)}
                            >
                              <Settings className="h-4 w-4" />
                            </Button>
                          </Tooltip>

                          {/* 状态特定的操作按钮 */}
                          {result.status === "pending" && (
                            <>
                              <Tooltip content="确认匹配">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="success"
                                  onClick={() => confirmMatch(result._id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              <Tooltip content="拒绝匹配">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  onClick={() => rejectMatch(result._id)}
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              <Tooltip content="清空匹配商品">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="warning"
                                  onClick={() => clearMatch(result._id)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            </>
                          )}

                          {result.status === "confirmed" && (
                            <>
                              <Tooltip content="重新审核">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="warning"
                                  onClick={() => rejectMatch(result._id)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              <Tooltip content="清空匹配商品">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="secondary"
                                  onClick={() => clearMatch(result._id)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              <Tooltip content="学习到记忆库">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="success"
                                  onClick={() => learnToMemory(result._id)}
                                >
                                  <BookPlus className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            </>
                          )}

                          {result.status === "rejected" && (
                            <>
                              <Tooltip content="重新确认">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="success"
                                  onClick={() => confirmMatch(result._id)}
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                              <Tooltip content="清空重选">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="warning"
                                  onClick={() => clearMatch(result._id)}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            </>
                          )}

                          {result.status === "exception" && (
                            <Tooltip content="查看异常详情">
                              <Button
                                isIconOnly
                                size="sm"
                                variant="light"
                                color="warning"
                                onClick={() => viewExceptionDetails(result)}
                              >
                                <Info className="h-4 w-4" />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页控件 */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <p className="text-sm text-default-500">
                    显示第 {(currentPage - 1) * itemsPerPage + 1} -{" "}
                    {Math.min(
                      currentPage * itemsPerPage,
                      filteredAndSortedResults.length
                    )}{" "}
                    条， 共 {filteredAndSortedResults.length} 条记录
                  </p>
                  <Pagination
                    total={totalPages}
                    page={currentPage}
                    onChange={setCurrentPage}
                    showControls
                    size="sm"
                  />
                </div>
              )}
            </div>
          )}
        </CardBody>
      </Card>

      {/* 商品选择模态窗口 */}
      <Modal
        isOpen={productSelectModal.isOpen}
        onOpenChange={productSelectModal.onOpenChange}
        size="5xl"
        scrollBehavior="inside"
        classNames={{
          base: "max-h-[90vh] h-[90vh]",
          body: "p-0 flex flex-col h-full",
        }}
      >
        <ModalContent className="flex h-full flex-col">
          {onClose => (
            <>
              <ModalHeader className="flex-shrink-0 border-b border-divider px-6 py-4">
                <div className="flex w-full items-center justify-between">
                  <h3 className="text-xl font-bold">选择匹配商品</h3>
                </div>
              </ModalHeader>

              <div className="flex min-h-0 flex-1">
                {/* 左侧：当前匹配信息 */}
                <div className="w-80 flex-shrink-0 overflow-y-auto border-r border-divider bg-default-50/50">
                  <div className="space-y-4 p-4">
                    <h4 className="font-semibold text-default-700">
                      商品匹配信息
                    </h4>

                    {/* 原始商品信息 */}
                    {selectedRecord && (
                      <Card className="border border-primary-200 bg-primary-50">
                        <CardBody className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge color="primary" variant="flat">
                                原始商品
                              </Badge>
                              <span className="text-sm font-medium text-primary-800">
                                待匹配商品
                              </span>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-primary-900">
                                {selectedRecord.originalData.name}
                              </p>
                              <div className="mt-2 flex items-center gap-3">
                                <div className="flex items-center gap-1">
                                  <span className="text-sm text-primary-700">
                                    价格：
                                  </span>
                                  <Chip
                                    color="primary"
                                    size="sm"
                                    variant="solid"
                                  >
                                    ¥{selectedRecord.originalData.price}
                                  </Chip>
                                </div>
                                {selectedRecord.originalData.quantity && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-sm text-primary-700">
                                      数量：
                                    </span>
                                    <span className="text-sm font-medium text-primary-800">
                                      {selectedRecord.originalData.quantity}{" "}
                                      {selectedRecord.originalData.unit || "个"}
                                    </span>
                                  </div>
                                )}
                              </div>
                              {selectedRecord.originalData.supplier && (
                                <p className="mt-1 text-sm text-primary-600">
                                  供应商：{selectedRecord.originalData.supplier}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    )}

                    {/* 匹配关系指示箭头 */}
                    {selectedRecord && (
                      <div className="flex justify-center">
                        <div className="flex items-center gap-2 rounded-full bg-default-100 px-3 py-2">
                          <ArrowRight className="h-4 w-4 text-default-500" />
                          <span className="text-xs font-medium text-default-600">
                            匹配关系
                          </span>
                        </div>
                      </div>
                    )}

                    {/* 当前匹配商品信息 */}
                    {selectedRecord &&
                    (selectedRecord.selectedMatch ||
                      (selectedRecord.candidates &&
                        selectedRecord.candidates.length > 0)) ? (
                      selectedRecord.selectedMatch &&
                      selectedRecord.status === "confirmed" ? (
                        // 已确认匹配的商品 - 绿色主题
                        <Card className="border border-success-200 bg-success-50">
                          <CardBody className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge color="success" variant="flat">
                                  已确认匹配
                                </Badge>
                                <span className="text-sm font-medium text-success-800">
                                  当前匹配商品
                                </span>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-success-900">
                                  {selectedRecord.selectedMatch?.productId
                                    ?.name || "未知商品"}
                                </p>
                                <p className="mt-1 text-sm text-success-600">
                                  品牌：
                                  {selectedRecord.selectedMatch?.productId
                                    ?.brand || "未知品牌"}
                                </p>
                                <div className="mt-2 flex items-center gap-3">
                                  <Chip
                                    color="success"
                                    size="sm"
                                    variant="solid"
                                  >
                                    置信度{" "}
                                    {Math.round(
                                      (selectedRecord.selectedMatch
                                        ?.confidence || 0) * 10
                                    ) / 10}
                                    %
                                  </Chip>
                                  {selectedRecord.selectedMatch?.productId
                                    ?.pricing && (
                                    <Chip
                                      color="success"
                                      size="sm"
                                      variant="flat"
                                    >
                                      ¥
                                      {selectedRecord.selectedMatch.productId
                                        .pricing.companyPrice ||
                                        selectedRecord.selectedMatch.productId
                                          .pricing.retailPrice ||
                                        0}
                                    </Chip>
                                  )}
                                </div>
                                {/* 匹配状态指示 */}
                                <div className="mt-2 flex items-center gap-1">
                                  <CheckCircle className="h-4 w-4 text-success-600" />
                                  <span className="text-xs text-success-600">
                                    匹配已确认
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      ) : selectedRecord.selectedMatch ? (
                        // 有选中匹配但未确认 - 橙色主题（待审核）
                        <Card className="border border-warning-200 bg-warning-50">
                          <CardBody className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge color="warning" variant="flat">
                                  待审核
                                </Badge>
                                <span className="text-sm font-medium text-warning-800">
                                  当前匹配商品
                                </span>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-warning-900">
                                  {selectedRecord.selectedMatch?.productId
                                    ?.name || "未知商品"}
                                </p>
                                <p className="mt-1 text-sm text-warning-600">
                                  品牌：
                                  {selectedRecord.selectedMatch?.productId
                                    ?.brand || "未知品牌"}
                                </p>
                                <div className="mt-2 flex items-center gap-3">
                                  <Chip
                                    color="warning"
                                    size="sm"
                                    variant="solid"
                                  >
                                    置信度{" "}
                                    {Math.round(
                                      (selectedRecord.selectedMatch
                                        ?.confidence || 0) * 10
                                    ) / 10}
                                    %
                                  </Chip>
                                  {selectedRecord.selectedMatch?.productId
                                    ?.pricing && (
                                    <Chip
                                      color="warning"
                                      size="sm"
                                      variant="flat"
                                    >
                                      ¥
                                      {selectedRecord.selectedMatch.productId
                                        .pricing.companyPrice ||
                                        selectedRecord.selectedMatch.productId
                                          .pricing.retailPrice ||
                                        0}
                                    </Chip>
                                  )}
                                </div>
                                {/* 匹配状态指示 */}
                                <div className="mt-2 flex items-center gap-1">
                                  <Clock className="h-4 w-4 text-warning-600" />
                                  <span className="text-xs text-warning-600">
                                    等待审核确认
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      ) : (
                        // 只有候选商品，无选中匹配 - 橙色主题
                        <Card className="border border-warning-200 bg-warning-50">
                          <CardBody className="p-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2">
                                <Badge color="warning" variant="flat">
                                  待审核
                                </Badge>
                                <span className="text-sm font-medium text-warning-800">
                                  系统推荐商品
                                </span>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-warning-900">
                                  {selectedRecord.candidates?.[0]?.productId
                                    ?.name || "未知商品"}
                                </p>
                                <p className="mt-1 text-sm text-warning-600">
                                  品牌：
                                  {selectedRecord.candidates?.[0]?.productId
                                    ?.brand || "未知品牌"}
                                </p>
                                <div className="mt-2 flex items-center gap-3">
                                  <Chip
                                    color="warning"
                                    size="sm"
                                    variant="solid"
                                  >
                                    置信度{" "}
                                    {selectedRecord.candidates?.[0]
                                      ?.confidence || 0}
                                    %
                                  </Chip>
                                  {selectedRecord.candidates?.[0]?.productId
                                    ?.pricing && (
                                    <Chip
                                      color="warning"
                                      size="sm"
                                      variant="flat"
                                    >
                                      ¥
                                      {selectedRecord.candidates[0].productId
                                        .pricing.companyPrice ||
                                        selectedRecord.candidates[0].productId
                                          .pricing.retailPrice ||
                                        0}
                                    </Chip>
                                  )}
                                </div>
                                {/* 待审核状态指示 */}
                                <div className="mt-2 flex items-center gap-1">
                                  <Clock className="h-4 w-4 text-warning-600" />
                                  <span className="text-xs text-warning-600">
                                    待人工审核
                                  </span>
                                </div>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      )
                    ) : (
                      // 暂无匹配商品 - 灰色主题
                      <Card className="border border-default-200 bg-default-50">
                        <CardBody className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge color="default" variant="flat">
                                未匹配
                              </Badge>
                              <span className="text-sm font-medium text-default-600">
                                暂无匹配商品
                              </span>
                            </div>
                            <div className="text-center">
                              <ShoppingCart className="mx-auto mb-2 h-8 w-8 text-default-300" />
                              <p className="text-sm text-default-500">
                                请从右侧选择合适的商品进行匹配
                              </p>
                              <div className="mt-2 flex items-center justify-center gap-1">
                                <AlertTriangle className="h-4 w-4 text-default-400" />
                                <span className="text-xs text-default-400">
                                  需要人工选择
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
                    )}

                    {/* 搜索结果统计 */}
                    {availableProducts.length > 0 && (
                      <div className="rounded-lg bg-default-100 p-3">
                        <p className="mb-2 text-sm font-medium text-default-700">
                          搜索结果统计
                        </p>
                        {(() => {
                          const matchedProducts = availableProducts.filter(
                            p => p.isMatched
                          )
                          const availableCount =
                            availableProducts.length - matchedProducts.length
                          return (
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span>总计：</span>
                                <span className="font-medium">
                                  {availableProducts.length} 个
                                </span>
                              </div>
                              {matchedProducts.length > 0 && (
                                <>
                                  <div className="flex justify-between text-xs">
                                    <span>已匹配：</span>
                                    <span className="font-medium text-danger">
                                      {matchedProducts.length} 个
                                    </span>
                                  </div>
                                  {/* 已匹配商品详情 */}
                                  <div className="max-h-20 overflow-y-auto rounded bg-danger-50 p-2">
                                    <div className="mb-1 text-xs font-medium text-danger-600">
                                      已匹配商品：
                                    </div>
                                    <div className="space-y-1">
                                      {matchedProducts
                                        .slice(0, 3)
                                        .map((product, index) => (
                                          <div key={index} className="text-xs">
                                            <div className="truncate font-medium text-danger-700">
                                              {product.name}
                                            </div>
                                            {product.matchedByOriginalName && (
                                              <div className="truncate text-danger-500">
                                                →{" "}
                                                {product.matchedByOriginalName}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      {matchedProducts.length > 3 && (
                                        <div className="text-xs text-danger-500">
                                          还有 {matchedProducts.length - 3}{" "}
                                          个...
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </>
                              )}
                              <div className="flex justify-between text-xs">
                                <span>可选择：</span>
                                <span className="font-medium text-success">
                                  {availableCount} 个
                                </span>
                              </div>
                            </div>
                          )
                        })()}
                      </div>
                    )}
                  </div>
                </div>

                {/* 右侧：商品搜索和列表 */}
                <div className="flex min-w-0 flex-1 flex-col">
                  {/* 搜索框 */}
                  <div className="flex-shrink-0 border-b border-divider p-4">
                    <Input
                      ref={input => {
                        if (input && productSelectModal.isOpen) {
                          setTimeout(() => input.focus(), 100)
                        }
                      }}
                      placeholder="输入商品名称、品牌、条码或盒码进行搜索..."
                      value={productSearchTerm}
                      onChange={e => {
                        const value = e.target.value
                        setProductSearchTerm(value)
                        debouncedProductSearch(value) // 空值时不搜索
                      }}
                      variant="bordered"
                      size="lg"
                      startContent={
                        <Search className="h-4 w-4 text-default-400" />
                      }
                      description="支持商品名称、品牌、条码、盒码搜索"
                      classNames={{
                        input: "text-sm",
                        description: "text-xs text-default-400",
                      }}
                    />
                  </div>

                  {/* 商品列表 */}
                  <div className="min-h-0 flex-1 overflow-y-auto p-4">
                    {loadingProducts ? (
                      <div className="flex items-center justify-center py-12">
                        <div className="text-center">
                          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                          <p className="text-default-500">搜索商品中...</p>
                        </div>
                      </div>
                    ) : availableProducts.length === 0 ? (
                      <div className="flex items-center justify-center py-12">
                        <EmptyState
                          icon={<ShoppingCart className="h-12 w-12" />}
                          title={
                            productSearchTerm ? "没有找到商品" : "请输入搜索词"
                          }
                          description={
                            productSearchTerm
                              ? "请调整搜索条件重试"
                              : "在上方搜索框中输入商品名称、品牌、条码或盒码进行搜索"
                          }
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {availableProducts.map(product => {
                          const isMatched = product.isMatched

                          return (
                            <Card
                              key={product._id}
                              isPressable={!isMatched}
                              className={`min-w-0 transition-all duration-200 ${
                                isMatched
                                  ? "cursor-not-allowed border-default-200 bg-default-50 opacity-60"
                                  : "hover:border-primary-200 hover:bg-primary-50 hover:shadow-md"
                              }`}
                              onPress={() => {
                                if (!isMatched) {
                                  selectProduct(product._id)
                                } else {
                                  notifications.warning(
                                    "商品已被匹配",
                                    "该商品已被其他批发名匹配，无法重复选择"
                                  )
                                }
                              }}
                            >
                              <CardBody className="min-w-0 p-3">
                                <div className="min-w-0 space-y-2">
                                  {/* 顶部标签行 */}
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-1">
                                      {product.features?.hasPop && (
                                        <Chip
                                          size="sm"
                                          color="success"
                                          variant="flat"
                                        >
                                          爆珠
                                        </Chip>
                                      )}
                                      {isMatched && (
                                        <Chip
                                          size="sm"
                                          color="danger"
                                          variant="flat"
                                        >
                                          已匹配
                                        </Chip>
                                      )}
                                    </div>
                                    {/* 移除了多余的ID显示 */}
                                  </div>

                                  {/* 商品名称 */}
                                  <h4
                                    className={`line-clamp-2 text-sm font-semibold leading-tight ${
                                      isMatched
                                        ? "text-default-400"
                                        : "text-default-900"
                                    }`}
                                  >
                                    {product.name}
                                  </h4>

                                  {/* 基本信息网格 */}
                                  <div
                                    className={`grid grid-cols-2 gap-2 text-xs ${
                                      isMatched
                                        ? "text-default-300"
                                        : "text-default-600"
                                    }`}
                                  >
                                    <div>
                                      <span className="text-default-400">
                                        品牌
                                      </span>
                                      <p className="truncate font-medium">
                                        {product.brand}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-default-400">
                                        类型
                                      </span>
                                      <p className="truncate font-medium">
                                        {product.productType}
                                      </p>
                                    </div>
                                  </div>

                                  {/* 价格 */}
                                  <div
                                    className={`rounded-lg py-2 text-center ${
                                      isMatched
                                        ? "bg-default-100 text-default-400"
                                        : "bg-primary-50 text-primary-700"
                                    }`}
                                  >
                                    <span className="text-sm font-bold">
                                      ¥
                                      {product.pricing?.companyPrice ||
                                        product.pricing?.retailPrice ||
                                        0}
                                    </span>
                                  </div>

                                  {/* 条码信息（紧凑显示） */}
                                  {(product.productCode || product.boxCode) && (
                                    <div
                                      className={`space-y-1 text-xs ${
                                        isMatched
                                          ? "text-default-300"
                                          : "text-default-500"
                                      }`}
                                    >
                                      {product.productCode && (
                                        <div className="flex justify-between">
                                          <span>条码:</span>
                                          <span className="font-mono text-xs">
                                            {product.productCode.slice(-8)}
                                          </span>
                                        </div>
                                      )}
                                      {product.boxCode && (
                                        <div className="flex justify-between">
                                          <span>盒码:</span>
                                          <span className="font-mono text-xs">
                                            {product.boxCode.slice(-8)}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* 选择按钮 */}
                                  <Button
                                    size="sm"
                                    color={isMatched ? "default" : "primary"}
                                    variant={isMatched ? "flat" : "solid"}
                                    className="w-full"
                                    isDisabled={isMatched}
                                    startContent={
                                      isMatched ? (
                                        <X className="h-3 w-3" />
                                      ) : (
                                        <CheckCircle className="h-3 w-3" />
                                      )
                                    }
                                    onClick={e => {
                                      e.stopPropagation()
                                      if (!isMatched) {
                                        selectProduct(product._id)
                                      }
                                    }}
                                  >
                                    {isMatched ? "已匹配" : "选择此商品"}
                                  </Button>
                                </div>
                              </CardBody>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <ModalFooter className="flex-shrink-0 border-t border-divider px-6 py-4">
                <div className="flex w-full items-center justify-between">
                  <p className="text-sm text-default-500">
                    💡 提示：选择商品后将自动跳转到下一个待处理记录
                  </p>
                  <Button color="danger" variant="flat" onPress={onClose}>
                    取消
                  </Button>
                </div>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* 异常详情模态窗口 */}
      <Modal
        isOpen={exceptionModal.isOpen}
        onOpenChange={exceptionModal.onOpenChange}
        size="2xl"
      >
        <ModalContent>
          {onClose => (
            <>
              <ModalHeader className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <h3 className="text-lg font-semibold">异常详情</h3>
              </ModalHeader>
              <ModalBody>
                {exceptionDetails && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="mb-2 text-sm font-medium">异常原因</h4>
                      <Chip color="warning" variant="flat" size="lg">
                        {exceptionDetails.reason}
                      </Chip>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-medium">详细说明</h4>
                      <Card>
                        <CardBody>
                          <p className="text-sm text-default-600">
                            {exceptionDetails.details}
                          </p>
                        </CardBody>
                      </Card>
                    </div>

                    <div>
                      <h4 className="mb-2 text-sm font-medium">处理建议</h4>
                      <div className="space-y-2 text-sm text-default-600">
                        <p>• 可以尝试手动选择匹配商品</p>
                        <p>• 检查原始商品名称是否正确</p>
                        <p>• 如果商品确实不在库中，可以选择跳过</p>
                      </div>
                    </div>
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button
                  color="primary"
                  variant="flat"
                  startContent={<Settings className="h-4 w-4" />}
                  onPress={() => {
                    onClose()
                    if (exceptionDetails) {
                      const record = results.find(
                        r => r._id === exceptionDetails.recordId
                      )
                      if (record) {
                        openProductSelector(record)
                      }
                    }
                  }}
                >
                  手动选择商品
                </Button>
                <Button
                  color="warning"
                  variant="flat"
                  onPress={() => {
                    if (exceptionDetails) {
                      handleException(exceptionDetails.recordId, "skip")
                    }
                  }}
                >
                  跳过处理
                </Button>
                <Button color="danger" variant="flat" onPress={onClose}>
                  关闭
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  )
}

export default function EnhancedMatchingResultsPage() {
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
      <EnhancedMatchingResultsContent />
    </Suspense>
  )
}
