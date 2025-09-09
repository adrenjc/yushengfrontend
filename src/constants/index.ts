/* 应用常量 */
export const APP_NAME = "智能商品匹配系统"
export const APP_DESCRIPTION = "基于AI的商品匹配与价格管理系统"
export const APP_VERSION = "1.0.0"

/* API 配置 */
export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002"
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"

/* 路由常量 */
export const ROUTES = {
  HOME: "/",
  LOGIN: "/auth/login",
  DASHBOARD: "/dashboard",
  PRODUCTS: "/dashboard/products",
  MATCHING: "/dashboard/matching",
  REVIEW: "/dashboard/review",
  PRICES: "/dashboard/prices",
  REPORTS: "/dashboard/reports",
  SETTINGS: "/dashboard/settings",
} as const

/* 主题配置 */
export const THEME = {
  primaryColor: "#3b82f6",
  successColor: "#22c55e",
  warningColor: "#f59e0b",
  errorColor: "#ef4444",
  infoColor: "#06b6d4",
  borderRadius: 8,
  fontFamily: "Inter, PingFang SC, Microsoft YaHei, sans-serif",
} as const

/* 文件上传配置 */
export const UPLOAD_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ],
  ALLOWED_EXTENSIONS: [".xlsx", ".xls", ".csv"],
} as const

/* 分页配置 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
  MAX_PAGE_SIZE: 1000,
} as const

/* 匹配配置 */
export const MATCHING_CONFIG = {
  DEFAULT_THRESHOLD: 65,
  AUTO_CONFIRM_THRESHOLD: 90,
  MAX_CANDIDATES: 5,
  CONFIDENCE_LEVELS: {
    HIGH: 90,
    MEDIUM: 70,
    LOW: 0,
  },
} as const

/* 状态配置 */
export const STATUS_CONFIG = {
  TASK_STATUS: {
    PENDING: "pending",
    PROCESSING: "processing",
    REVIEW: "review",
    COMPLETED: "completed",
    FAILED: "failed",
  },
  MATCH_STATUS: {
    PENDING: "pending", // 前端统一显示为"待审核"
    CONFIRMED: "confirmed",
    REJECTED: "rejected",
    EXCEPTION: "exception",
  },
  PRIORITY: {
    HIGH: "high",
    MEDIUM: "medium",
    LOW: "low",
  },
} as const

/* 用户角色和权限 */
export const USER_ROLES = {
  ADMIN: "admin",
  OPERATOR: "operator",
  REVIEWER: "reviewer",
} as const

export const PERMISSIONS = {
  // 商品权限
  PRODUCTS_VIEW: "products:view",
  PRODUCTS_CREATE: "products:create",
  PRODUCTS_UPDATE: "products:update",
  PRODUCTS_DELETE: "products:delete",

  // 匹配权限
  MATCHING_CREATE: "matching:create",
  MATCHING_VIEW: "matching:view",

  // 审核权限
  REVIEW_BASIC: "review:basic",
  REVIEW_EXPERT: "review:expert",

  // 价格权限
  PRICE_VIEW: "price:view",
  PRICE_UPDATE: "price:update",

  // 报表权限
  REPORTS_VIEW: "reports:view",

  // 系统权限
  SYSTEM_CONFIG: "system:config",
  USER_MANAGEMENT: "user:management",
} as const

/* 本地存储键名 */
export const STORAGE_KEYS = {
  TOKEN: "smart_match_token",
  REFRESH_TOKEN: "smart_match_refresh_token",
  USER: "smart_match_user",
  THEME: "smart_match_theme",
  SIDEBAR_COLLAPSED: "smart_match_sidebar_collapsed",
  TABLE_SETTINGS: "smart_match_table_settings",
} as const

/* 动画配置 */
export const ANIMATION = {
  DURATION: {
    SHORT: 200,
    MEDIUM: 300,
    LONG: 500,
  },
  EASING: {
    EASE_IN: "ease-in",
    EASE_OUT: "ease-out",
    EASE_IN_OUT: "ease-in-out",
  },
} as const

/* 图表配置 */
export const CHART_CONFIG = {
  COLORS: {
    PRIMARY: "#3b82f6",
    SUCCESS: "#22c55e",
    WARNING: "#f59e0b",
    DANGER: "#ef4444",
    INFO: "#06b6d4",
    SECONDARY: "#64748b",
  },
  GRADIENT: {
    PRIMARY: ["#3b82f6", "#1d4ed8"],
    SUCCESS: ["#22c55e", "#15803d"],
    WARNING: ["#f59e0b", "#d97706"],
    DANGER: ["#ef4444", "#dc2626"],
  },
} as const

/* 错误消息 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "网络连接失败，请检查网络设置",
  UNAUTHORIZED: "登录已过期，请重新登录",
  FORBIDDEN: "权限不足，无法执行此操作",
  NOT_FOUND: "请求的资源不存在",
  SERVER_ERROR: "服务器内部错误，请稍后重试",
  VALIDATION_ERROR: "数据验证失败，请检查输入内容",
  FILE_TOO_LARGE: "文件大小超出限制",
  FILE_TYPE_NOT_SUPPORTED: "不支持的文件类型",
} as const

/* 成功消息 */
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "登录成功",
  LOGOUT_SUCCESS: "退出成功",
  SAVE_SUCCESS: "保存成功",
  DELETE_SUCCESS: "删除成功",
  UPLOAD_SUCCESS: "上传成功",
  EXPORT_SUCCESS: "导出成功",
  IMPORT_SUCCESS: "导入成功",
  UPDATE_SUCCESS: "更新成功",
  CREATE_SUCCESS: "创建成功",
} as const

/* 表格配置 */
export const TABLE_CONFIG = {
  ROW_HEIGHT: 48,
  HEADER_HEIGHT: 56,
  SELECTION_COLUMN_WIDTH: 40,
  ACTION_COLUMN_WIDTH: 120,
  MIN_COLUMN_WIDTH: 100,
  MAX_COLUMN_WIDTH: 400,
} as const
