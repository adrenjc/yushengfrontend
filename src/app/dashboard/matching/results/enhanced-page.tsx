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
  Divider,
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
  Square,
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
  createdAt?: string
  updatedAt?: string
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
  status,
}: {
  matchType: string
  isMemoryMatch?: boolean
  status?: string
}) => {
  const config = {
    auto: { color: "primary" as const, label: "自动匹配", icon: "🤖" },
    manual: { color: "secondary" as const, label: "人工确认", icon: "👤" },
    expert: { color: "warning" as const, label: "专家审核", icon: "🎯" },
    memory: { color: "success" as const, label: "记忆匹配", icon: "🧠" },
    rejected: { color: "danger" as const, label: "已拒绝", icon: "❌" },
  }

  // 根据状态优先显示特殊状态
  if (status === "rejected") {
    // 已拒绝状态不显示匹配类型，避免重复显示
    return <span className="text-default-400">-</span>
  }

  // 如果是异常状态且没有匹配，显示异常状态
  if (status === "exception" && !matchType) {
    return (
      <div className="flex gap-1">
        <Chip variant="flat" color="warning" size="sm">
          ⚠️ 匹配异常
        </Chip>
      </div>
    )
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

// 合并码值显示组件
const CombinedCodesDisplay = ({
  productCode,
  boxCode,
}: {
  productCode?: string
  boxCode?: string
}) => {
  const notifications = useNotifications()

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notifications.success("复制成功", `${label}已复制到剪贴板`)
    } catch (error) {
      notifications.error("复制失败", "无法复制到剪贴板")
    }
  }

  // 如果两个码都没有，显示空状态
  if (!productCode && !boxCode) {
    return <span className="text-default-400">-</span>
  }

  return (
    <div className="space-y-1">
      {/* 条码 */}
      {productCode && (
        <div
          className="flex cursor-pointer items-center gap-1 rounded bg-blue-50 px-2 py-1 transition-all hover:bg-blue-100 hover:shadow-sm"
          onClick={() => copyToClipboard(productCode, "条码")}
          title="点击复制条码"
        >
          <span className="text-xs font-medium text-blue-700">条</span>
          <span className="font-mono text-xs text-blue-800">{productCode}</span>
        </div>
      )}

      {/* 盒码 */}
      {boxCode && (
        <div
          className="flex cursor-pointer items-center gap-1 rounded bg-emerald-50 px-2 py-1 transition-all hover:bg-emerald-100 hover:shadow-sm"
          onClick={() => copyToClipboard(boxCode, "盒码")}
          title="点击复制盒码"
        >
          <span className="text-xs font-medium text-emerald-700">盒</span>
          <span className="font-mono text-xs text-emerald-800">{boxCode}</span>
        </div>
      )}
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
          aria-label="保存修改"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          isIconOnly
          color="danger"
          variant="light"
          onClick={handleCancel}
          aria-label="取消修改"
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

  // 高亮相关参数
  const highlightProductId = searchParams.get("highlightProduct")
  const highlightProductName = searchParams.get("highlightProductName")
  const highlightWholesaleName = searchParams.get("highlightWholesaleName")
  const shouldAutoScroll = searchParams.get("autoScroll") === "true"
  const isFromMemory = searchParams.get("highlightMemory") === "true"

  // 基础状态
  const [results, setResults] = useState<MatchingResult[]>([])
  const [taskInfo, setTaskInfo] = useState<TaskInfo | null>(null)
  const [loading, setLoading] = useState(true)

  // 过滤和搜索状态
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [confidenceFilter, setConfidenceFilter] = useState("all")
  const [memoryFilter, setMemoryFilter] = useState("all")
  const [sortBy, setSortBy] = useState("default")

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  // 批量操作状态
  const [selectedRecords, setSelectedRecords] = useState<Set<string>>(new Set())
  const [batchMode, setBatchMode] = useState(false)

  // 高级功能状态
  const [showUserGuide, setShowUserGuide] = useState(false)
  const [autoJumpToNext, setAutoJumpToNext] = useState(false) // 默认关闭智能跳转

  // 操作体验优化状态 - 只保留高亮和自动滚动功能
  const [recentlyOperatedRecord, setRecentlyOperatedRecord] = useState<{
    recordId: string
    operation: string
    timestamp: number
  } | null>(null)

  // 高亮状态管理
  const [highlightedRecordId, setHighlightedRecordId] = useState<string | null>(
    null
  )
  const [isHighlightAnimating, setIsHighlightAnimating] = useState(false)
  // 防重复通知
  const [hasShownJumpNotification, setHasShownJumpNotification] =
    useState(false)

  // 从记忆库跳转过来时的高亮处理
  useEffect(() => {
    if (
      isFromMemory &&
      highlightProductId &&
      results.length > 0 &&
      shouldAutoScroll &&
      !hasShownJumpNotification
    ) {
      // 在内部获取过滤后的结果和通知对象
      const currentFilteredResults = filteredAndSortedResults
      const notificationsRef = notifications
      if (!currentFilteredResults.length) return
      console.log("🔍 开始查找高亮记录:", {
        highlightProductId,
        highlightProductName,
        highlightWholesaleName,
        totalResults: results.length,
        filteredResults: currentFilteredResults.length,
      })

      // 查找匹配的记录 - 优先精确匹配，避免包含关系误匹配
      let targetRecord = null

      // 1. 首先尝试通过商品ID精确匹配
      if (highlightProductId) {
        targetRecord = currentFilteredResults.find(
          record => record.selectedMatch?.productId?._id === highlightProductId
        )
      }

      // 2. 如果商品ID匹配失败，尝试批发名称精确匹配
      if (!targetRecord && highlightWholesaleName) {
        targetRecord = currentFilteredResults.find(
          record => record.originalData.name === highlightWholesaleName
        )
      }

      // 3. 最后尝试模糊匹配（仅在找不到精确匹配时）
      if (!targetRecord && highlightWholesaleName) {
        targetRecord = currentFilteredResults.find(record => {
          const recordName = record.originalData.name.toLowerCase().trim()
          const searchName = highlightWholesaleName.toLowerCase().trim()
          return (
            recordName.includes(searchName) || searchName.includes(recordName)
          )
        })
      }

      console.log("🔍 匹配结果:", {
        方式: targetRecord
          ? targetRecord.selectedMatch?.productId?._id === highlightProductId
            ? "商品ID精确匹配"
            : targetRecord.originalData.name === highlightWholesaleName
              ? "名称精确匹配"
              : "模糊匹配"
          : "未找到",
        目标记录: targetRecord
          ? {
              id: targetRecord._id,
              name: targetRecord.originalData.name,
              productId: targetRecord.selectedMatch?.productId?._id,
            }
          : null,
      })

      if (targetRecord) {
        console.log("🎯 找到目标记录，开始高亮:", {
          recordId: targetRecord._id,
          productName: targetRecord.selectedMatch?.productId?.name,
          wholesaleName: targetRecord.originalData.name,
        })

        // 设置高亮
        setHighlightedRecordId(targetRecord._id)
        setIsHighlightAnimating(true)

        // 计算目标记录在哪一页
        const recordIndex = currentFilteredResults.findIndex(
          r => r._id === targetRecord._id
        )
        const targetPage = Math.floor(recordIndex / itemsPerPage) + 1

        console.log("📄 分页信息:", {
          recordIndex,
          targetPage,
          currentPage,
          itemsPerPage,
          totalRecords: currentFilteredResults.length,
        })

        // 显示统一的跳转通知
        const isPageJump = targetPage !== currentPage
        notificationsRef.info(
          "🧠 记忆库跳转",
          `已定位到记忆匹配${isPageJump ? `并跳转到第${targetPage}页` : ""}: ${highlightProductName || "未知商品"}`
        )

        // 设置标志防止重复通知
        setHasShownJumpNotification(true)

        // 如果目标记录不在当前页，先跳转到正确的页面
        if (isPageJump) {
          console.log(`🔄 跳转到第 ${targetPage} 页`)
          setCurrentPage(targetPage)

          // 延长等待时间，确保页面切换完成
          setTimeout(() => {
            const targetElement = document.querySelector(
              `[data-record-id="${targetRecord._id}"]`
            )
            if (targetElement) {
              targetElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
              console.log("📍 自动滚动到目标位置")
            } else {
              console.warn("⚠️ 未找到目标元素，可能页面还未渲染完成")
            }
          }, 1000) // 增加等待时间到1秒
        } else {
          // 在当前页，直接滚动
          setTimeout(() => {
            const targetElement = document.querySelector(
              `[data-record-id="${targetRecord._id}"]`
            )
            if (targetElement) {
              targetElement.scrollIntoView({
                behavior: "smooth",
                block: "center",
              })
              console.log("📍 自动滚动到目标位置")
            }
          }, 500)
        }

        // 5秒后清除高亮动画
        setTimeout(() => {
          setIsHighlightAnimating(false)
        }, 5000)

        // 15秒后完全清除高亮（给页面跳转留更多时间）
        setTimeout(() => {
          setHighlightedRecordId(null)
        }, 15000)
      } else {
        console.warn("⚠️ 未找到匹配的记录:", {
          highlightProductId,
          highlightWholesaleName,
          totalResults: results.length,
        })
      }
    }
  }, [
    results,
    highlightProductId,
    highlightWholesaleName,
    isFromMemory,
    shouldAutoScroll,
    currentPage,
    itemsPerPage,
    hasShownJumpNotification,
  ])

  // 重置通知标志当URL参数变化时
  useEffect(() => {
    setHasShownJumpNotification(false)
  }, [
    highlightProductId,
    highlightWholesaleName,
    isFromMemory,
    shouldAutoScroll,
  ])

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
    // 确保 results 是数组
    if (!Array.isArray(results)) {
      console.warn("⚠️ results 不是数组，返回空数组")
      return []
    }

    console.log("🔍 开始过滤数据:", {
      totalRecords: results.length,
      searchTerm,
      statusFilter,
      confidenceFilter,
      memoryFilter,
      recentlyOperatedRecord: recentlyOperatedRecord?.recordId,
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
      if (statusFilter !== "all") {
        if (statusFilter === "unconfirmed") {
          // 未确认：显示除了已确认之外的所有状态
          if (result.status === "confirmed") {
            return false
          }
        } else if (result.status !== statusFilter) {
          return false
        }
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

    // 排序 - 根据排序方式进行排序
    if (sortBy !== "default") {
      // 只有非默认排序时才进行排序
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
          case "updated_desc":
            // 最近更新时间排序 (新→旧)
            const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime()
            const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime()
            return bTime - aTime
          case "updated_asc":
            // 最近更新时间排序 (旧→新)
            const aTimeAsc = new Date(a.updatedAt || a.createdAt || 0).getTime()
            const bTimeAsc = new Date(b.updatedAt || b.createdAt || 0).getTime()
            return aTimeAsc - bTimeAsc
          case "recent_operations":
            // 最近操作优先排序 - 按更新时间排序，不因高亮改变顺序
            const aOpTime = new Date(a.updatedAt || a.createdAt || 0).getTime()
            const bOpTime = new Date(b.updatedAt || b.createdAt || 0).getTime()
            return bOpTime - aOpTime
          default:
            return 0
        }
      })
    }
    // else: default排序时保持原始顺序，不进行任何排序

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
    if (!filteredAndSortedResults || filteredAndSortedResults.length === 0) {
      return []
    }
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredAndSortedResults.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredAndSortedResults, currentPage])

  const totalPages = Math.ceil(
    (filteredAndSortedResults?.length || 0) / itemsPerPage
  )

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

  // 记录操作信息，用于高亮和自动滚动
  const recordOperationContext = (recordId: string, operation: string) => {
    console.log(`📍 记录操作: ${operation} - ${recordId}`)
    setRecentlyOperatedRecord({
      recordId,
      operation,
      timestamp: Date.now(),
    })

    // 5秒后清理操作记录
    setTimeout(() => {
      setRecentlyOperatedRecord(prev =>
        prev?.recordId === recordId ? null : prev
      )
    }, 5000)
  }

  // 自动滚动到高亮记录
  const scrollToHighlightedRecord = useCallback((recordId: string) => {
    // 等待DOM更新完成后再滚动
    setTimeout(() => {
      const recordElement = document.querySelector(
        `[data-record-id="${recordId}"]`
      )
      if (recordElement) {
        recordElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
          inline: "nearest",
        })
        console.log(`🎯 自动滚动到记录: ${recordId}`)
      } else {
        console.warn(`⚠️ 未找到记录元素: ${recordId}`)
      }
    }, 100) // 等待渲染完成
  }, [])

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

      // 直接更新本地状态，无需重新获取数据
      setResults(prevResults =>
        prevResults.map(result =>
          result._id === recordId
            ? {
                ...result,
                originalData: {
                  ...result.originalData,
                  name: newName,
                },
                updatedAt: new Date().toISOString(),
              }
            : result
        )
      )
    } catch (error) {
      console.error("❌ 更新原始名称失败:", error)
      notifications.error("修改失败", "无法更新原始名称")
    }
  }

  // 批量选择处理
  const toggleRecordSelection = (recordId: string) => {
    try {
      setSelectedRecords(prev => {
        const newSet = new Set(prev)
        if (newSet.has(recordId)) {
          newSet.delete(recordId)
        } else {
          newSet.add(recordId)
        }
        return newSet
      })
    } catch (error) {
      console.error("❌ 切换记录选择失败:", error)
      notifications.error("操作失败", "无法切换记录选择状态")
    }
  }

  const toggleAllSelection = () => {
    console.log("🔄 toggleAllSelection 调用:", {
      paginatedResults: paginatedResults?.length,
      filteredAndSortedResults: filteredAndSortedResults?.length,
      selectedRecords: selectedRecords.size,
      loading,
    })

    if (!paginatedResults || paginatedResults.length === 0) {
      notifications.warning("没有数据", "当前页面没有可选择的记录")
      return
    }

    try {
      if (selectedRecords.size === paginatedResults.length) {
        setSelectedRecords(new Set())
      } else {
        setSelectedRecords(new Set(paginatedResults.map(r => r._id)))
      }
    } catch (error) {
      console.error("❌ toggleAllSelection 失败:", error)
      notifications.error("操作失败", "无法切换全选状态")
    }
  }

  // 全选所有已确认状态的记录
  const selectAllConfirmedRecords = () => {
    console.log("🔄 selectAllConfirmedRecords 调用:", {
      filteredAndSortedResults: filteredAndSortedResults?.length,
      selectedRecords: selectedRecords.size,
      loading,
    })

    if (!filteredAndSortedResults || filteredAndSortedResults.length === 0) {
      notifications.warning("没有数据", "当前没有可选择的记录")
      return
    }

    const confirmedRecords = filteredAndSortedResults.filter(
      r => r.status === "confirmed"
    )

    if (confirmedRecords.length === 0) {
      notifications.warning("没有已确认记录", "当前筛选结果中没有已确认的记录")
      return
    }

    setSelectedRecords(new Set(confirmedRecords.map(r => r._id)))

    notifications.info(
      "全选已确认记录",
      `已选择 ${confirmedRecords.length} 条已确认的记录`
    )
  }

  // 全选当前筛选结果的所有记录
  const selectAllFilteredRecords = () => {
    console.log("🔄 selectAllFilteredRecords 调用:", {
      filteredAndSortedResults: filteredAndSortedResults?.length,
      selectedRecords: selectedRecords.size,
      loading,
    })

    if (!filteredAndSortedResults || filteredAndSortedResults.length === 0) {
      notifications.warning("没有数据", "当前没有可选择的记录")
      return
    }

    setSelectedRecords(new Set(filteredAndSortedResults.map(r => r._id)))

    notifications.info(
      "全选筛选结果",
      `已选择当前筛选结果的所有 ${filteredAndSortedResults.length} 条记录`
    )
  }

  // 清空所有选择
  const clearAllSelection = () => {
    setSelectedRecords(new Set())
  }

  // 确认匹配
  const confirmMatch = async (recordId: string) => {
    try {
      console.log("🔄 开始确认匹配:", recordId)

      // 找到对应的记录，获取productId
      if (!filteredAndSortedResults || filteredAndSortedResults.length === 0) {
        throw new Error("没有可用的匹配记录")
      }

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

      // 直接更新本地状态，无需重新获取数据
      setResults(prevResults =>
        prevResults.map(result =>
          result._id === recordId
            ? {
                ...result,
                status: "confirmed" as const,
                updatedAt: new Date().toISOString(),
              }
            : result
        )
      )

      // 智能跳转（如果开启）
      if (autoJumpToNext) {
        setTimeout(() => {
          jumpToNextPending(recordId)
        }, 100) // 减少等待时间，因为不需要等待网络请求
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

      // 直接更新本地状态，无需重新获取数据
      setResults(prevResults =>
        prevResults.map(result =>
          result._id === recordId
            ? {
                ...result,
                status: "rejected" as const,
                selectedMatch: undefined, // 清空匹配商品
                updatedAt: new Date().toISOString(),
              }
            : result
        )
      )

      // 设置操作记录信息，触发高亮（但不滚动，保持当前位置）
      recordOperationContext(recordId, "拒绝匹配")
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
      notifications.success("重新匹配成功", "匹配商品已清空")

      // 直接更新本地状态，无需重新获取数据
      setResults(prevResults =>
        prevResults.map(result =>
          result._id === recordId
            ? {
                ...result,
                status: "pending" as const,
                selectedMatch: undefined, // 清空匹配商品
                updatedAt: new Date().toISOString(),
              }
            : result
        )
      )

      // 设置操作记录信息，触发高亮（但不滚动，保持当前位置）
      recordOperationContext(recordId, "重新匹配")
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

  // 批量学习到记忆库（支持分批处理）
  const batchLearnToMemory = async () => {
    if (selectedRecords.size === 0) return

    const recordIds = Array.from(selectedRecords)
    const totalRecords = recordIds.length
    const batchSize = 100 // 后端限制每批最多100条

    console.log(`🧠 开始批量学习 ${totalRecords} 条记录到记忆库`)

    try {
      // 如果记录数量超过批次大小，需要分批处理
      if (totalRecords > batchSize) {
        notifications.info(
          "分批处理中",
          `记录数量较多（${totalRecords}条），将分批处理，每批${batchSize}条`
        )
      }

      let successCount = 0
      let failedCount = 0
      const errors: string[] = []

      // 分批处理
      for (let i = 0; i < totalRecords; i += batchSize) {
        const batchRecordIds = recordIds.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(totalRecords / batchSize)

        console.log(
          `🔄 处理第 ${batchNumber}/${totalBatches} 批，${batchRecordIds.length} 条记录`
        )

        try {
          const response = await fetch(
            buildApiUrl("/matching/records/batch-learn"),
            {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({
                recordIds: batchRecordIds,
                note: `批量手动学习 (第${batchNumber}/${totalBatches}批)`,
              }),
            }
          )

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || `HTTP ${response.status}`)
          }

          const result = await response.json()
          successCount += batchRecordIds.length
          console.log(`✅ 第 ${batchNumber} 批处理成功`)

          // 如果是多批处理，显示进度
          if (totalBatches > 1) {
            notifications.info(
              "处理进度",
              `第 ${batchNumber}/${totalBatches} 批完成 (${successCount}/${totalRecords})`
            )
          }
        } catch (batchError) {
          console.error(`❌ 第 ${batchNumber} 批处理失败:`, batchError)
          failedCount += batchRecordIds.length
          errors.push(
            `第${batchNumber}批: ${batchError instanceof Error ? batchError.message : "未知错误"}`
          )
        }

        // 批次间稍微延迟，避免服务器压力过大
        if (i + batchSize < totalRecords) {
          await new Promise(resolve => setTimeout(resolve, 500))
        }
      }

      // 处理完成，显示总结
      if (failedCount === 0) {
        notifications.success(
          "批量学习完成",
          `成功学习 ${successCount} 条记录到记忆库`
        )
        setSelectedRecords(new Set())
      } else if (successCount > 0) {
        notifications.warning(
          "部分成功",
          `成功: ${successCount}条，失败: ${failedCount}条。错误详情: ${errors.join("; ")}`
        )
        // 清除成功处理的记录选择状态
        setSelectedRecords(new Set())
      } else {
        notifications.error(
          "批量学习失败",
          `所有记录都处理失败。错误详情: ${errors.join("; ")}`
        )
      }
    } catch (error) {
      console.error("❌ 批量学习过程失败:", error)
      notifications.error(
        "处理失败",
        `批量学习过程出现异常: ${error instanceof Error ? error.message : "未知错误"}`
      )
    }
  }

  // 批量确认（支持分批处理）
  const batchConfirm = async () => {
    if (selectedRecords.size === 0) return

    const recordIds = Array.from(selectedRecords)
    const totalRecords = recordIds.length
    const batchSize = 100 // 后端限制每批最多100条

    console.log(`✅ 开始批量确认 ${totalRecords} 条记录`)

    try {
      // 如果记录数量超过批次大小，需要分批处理
      if (totalRecords > batchSize) {
        notifications.info(
          "分批处理中",
          `记录数量较多（${totalRecords}条），将分批确认，每批${batchSize}条`
        )
      }

      let successCount = 0
      let failedCount = 0
      const errors: string[] = []

      // 分批处理
      for (let i = 0; i < totalRecords; i += batchSize) {
        const batchRecordIds = recordIds.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(totalRecords / batchSize)

        console.log(
          `🔄 确认第 ${batchNumber}/${totalBatches} 批，${batchRecordIds.length} 条记录`
        )

        try {
          // 为每个记录找到对应的productId
          const recordsWithProductIds = batchRecordIds.map(recordId => {
            if (!paginatedResults || paginatedResults.length === 0) {
              throw new Error("没有可用的记录数据")
            }

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
                recordIds: batchRecordIds,
                productIds: recordsWithProductIds,
                action: "confirm",
              }),
            }
          )

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || `HTTP ${response.status}`)
          }

          successCount += batchRecordIds.length
          console.log(`✅ 第 ${batchNumber} 批确认成功`)

          // 如果是多批处理，显示进度
          if (totalBatches > 1) {
            notifications.info(
              "确认进度",
              `第 ${batchNumber}/${totalBatches} 批完成 (${successCount}/${totalRecords})`
            )
          }
        } catch (batchError) {
          console.error(`❌ 第 ${batchNumber} 批确认失败:`, batchError)
          failedCount += batchRecordIds.length
          errors.push(
            `第${batchNumber}批: ${batchError instanceof Error ? batchError.message : "未知错误"}`
          )
        }

        // 批次间稍微延迟，避免服务器压力过大
        if (i + batchSize < totalRecords) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      // 处理完成，显示总结
      if (failedCount === 0) {
        notifications.success("批量确认完成", `成功确认 ${successCount} 条记录`)
        setSelectedRecords(new Set())
        await fetchResults()
      } else if (successCount > 0) {
        notifications.warning(
          "部分成功",
          `成功: ${successCount}条，失败: ${failedCount}条。错误详情: ${errors.join("; ")}`
        )
        // 清除成功处理的记录选择状态
        setSelectedRecords(new Set())
        await fetchResults()
      } else {
        notifications.error(
          "批量确认失败",
          `所有记录都确认失败。错误详情: ${errors.join("; ")}`
        )
      }
    } catch (error) {
      console.error("❌ 批量确认过程失败:", error)
      notifications.error(
        "处理失败",
        `批量确认过程出现异常: ${error instanceof Error ? error.message : "未知错误"}`
      )
    }
  }

  // 批量拒绝（支持分批处理）
  const batchReject = async () => {
    if (selectedRecords.size === 0) return

    const recordIds = Array.from(selectedRecords)
    const totalRecords = recordIds.length
    const batchSize = 100 // 后端限制每批最多100条

    console.log(`❌ 开始批量拒绝 ${totalRecords} 条记录`)

    try {
      // 如果记录数量超过批次大小，需要分批处理
      if (totalRecords > batchSize) {
        notifications.info(
          "分批处理中",
          `记录数量较多（${totalRecords}条），将分批拒绝，每批${batchSize}条`
        )
      }

      let successCount = 0
      let failedCount = 0
      const errors: string[] = []

      // 分批处理
      for (let i = 0; i < totalRecords; i += batchSize) {
        const batchRecordIds = recordIds.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(totalRecords / batchSize)

        console.log(
          `🔄 拒绝第 ${batchNumber}/${totalBatches} 批，${batchRecordIds.length} 条记录`
        )

        try {
          const response = await fetch(
            buildApiUrl("/matching/records/batch-review"),
            {
              method: "POST",
              headers: getAuthHeaders(),
              body: JSON.stringify({
                recordIds: batchRecordIds,
                action: "reject",
              }),
            }
          )

          if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || `HTTP ${response.status}`)
          }

          successCount += batchRecordIds.length
          console.log(`✅ 第 ${batchNumber} 批拒绝成功`)

          // 如果是多批处理，显示进度
          if (totalBatches > 1) {
            notifications.info(
              "拒绝进度",
              `第 ${batchNumber}/${totalBatches} 批完成 (${successCount}/${totalRecords})`
            )
          }
        } catch (batchError) {
          console.error(`❌ 第 ${batchNumber} 批拒绝失败:`, batchError)
          failedCount += batchRecordIds.length
          errors.push(
            `第${batchNumber}批: ${batchError instanceof Error ? batchError.message : "未知错误"}`
          )
        }

        // 批次间稍微延迟，避免服务器压力过大
        if (i + batchSize < totalRecords) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      // 处理完成，显示总结
      if (failedCount === 0) {
        notifications.success("批量拒绝完成", `成功拒绝 ${successCount} 条记录`)
        setSelectedRecords(new Set())
        await fetchResults()
      } else if (successCount > 0) {
        notifications.warning(
          "部分成功",
          `成功: ${successCount}条，失败: ${failedCount}条。错误详情: ${errors.join("; ")}`
        )
        // 清除成功处理的记录选择状态
        setSelectedRecords(new Set())
        await fetchResults()
      } else {
        notifications.error(
          "批量拒绝失败",
          `所有记录都拒绝失败。错误详情: ${errors.join("; ")}`
        )
      }
    } catch (error) {
      console.error("❌ 批量拒绝过程失败:", error)
      notifications.error(
        "处理失败",
        `批量拒绝过程出现异常: ${error instanceof Error ? error.message : "未知错误"}`
      )
    }
  }

  // 智能批量确认（只确认高置信度的，支持分批处理）
  const smartBatchConfirm = async () => {
    if (selectedRecords.size === 0) return

    if (!paginatedResults || paginatedResults.length === 0) {
      notifications.warning("没有数据", "当前没有可确认的记录")
      return
    }

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

    const totalRecords = highConfidenceRecords.length
    const batchSize = 100 // 后端限制每批最多100条

    console.log(`⚡ 开始智能批量确认 ${totalRecords} 条高置信度记录`)

    try {
      // 如果记录数量超过批次大小，需要分批处理
      if (totalRecords > batchSize) {
        notifications.info(
          "分批处理中",
          `高置信度记录较多（${totalRecords}条），将分批确认，每批${batchSize}条`
        )
      }

      let successCount = 0
      let failedCount = 0
      const errors: string[] = []

      // 分批处理
      for (let i = 0; i < totalRecords; i += batchSize) {
        const batchRecords = highConfidenceRecords.slice(i, i + batchSize)
        const batchNumber = Math.floor(i / batchSize) + 1
        const totalBatches = Math.ceil(totalRecords / batchSize)

        console.log(
          `🔄 智能确认第 ${batchNumber}/${totalBatches} 批，${batchRecords.length} 条记录`
        )

        try {
          const recordIds = batchRecords.map(r => r._id)
          const productIds = batchRecords.map(record => {
            if (record.selectedMatch?.productId?._id) {
              return record.selectedMatch.productId._id
            } else if (
              record.candidates &&
              record.candidates.length > 0 &&
              record.candidates[0]?.productId?._id
            ) {
              return record.candidates[0].productId._id
            } else {
              throw new Error(
                `记录 ${record.originalData?.name} 没有可确认的商品`
              )
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

          successCount += batchRecords.length
          console.log(`✅ 第 ${batchNumber} 批智能确认成功`)

          // 如果是多批处理，显示进度
          if (totalBatches > 1) {
            notifications.info(
              "智能确认进度",
              `第 ${batchNumber}/${totalBatches} 批完成 (${successCount}/${totalRecords})`
            )
          }
        } catch (batchError) {
          console.error(`❌ 第 ${batchNumber} 批智能确认失败:`, batchError)
          failedCount += batchRecords.length
          errors.push(
            `第${batchNumber}批: ${batchError instanceof Error ? batchError.message : "未知错误"}`
          )
        }

        // 批次间稍微延迟，避免服务器压力过大
        if (i + batchSize < totalRecords) {
          await new Promise(resolve => setTimeout(resolve, 300))
        }
      }

      // 处理完成，显示总结
      if (failedCount === 0) {
        notifications.success(
          "智能确认完成",
          `成功确认 ${successCount} 条高置信度记录`
        )
        setSelectedRecords(new Set())
        await fetchResults()
      } else if (successCount > 0) {
        notifications.warning(
          "部分成功",
          `成功: ${successCount}条，失败: ${failedCount}条。错误详情: ${errors.join("; ")}`
        )
        // 清除成功处理的记录选择状态
        setSelectedRecords(new Set())
        await fetchResults()
      } else {
        notifications.error(
          "智能确认失败",
          `所有记录都确认失败。错误详情: ${errors.join("; ")}`
        )
      }
    } catch (error) {
      console.error("❌ 智能确认过程失败:", error)
      notifications.error(
        "处理失败",
        `智能确认过程出现异常: ${error instanceof Error ? error.message : "未知错误"}`
      )
    }
  }

  // 获取可选商品列表
  const fetchAvailableProducts = useCallback(
    async (searchTerm: string = "") => {
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
            throw new Error(
              `获取模板选项失败: HTTP ${templatesResponse.status}`
            )
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

        // 计算每个商品的匹配状态，排除已拒绝的记录
        const productsWithMatchStatus = products.map((product: any) => {
          // 检查这个商品是否被任何有效记录匹配（排除已拒绝状态）
          const isMatched = results.some(
            (result: MatchingResult) =>
              result.status !== "rejected" && // 排除已拒绝的记录
              result.selectedMatch?.productId?._id === product._id
          )

          return {
            ...product,
            isMatched,
          }
        })

        setAvailableProducts(productsWithMatchStatus)

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
    },
    [taskInfo, results, notifications]
  )

  // 刷新商品匹配状态
  const refreshProductMatchStatus = useCallback(() => {
    if (availableProducts.length > 0) {
      // 重新计算每个商品的匹配状态
      const updatedProducts = availableProducts.map((product: any) => {
        // 检查这个商品是否被任何有效记录匹配（排除已拒绝状态）
        const isMatched = results.some(
          (result: MatchingResult) =>
            result.status !== "rejected" && // 排除已拒绝的记录
            result.selectedMatch?.productId?._id === product._id
        )

        return {
          ...product,
          isMatched,
        }
      })

      setAvailableProducts(updatedProducts)
    }
  }, [availableProducts, results])

  // 监听results变化，自动刷新商品匹配状态
  useEffect(() => {
    refreshProductMatchStatus()
  }, [results, refreshProductMatchStatus])

  // 防抖搜索商品
  const debouncedProductSearch = useCallback(
    (searchTerm: string) => {
      // 清除之前的定时器
      if (productSearchTimeoutRef.current) {
        clearTimeout(productSearchTimeoutRef.current)
        productSearchTimeoutRef.current = null
      }

      console.log("🔍 防抖搜索被调用:", searchTerm)

      // 如果搜索词为空，直接清空商品列表
      if (!searchTerm || !searchTerm.trim()) {
        console.log("🧹 搜索词为空，清空商品列表")
        setAvailableProducts([])
        setLoadingProducts(false)
        return
      }

      // 显示搜索状态
      setLoadingProducts(true)

      // 设置新的定时器 - 800ms防抖延迟
      productSearchTimeoutRef.current = setTimeout(() => {
        console.log("⏰ 防抖延迟结束，开始搜索:", searchTerm)
        fetchAvailableProducts(searchTerm)
      }, 800) // 800ms 防抖延迟
    },
    [fetchAvailableProducts]
  )

  // 打开商品选择窗口
  const openProductSelector = async (record: MatchingResult) => {
    console.log("🚀 打开商品选择弹窗:", record.originalData.name)

    // 清除防抖定时器，确保没有未完成的搜索请求
    if (productSearchTimeoutRef.current) {
      clearTimeout(productSearchTimeoutRef.current)
      productSearchTimeoutRef.current = null
      console.log("⏰ 清除了防抖定时器")
    }

    // 强制清空所有搜索相关状态
    console.log("🧹 清空所有搜索状态")
    setProductSearchTerm("")
    setAvailableProducts([]) // 清空商品列表
    setLoadingProducts(false) // 重置加载状态

    // 强制调用防抖搜索函数清空结果
    debouncedProductSearch("")

    setSelectedRecord(record)
    productSelectModal.onOpen()

    // 延迟聚焦搜索框，确保Modal已打开并且搜索结果已清空
    setTimeout(() => {
      console.log("🔄 延迟清空: 再次确保搜索结果被清空")
      // 再次确保搜索结果被清空
      setAvailableProducts([])
      setLoadingProducts(false)

      // 再次强制调用防抖搜索函数清空结果
      debouncedProductSearch("")

      const searchInput = document.querySelector(
        'input[placeholder*="输入商品名称"]'
      ) as HTMLInputElement
      if (searchInput) {
        searchInput.value = "" // 确保输入框也是空的
        searchInput.focus()
        console.log("🎯 已聚焦搜索框")
      }
    }, 300)
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

      // 获取选中的产品信息
      const selectedProduct = availableProducts.find(p => p._id === productId)

      // 直接更新本地状态，无需重新获取数据
      setResults(prevResults =>
        prevResults.map(result =>
          result._id === currentRecordId
            ? {
                ...result,
                status: "confirmed" as const,
                selectedMatch: {
                  productId: selectedProduct,
                  confidence: 100, // 手动选择设为100%置信度
                  score: 100,
                  matchType: "manual",
                  isMemoryMatch: false,
                },
                updatedAt: new Date().toISOString(),
              }
            : result
        )
      )

      // 智能跳转（如果开启）
      if (autoJumpToNext) {
        // 直接基于当前筛选结果查找下一个待处理记录（排除当前已处理的记录）
        setTimeout(() => {
          const updatedPendingRecords = filteredAndSortedResults.filter(
            r =>
              (r.status === "pending" || r.status === "exception") &&
              r._id !== currentRecordId
          )

          if (updatedPendingRecords.length === 0) {
            // 没有更多待处理记录，关闭弹窗
            productSelectModal.onClose()
            setSelectedRecord(null)
            notifications.success("处理完成", "所有记录都已处理完成！")
            return
          }

          // 取第一个待处理记录
          const nextRecord = updatedPendingRecords[0]

          if (nextRecord) {
            console.log(
              "🔄 智能跳转: 开始切换到下一个记录",
              nextRecord.originalData.name
            )

            // 清除防抖定时器，确保没有未完成的搜索请求
            if (productSearchTimeoutRef.current) {
              clearTimeout(productSearchTimeoutRef.current)
              productSearchTimeoutRef.current = null
              console.log("⏰ 清除了防抖定时器")
            }

            // 强制立即清空所有搜索相关状态
            console.log("🧹 开始清空搜索状态")
            setProductSearchTerm("")
            setAvailableProducts([])
            setLoadingProducts(false)

            // 强制调用防抖搜索函数清空结果
            debouncedProductSearch("")

            // 先切换到下一个记录
            setSelectedRecord(nextRecord)
            console.log("✅ 已切换到新记录")

            // 延迟聚焦搜索框，确保Modal内容已更新并且搜索结果已清空
            setTimeout(() => {
              console.log("🔄 延迟清空: 再次确保搜索结果被清空")
              // 再次确保搜索结果被清空
              setAvailableProducts([])
              setLoadingProducts(false)

              // 再次强制调用防抖搜索函数清空结果
              debouncedProductSearch("")

              const searchInput = document.querySelector(
                'input[placeholder*="输入商品名称"]'
              ) as HTMLInputElement
              if (searchInput) {
                searchInput.value = "" // 确保输入框也是空的
                searchInput.focus()
                console.log("🎯 已聚焦搜索框")
              }
            }, 300)

            // 处理列表导航
            setTimeout(() => {
              const totalIndex = filteredAndSortedResults.findIndex(
                r => r._id === nextRecord._id
              )

              if (totalIndex !== -1) {
                const targetPage = Math.floor(totalIndex / itemsPerPage) + 1

                if (targetPage !== currentPage) {
                  // 需要跳转页面
                  setCurrentPage(targetPage)
                  notifications.info(
                    "智能跳转",
                    `已跳转到第${targetPage}页: ${nextRecord.originalData.name}`
                  )

                  // 页面跳转后再设置高亮
                  setTimeout(() => {
                    recordOperationContext(nextRecord._id, "智能导航")
                  }, 200)
                } else {
                  // 在当前页，直接高亮
                  recordOperationContext(nextRecord._id, "智能导航")
                  notifications.info(
                    "智能定位",
                    `已定位到: ${nextRecord.originalData.name}`
                  )
                }
              }
            }, 100) // 减少延迟
          }
        }, 100) // 减少延迟，无需等待网络请求
      } else {
        // 如果没有开启智能跳转，按原来的逻辑关闭弹窗
        productSelectModal.onClose()
        setSelectedRecord(null)
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

  // 智能跳转到下一个待处理记录
  const jumpToNextPending = (currentRecordId?: string) => {
    if (!filteredAndSortedResults || filteredAndSortedResults.length === 0) {
      notifications.warning("没有数据", "当前没有可处理的记录")
      return
    }

    const pendingRecords = filteredAndSortedResults.filter(
      r => r.status === "pending" || r.status === "exception"
    )

    if (pendingRecords.length === 0) {
      notifications.success("处理完成", "没有更多待处理的记录")
      return
    }

    let nextRecord = null

    if (currentRecordId) {
      // 如果提供了当前记录ID，找下一个
      const currentIndex = pendingRecords.findIndex(
        r => r._id === currentRecordId
      )
      if (currentIndex >= 0 && currentIndex < pendingRecords.length - 1) {
        nextRecord = pendingRecords[currentIndex + 1]
      } else if (pendingRecords.length > 1) {
        // 如果是最后一个，回到第一个
        nextRecord =
          pendingRecords.find(r => r._id !== currentRecordId) ||
          pendingRecords[0]
      }
    } else {
      // 如果没有提供当前记录ID，直接取第一个待处理记录
      nextRecord = pendingRecords[0]
    }

    if (nextRecord) {
      // 找到该记录在当前排序下的真实位置
      const totalIndex = filteredAndSortedResults.findIndex(
        r => r._id === nextRecord._id
      )

      if (totalIndex !== -1) {
        const targetPage = Math.floor(totalIndex / itemsPerPage) + 1

        if (targetPage !== currentPage) {
          // 需要跳转页面
          setCurrentPage(targetPage)
          notifications.info(
            "手动跳转",
            `已跳转到第${targetPage}页: ${nextRecord.originalData.name}`
          )

          // 页面跳转后再设置高亮和滚动
          setTimeout(() => {
            recordOperationContext(nextRecord._id, "手动导航")
          }, 200)
        } else {
          // 在当前页，直接高亮和滚动到真实位置
          recordOperationContext(nextRecord._id, "手动导航")
          notifications.info(
            "手动定位",
            `已定位到: ${nextRecord.originalData.name}`
          )
        }
      }
    } else {
      notifications.success("处理完成", "所有记录都已处理完成！")
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
    const filteredTotal = filteredAndSortedResults?.length || 0
    const filteredConfirmed =
      filteredAndSortedResults?.filter(r => r.status === "confirmed")?.length ||
      0
    const filteredReviewing =
      filteredAndSortedResults?.filter(r => r.status === "pending")?.length || 0
    const filteredException =
      filteredAndSortedResults?.filter(r => r.status === "exception")?.length ||
      0
    const filteredRejected =
      filteredAndSortedResults?.filter(r => r.status === "rejected")?.length ||
      0
    const filteredMemoryMatches =
      filteredAndSortedResults?.filter(r => r.selectedMatch?.isMemoryMatch)
        ?.length || 0

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

  // 初始化数据加载
  useEffect(() => {
    if (taskId) {
      fetchResults()
    }
  }, [taskId]) // 只依赖taskId，避免无限循环

  useEffect(() => {
    setCurrentPage(1) // 重置页码当过滤条件变化时
  }, [searchTerm, statusFilter, confidenceFilter, memoryFilter])

  // 监听数据更新，自动滚动到高亮记录
  useEffect(() => {
    if (recentlyOperatedRecord && filteredAndSortedResults.length > 0) {
      // 检查记录是否在当前筛选结果中
      const recordExists = filteredAndSortedResults.some(
        r => r._id === recentlyOperatedRecord.recordId
      )

      if (recordExists) {
        // 自动滚动到高亮记录
        scrollToHighlightedRecord(recentlyOperatedRecord.recordId)
      } else {
        console.log(
          `⚠️ 操作的记录不在当前筛选结果中: ${recentlyOperatedRecord.recordId}`
        )
      }
    }
  }, [
    filteredAndSortedResults,
    recentlyOperatedRecord,
    scrollToHighlightedRecord,
  ])

  // 管理操作记录的高亮状态清理
  useEffect(() => {
    if (!recentlyOperatedRecord) return

    const timeSinceOperation = Date.now() - recentlyOperatedRecord.timestamp
    const remainingTime = 5000 - timeSinceOperation

    if (remainingTime > 0) {
      const timeout = setTimeout(() => {
        setRecentlyOperatedRecord(null)
        console.log("💫 操作记录高亮已自动清除")
      }, remainingTime)

      return () => clearTimeout(timeout)
    } else {
      // 如果时间已经过了，立即清理
      setRecentlyOperatedRecord(null)
    }
  }, [recentlyOperatedRecord])

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
                      setSortBy("recent_operations")
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
            variant={autoJumpToNext ? "solid" : "flat"}
            size="sm"
            color={autoJumpToNext ? "success" : "default"}
            startContent={
              autoJumpToNext ? (
                <ArrowRight className="h-4 w-4" />
              ) : (
                <Target className="h-4 w-4" />
              )
            }
            onClick={() => setAutoJumpToNext(!autoJumpToNext)}
            className={
              autoJumpToNext
                ? "bg-success-500 text-white shadow-md"
                : "text-default-600 hover:bg-default-100"
            }
          >
            {autoJumpToNext ? "智能跳转 已开启" : "智能跳转"}
          </Button>
          <Button
            variant="flat"
            size="sm"
            color="secondary"
            startContent={<ArrowRight className="h-4 w-4" />}
            onClick={() => jumpToNextPending()}
            isDisabled={
              !filteredAndSortedResults ||
              filteredAndSortedResults.filter(
                r => r.status === "pending" || r.status === "exception"
              ).length === 0
            }
          >
            下一个
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
                    • <strong>📝 重新处理按钮：</strong>
                    对已确认记录进行重新匹配或拒绝操作
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
              <div>
                <h4 className="mb-2 text-sm font-medium text-success">
                  🎯 智能跳转功能
                </h4>
                <ul className="space-y-1 text-sm text-default-600">
                  <li>
                    • <strong>🔀 智能跳转开关：</strong>
                    控制是否自动跳转到下一个待处理记录
                  </li>
                  <li>
                    • <strong>🎯 下一个按钮：</strong>手动跳转到下一个待处理记录
                  </li>
                  <li>
                    • <strong>✨ 增强高亮：</strong>
                    跳转后记录会有绿色渐变高亮效果
                  </li>
                  <li>
                    • <strong>📍 自动聚焦：</strong>画面自动滚动到目标记录位置
                  </li>
                  <li>
                    • <strong>⏱️ 智能提醒：</strong>高亮效果持续5秒后自动消失
                  </li>
                </ul>
              </div>
            </div>
            <div className="border-t pt-3">
              <h4 className="mb-2 text-sm font-medium text-primary">
                💡 最佳实践建议
              </h4>
              <div className="grid gap-2 text-sm text-default-600 md:grid-cols-3">
                <div>• 开启智能跳转提高处理效率</div>
                <div>• 先处理高置信度(绿色)记录</div>
                <div>• 使用智能确认批量处理</div>
                <div>• 优先处理异常状态记录</div>
                <div>• 利用搜索快速定位问题</div>
                <div>• 善用商品选择功能重新匹配</div>
                <div>• 及时修正错误的原始名称</div>
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
              {batchMode && (
                <div className="flex items-center gap-2 text-sm text-warning-600">
                  <Info className="h-4 w-4" />
                  <span>开启批量模式后，可使用全选功能选择不同范围的记录</span>
                </div>
              )}
            </div>

            {/* 筛选器 */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Select
                label="状态"
                size="sm"
                selectedKeys={statusFilter ? [statusFilter] : []}
                onChange={e => {
                  const newValue = e.target.value
                  // 如果新值为空或未定义，保持当前状态不变
                  if (newValue && newValue.trim() !== "") {
                    setStatusFilter(newValue)
                  }
                }}
              >
                <SelectItem key="all">全部状态</SelectItem>
                <SelectItem key="unconfirmed">未确认</SelectItem>
                <SelectItem key="confirmed">已确认</SelectItem>
                <SelectItem key="pending">待审核</SelectItem>
                <SelectItem key="exception">异常</SelectItem>
                <SelectItem key="rejected">已拒绝</SelectItem>
              </Select>

              <Select
                label="置信度"
                size="sm"
                selectedKeys={confidenceFilter ? [confidenceFilter] : []}
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
                selectedKeys={memoryFilter ? [memoryFilter] : []}
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
                selectedKeys={sortBy ? [sortBy] : []}
                onChange={e => {
                  const newValue = e.target.value
                  // 如果新值为空或未定义，保持当前状态不变
                  if (newValue && newValue.trim() !== "") {
                    setSortBy(newValue)
                  }
                }}
              >
                <SelectItem key="default">默认排序</SelectItem>
                <SelectItem key="recent_operations">最近操作</SelectItem>
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
                    setSortBy("default")
                  }}
                >
                  重置筛选
                </Button>
              </div>
            </div>

            {/* 批量操作工具栏 */}
            {batchMode && (
              <div className="flex items-center gap-3 rounded-lg border border-warning-200 bg-warning-50 p-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    isSelected={
                      paginatedResults?.length > 0 &&
                      selectedRecords.size === paginatedResults.length
                    }
                    isIndeterminate={
                      paginatedResults?.length > 0 &&
                      selectedRecords.size > 0 &&
                      selectedRecords.size < paginatedResults.length
                    }
                    onChange={toggleAllSelection}
                  />
                  <Dropdown>
                    <DropdownTrigger>
                      <Button
                        size="sm"
                        variant="flat"
                        color="warning"
                        endContent={<ChevronDown className="h-3 w-3" />}
                      >
                        全选选项
                      </Button>
                    </DropdownTrigger>
                    <DropdownMenu
                      onAction={key => {
                        try {
                          switch (key) {
                            case "current_page":
                              toggleAllSelection()
                              break
                            case "all_confirmed":
                              selectAllConfirmedRecords()
                              break
                            case "all_filtered":
                              selectAllFilteredRecords()
                              break
                            case "clear_all":
                              clearAllSelection()
                              break
                            default:
                              console.warn("未知的全选操作:", key)
                          }
                        } catch (error) {
                          console.error("全选操作失败:", error)
                          notifications.error(
                            "操作失败",
                            "全选操作执行失败，请稍后重试"
                          )
                        }
                      }}
                    >
                      <DropdownItem
                        key="current_page"
                        startContent={<Square className="h-4 w-4" />}
                        description={`选择当前页面的 ${paginatedResults?.length || 0} 条记录`}
                      >
                        当前页全选
                      </DropdownItem>
                      <DropdownItem
                        key="all_confirmed"
                        startContent={<CheckCircle className="h-4 w-4" />}
                        description={`选择所有已确认的记录 (共 ${filteredAndSortedResults?.filter(r => r.status === "confirmed")?.length || 0} 条)`}
                        color="success"
                      >
                        全选已确认
                      </DropdownItem>
                      <DropdownItem
                        key="all_filtered"
                        startContent={<Target className="h-4 w-4" />}
                        description={`选择当前筛选结果的所有 ${filteredAndSortedResults?.length || 0} 条记录`}
                        color="primary"
                      >
                        全选筛选结果
                      </DropdownItem>
                      <DropdownItem
                        key="divider"
                        isDisabled
                        className="h-px bg-divider"
                      />
                      <DropdownItem
                        key="clear_all"
                        startContent={<X className="h-4 w-4" />}
                        description="清空所有选择"
                        color="danger"
                      >
                        清空选择
                      </DropdownItem>
                    </DropdownMenu>
                  </Dropdown>
                </div>
                <span className="text-sm">
                  已选择 {selectedRecords.size} 条记录
                  {(filteredAndSortedResults?.length || 0) > 0 && (
                    <span className="text-default-500">
                      {" "}
                      / 共 {filteredAndSortedResults?.length || 0} 条
                    </span>
                  )}
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
                    variant="solid"
                    isDisabled={selectedRecords.size === 0}
                    onClick={batchLearnToMemory}
                    startContent={<BookPlus className="h-4 w-4" />}
                    className="border-2 border-secondary-300 font-medium"
                  >
                    🧠 手动学习到记忆库 ({selectedRecords.size})
                  </Button>
                  <Button size="sm" variant="flat" onClick={clearAllSelection}>
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
          ) : (filteredAndSortedResults?.length || 0) === 0 ? (
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
                          paginatedResults?.length > 0 &&
                          selectedRecords.size === paginatedResults.length
                        }
                        isIndeterminate={
                          paginatedResults?.length > 0 &&
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
                  <TableColumn width={150}>产品码</TableColumn>
                  <TableColumn width={70}>置信度</TableColumn>
                  <TableColumn width={100}>匹配类型</TableColumn>
                  <TableColumn width={70}>状态</TableColumn>
                  <TableColumn width={60}>来源行</TableColumn>
                  <TableColumn width={120}>操作时间</TableColumn>
                  <TableColumn width={120}>操作</TableColumn>
                </TableHeader>
                <TableBody>
                  {(paginatedResults || []).map((result, index) => {
                    // 检查是否是最近操作的记录，如果是则高亮显示
                    const isRecentlyOperated =
                      recentlyOperatedRecord?.recordId === result._id
                    const timeSinceOperation = recentlyOperatedRecord
                      ? Date.now() - recentlyOperatedRecord.timestamp
                      : 0
                    const shouldHighlight =
                      isRecentlyOperated && timeSinceOperation < 5000 // 5秒内高亮

                    // 检查是否是从记忆库跳转过来需要高亮的记录
                    const isHighlightedFromMemory =
                      highlightedRecordId === result._id
                    const isMemoryHighlightAnimating =
                      isHighlightedFromMemory && isHighlightAnimating

                    // 组合高亮样式
                    let highlightClass = ""
                    if (isMemoryHighlightAnimating) {
                      highlightClass =
                        "animate-pulse bg-gradient-to-r from-warning-100 via-warning-50 to-warning-100 shadow-lg ring-2 ring-warning-400 transition-all duration-1000"
                    } else if (isHighlightedFromMemory) {
                      highlightClass =
                        "bg-warning-50 shadow-sm ring-1 ring-warning-200 transition-all duration-500"
                    } else if (shouldHighlight) {
                      highlightClass =
                        "animate-pulse bg-gradient-to-r from-success-50 to-primary-50 shadow-lg ring-2 ring-success-300 transition-all duration-1000"
                    }

                    return (
                      <TableRow
                        key={result._id}
                        data-record-id={result._id}
                        className={highlightClass}
                      >
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
                          {result.selectedMatch?.productId &&
                          result.status !== "rejected" ? (
                            // 已选择匹配商品（confirmed状态，排除已拒绝）
                            <div className="space-y-1">
                              <p className="line-clamp-2 text-sm font-medium">
                                {result.selectedMatch.productId?.name ||
                                  "无商品"}
                              </p>
                              <div className="flex flex-wrap gap-1 text-xs">
                                <span className="text-primary">
                                  {result.selectedMatch.productId?.brand ||
                                    "无品牌"}
                                </span>
                                {result.selectedMatch.productId?.company && (
                                  <span className="text-default-500">
                                    | {result.selectedMatch.productId.company}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {result.selectedMatch.productId
                                  ?.productType && (
                                  <Chip
                                    size="sm"
                                    variant="flat"
                                    color="primary"
                                  >
                                    {result.selectedMatch.productId.productType}
                                  </Chip>
                                )}
                                {result.selectedMatch.productId?.features
                                  ?.hasPop && (
                                  <Chip
                                    size="sm"
                                    variant="flat"
                                    color="success"
                                  >
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
                                {result.selectedMatch.productId?.pricing
                                  ?.unit &&
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
                                    "无商品"}
                                </p>
                                <Chip size="sm" variant="flat" color="warning">
                                  候选
                                </Chip>
                              </div>
                              <div className="flex flex-wrap gap-1 text-xs">
                                <span className="text-warning-600">
                                  {result.candidates[0]?.productId?.brand ||
                                    "无品牌"}
                                </span>
                                {result.candidates[0]?.productId?.company && (
                                  <span className="text-default-500">
                                    | {result.candidates[0].productId.company}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {result.candidates[0]?.productId
                                  ?.productType && (
                                  <Chip
                                    size="sm"
                                    variant="flat"
                                    color="primary"
                                  >
                                    {result.candidates[0].productId.productType}
                                  </Chip>
                                )}
                                {result.candidates[0]?.productId?.features
                                  ?.hasPop && (
                                  <Chip
                                    size="sm"
                                    variant="flat"
                                    color="success"
                                  >
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
                                {result.candidates[0]?.productId?.pricing
                                  ?.unit &&
                                  ` / ${result.candidates[0].productId.pricing.unit}`}
                              </div>
                            </div>
                          ) : result.status === "rejected" ? (
                            // 已拒绝状态：简洁显示
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <XCircle className="h-4 w-4 text-danger" />
                                <span className="text-sm font-medium text-danger-700">
                                  已拒绝匹配
                                </span>
                              </div>
                              <div className="text-xs text-default-500">
                                请选择商品进行匹配
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
                          {result.selectedMatch?.productId &&
                          result.status !== "rejected" ? (
                            <CombinedCodesDisplay
                              productCode={
                                result.selectedMatch.productId.productCode
                              }
                              boxCode={result.selectedMatch.productId.boxCode}
                            />
                          ) : result.status === "pending" &&
                            result.candidates &&
                            result.candidates.length > 0 ? (
                            <CombinedCodesDisplay
                              productCode={
                                result.candidates[0]?.productId?.productCode
                              }
                              boxCode={result.candidates[0]?.productId?.boxCode}
                            />
                          ) : (
                            <span className="text-default-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {result.selectedMatch &&
                          result.status !== "rejected" ? (
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
                              status={result.status}
                            />
                          ) : result.status === "pending" &&
                            result.candidates &&
                            result.candidates.length > 0 ? (
                            <MatchTypeChip
                              matchType={result.candidates[0].matchType}
                              isMemoryMatch={false}
                              status={result.status}
                            />
                          ) : result.status === "rejected" ||
                            result.status === "exception" ? (
                            <MatchTypeChip
                              matchType=""
                              isMemoryMatch={false}
                              status={result.status}
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
                          <div className="space-y-1">
                            {result.updatedAt && (
                              <div className="text-xs text-default-600">
                                {new Date(result.updatedAt).toLocaleString(
                                  "zh-CN",
                                  {
                                    year: "numeric",
                                    month: "2-digit",
                                    day: "2-digit",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                    hour12: false,
                                  }
                                )}
                              </div>
                            )}
                            {isRecentlyOperated && (
                              <div className="flex items-center gap-1">
                                <span className="rounded bg-warning-100 px-1 text-xs text-warning-700">
                                  刚操作
                                </span>
                              </div>
                            )}
                          </div>
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
                                aria-label="选择匹配商品"
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
                                    aria-label="确认匹配"
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
                                    aria-label="拒绝匹配"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                </Tooltip>
                              </>
                            )}

                            {result.status === "confirmed" && (
                              <Tooltip content="拒绝匹配">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="danger"
                                  onClick={() => rejectMatch(result._id)}
                                  aria-label="拒绝匹配"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            )}

                            {/* 已拒绝状态只保留选择匹配商品按钮 */}

                            {result.status === "exception" && (
                              <Tooltip content="查看异常详情">
                                <Button
                                  isIconOnly
                                  size="sm"
                                  variant="light"
                                  color="warning"
                                  onClick={() => viewExceptionDetails(result)}
                                  aria-label="查看异常详情"
                                >
                                  <Info className="h-4 w-4" />
                                </Button>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
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
        onOpenChange={open => {
          // 当Modal关闭时，清空搜索状态
          if (!open) {
            setProductSearchTerm("")
            setAvailableProducts([])
            setLoadingProducts(false)

            // 清除防抖定时器
            if (productSearchTimeoutRef.current) {
              clearTimeout(productSearchTimeoutRef.current)
              productSearchTimeoutRef.current = null
            }

            setSelectedRecord(null)
          }
          productSelectModal.onOpenChange()
        }}
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
                    selectedRecord.status !== "rejected" &&
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
                                    ?.name || "无商品"}
                                </p>
                                <p className="mt-1 text-sm text-success-600">
                                  品牌：
                                  {selectedRecord.selectedMatch?.productId
                                    ?.brand || "无品牌"}
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
                                    ?.name || "无商品"}
                                </p>
                                <p className="mt-1 text-sm text-warning-600">
                                  品牌：
                                  {selectedRecord.selectedMatch?.productId
                                    ?.brand || "无品牌"}
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

                                {/* 确认当前匹配按钮 */}
                                <div className="mt-4">
                                  <Button
                                    color="success"
                                    size="lg"
                                    variant="solid"
                                    className="w-full bg-gradient-to-r from-success-500 to-success-600 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-success-600 hover:to-success-700 hover:shadow-xl"
                                    onClick={() => {
                                      if (
                                        selectedRecord.selectedMatch?.productId
                                          ?._id
                                      ) {
                                        selectProduct(
                                          selectedRecord.selectedMatch.productId
                                            ._id
                                        )
                                      }
                                    }}
                                  >
                                    确认当前匹配
                                  </Button>
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
                                    ?.name || "无商品"}
                                </p>
                                <p className="mt-1 text-sm text-warning-600">
                                  品牌：
                                  {selectedRecord.candidates?.[0]?.productId
                                    ?.brand || "无品牌"}
                                </p>
                                <div className="mt-2 flex items-center gap-3">
                                  <Chip
                                    color="warning"
                                    size="sm"
                                    variant="solid"
                                  >
                                    置信度{" "}
                                    {(() => {
                                      const confidence =
                                        selectedRecord.candidates?.[0]
                                          ?.confidence
                                      if (typeof confidence === "string") {
                                        // 如果是字符串类型，根据级别返回数值
                                        const levelMap = {
                                          high: 95,
                                          medium: 75,
                                          low: 55,
                                        }
                                        return (
                                          levelMap[
                                            confidence as keyof typeof levelMap
                                          ] || 0
                                        )
                                      }
                                      return (
                                        Math.round((confidence || 0) * 10) / 10
                                      )
                                    })()}
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
                                {/* 快速确认按钮 - 优化设计 */}
                                <div className="mt-4">
                                  <Button
                                    color="success"
                                    size="lg"
                                    variant="solid"
                                    className="w-full bg-gradient-to-r from-success-500 to-success-600 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:from-success-600 hover:to-success-700 hover:shadow-xl"
                                    onClick={() => {
                                      if (
                                        selectedRecord.candidates?.[0]
                                          ?.productId?._id
                                      ) {
                                        selectProduct(
                                          selectedRecord.candidates[0].productId
                                            ._id
                                        )
                                      }
                                    }}
                                  >
                                    确认推荐商品
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardBody>
                        </Card>
                      )
                    ) : selectedRecord?.status === "rejected" ? (
                      // 已拒绝状态 - 简洁清晰的设计
                      <Card className="border border-danger-200 bg-danger-50">
                        <CardBody className="p-4">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Badge color="danger" variant="flat">
                                已拒绝
                              </Badge>
                              <span className="text-sm font-medium text-danger-800">
                                已拒绝匹配
                              </span>
                            </div>
                            <div className="text-center">
                              <XCircle className="mx-auto mb-2 h-8 w-8 text-danger-300" />
                              <p className="text-sm text-danger-600">
                                请从右侧商品列表中选择合适的商品
                              </p>
                              <div className="mt-2 flex items-center justify-center gap-1">
                                <Settings className="h-4 w-4 text-danger-400" />
                                <span className="text-xs text-danger-500">
                                  点击商品即可选择
                                </span>
                              </div>
                            </div>
                          </div>
                        </CardBody>
                      </Card>
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
                        console.log("📝 搜索框输入变化:", value)
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
                  <div className="flex items-center gap-2">
                    {autoJumpToNext ? (
                      <div className="flex items-center gap-2 text-sm text-success-600">
                        <ArrowRight className="h-4 w-4" />
                        <span>
                          🚀
                          智能模式：确认商品后弹窗将自动切换到下一个待处理记录，连续处理更高效！
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-default-500">
                        <Target className="h-4 w-4" />
                        <span>
                          💡
                          提示：选择商品后弹窗将关闭，可手动点击【下一个】按钮跳转
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button color="danger" variant="flat" onPress={onClose}>
                      取消
                    </Button>
                  </div>
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
