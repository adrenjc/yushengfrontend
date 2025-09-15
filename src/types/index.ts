/* 用户相关类型 */
export interface User {
  id: string
  username: string
  role: "admin" | "operator" | "reviewer"
  permissions: string[]
  avatar?: string
  createdAt: string
  updatedAt: string
}

/* 认证相关类型 */
export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthResponse {
  success: boolean
  data?: {
    user: User
    tokens: {
      accessToken: string
      refreshToken: string
    }
  }
  message: string
}

/* 商品相关类型 */
export interface ProductSpecifications {
  packageType?: string
  size?: string
  price?: number
  weight?: string
  volume?: string
  [key: string]: any
}

export interface Product {
  _id: string
  name: string
  brand: string
  company?: string
  productCode?: string
  boxCode?: string
  keywords: string[]
  category: string
  specifications: ProductSpecifications
  wholesale?: {
    name?: string
    price?: number
    unit?: string
    updatedAt?: string
    source?: "manual" | "matching" | "import"
    lastMatchingRecord?: string
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

/* 匹配相关类型 */
export interface WholesaleItem {
  name: string
  price: number
  supplier?: string
  category?: string
  description?: string
}

export interface SimilarityScore {
  name: number
  brand: number
  keywords: number
  package: number
  price: number
  total: number
}

export interface MatchingCandidate {
  productId: string
  productName: string
  product?: Product
  score?: SimilarityScore
  confidence: "high" | "medium" | "low"
  reason?: string
  brand?: string
  similarity?: number
  price?: number
  priceMatch?: number
  reasons?: string[]
}

export interface MatchingRecord {
  _id: string
  taskId: string
  wholesaleName: string
  wholesalePrice: number
  candidates: MatchingCandidate[]
  selectedMatch?: {
    productId: string
    product?: Product
    confirmedBy: string
    confirmedAt: string
    note?: string
    confidence: number
  } | null
  status:
    | "pending" // 在前端显示为"待审核"
    | "confirmed"
    | "rejected"
    | "exception"
    | "approved"
  priority: "high" | "medium" | "low"
  reviewHistory: ReviewRecord[]
  createdAt: string
  updatedAt: string
  originalData?: {
    name: string
    brand: string
    price: number
    specifications: string
    category: string
  }
  exceptions?: string[]
}

export interface ReviewRecord {
  action: string
  performer: string
  timestamp: string
  note?: string
  previousStatus: string
  newStatus: string
}

/* 匹配任务相关类型 */
export interface MatchingConfig {
  threshold: number
  autoConfirmThreshold: number
  strategies: {
    brandPriority: boolean
    keywordMatching: boolean
    packageTypeRecognition: boolean
    priceValidation: boolean
  }
}

export interface MatchingTaskProgress {
  totalItems: number
  processedItems: number
  confirmedItems: number
  pendingItems: number
}

export interface MatchingTask {
  _id: string
  filename: string
  originalFilename: string
  fileSize: number
  status: "pending" | "processing" | "review" | "completed" | "failed"
  config: MatchingConfig
  progress: MatchingTaskProgress
  createdBy: string
  createdByUser?: User
  startedAt?: string
  completedAt?: string
  error?: string
  createdAt: string
  updatedAt: string
}

/* 价格相关类型 */
export interface PriceChange {
  _id: string
  productId: string
  product?: Product
  oldPrice: number
  newPrice: number
  changeRate: number
  changeType: "increase" | "decrease" | "stable"
  reason?: string
  updatedBy: string
  updatedByUser?: User
  createdAt: string
}

export interface PriceAlert {
  _id: string
  productId: string
  product?: Product
  alertType: "threshold" | "fluctuation" | "trend"
  threshold?: number
  currentValue: number
  message: string
  isRead: boolean
  createdAt: string
}

/* 统计相关类型 */
export interface MatchingStatistics {
  totalTasks: number
  completedTasks: number
  pendingTasks: number
  failedTasks: number
  averageAccuracy: number
  averageProcessingTime: number
  todayMatches: number
  weeklyTrend: {
    date: string
    matches: number
    accuracy: number
  }[]
}

export interface SystemStatistics {
  totalProducts: number
  totalUsers: number
  totalMatches: number
  systemHealth: "healthy" | "warning" | "error"
  lastUpdate: string
}

/* API 响应类型 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  message: string
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  sortBy?: string
  sortOrder?: "asc" | "desc"
  filters?: Record<string, any>
}

/* 文件上传相关类型 */
export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface FileUploadResult {
  filename: string
  originalname: string
  size: number
  mimetype: string
  url?: string
}

/* 表格相关类型 */
export interface TableColumn<T = any> {
  key: keyof T | string
  label: string
  sortable?: boolean
  align?: "start" | "center" | "end"
  width?: string | number
  render?: (value: any, record: T, index: number) => React.ReactNode
}

export interface TableProps<T = any> {
  data: T[]
  columns: TableColumn<T>[]
  loading?: boolean
  pagination?: {
    page: number
    limit: number
    total: number
    onPageChange: (page: number) => void
    onLimitChange: (limit: number) => void
  }
  selection?: {
    selectedKeys: Set<string>
    onSelectionChange: (keys: Set<string>) => void
  }
  onRowAction?: (action: string, record: T) => void
}

/* 记忆库相关类型 */
export interface MatchingMemory {
  _id: string
  normalizedWholesaleName: string
  originalWholesaleName: string
  confirmedProductId: Product
  templateId: string
  confidence: number
  source: "manual" | "expert" | "imported" | "migrated"
  confirmCount: number
  confirmedBy: string
  weight: number
  isUserPreference: boolean
  relatedRecords: Array<{
    recordId: string
    taskId:
      | string
      | {
          _id: string
          originalFilename: string
          templateName: string
          createdAt: string
          status: string
        }
    timestamp: string
    _id: string
  }>
  features: {
    extractedSpecs: string[]
    keywords: string[]
  }
  status: "active" | "deprecated" | "conflicted"
  trustScore: number
  isHighTrust: boolean
  metadata: {
    learningSource: {
      sourceTask: {
        taskId:
          | string
          | {
              _id: string
              originalFilename: string
              templateName: string
              createdAt: string
              status: string
            }
        taskName: string
        taskIdentifier: string
        fileName: string
      }
      learnedAt: string
      learnedBy: string
      learningMethod:
        | "single_learn"
        | "batch_learn"
        | "bulk_import"
        | "manual_add"
      learningNote: string
      originalMatchType: "auto" | "memory" | "manual" | "unknown"
      originalRecord: {
        recordId: string
        rowNumber: number
        originalPrice: number
        originalQuantity: number
      }
    }
    usageStats: {
      totalUsed: number
      successRate: number
      lastUsedAt: string
      recentUsage: Array<{
        usedAt: string
        taskId: string
        userId: string
        matchedRecordId: string
        _id: string
      }>
    }
    qualityControl: {
      expertVerified: boolean
      verifiedBy?: string
      verifiedAt?: string
      qualityScore: number
      qualityNotes: string
    }
    auditTrail: Array<{
      action: string
      performedBy: string
      performedAt: string
      details: string
      _id: string
    }>
    conflicts: Array<{
      conflictingProductId: string
      conflictReason: string
      reportedAt: string
    }>
  }
  lastConfirmedAt: string
  createdAt: string
  updatedAt: string
  __v: number
}

/* 主题相关类型 */
export type Theme = "light" | "dark" | "system"

/* 导航相关类型 */
export interface NavItem {
  key: string
  label: string
  href?: string
  icon?: React.ReactNode
  children?: NavItem[]
  badge?: string | number
  disabled?: boolean
}
