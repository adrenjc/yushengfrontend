"use client"

import {
  useState,
  useEffect,
  useMemo,
  createContext,
  useContext,
  useRef,
} from "react"
import dynamic from "next/dynamic"
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
  Input,
  Select,
  SelectItem,
  Pagination,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Checkbox,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Textarea,
  Form,
  Divider,
} from "@nextui-org/react"
import {
  Package,
  Search,
  Filter,
  Plus,
  Upload,
  Download,
  Edit2,
  Trash2,
  MoreVertical,
  RefreshCw,
  CheckSquare,
  Square,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react"
// 动态导入以避免 hydration 错误
const RealProgressUpload = dynamic(
  () =>
    import("@/components/ui/real-progress-upload").then(mod => ({
      default: mod.RealProgressUpload,
    })),
  {
    ssr: false,
    loading: () => <div>加载中...</div>,
  }
)
import { ConfirmModal } from "@/components/ui/confirm-modal"
import { ProductForm } from "@/components/product"
import ProductSearchBar, {
  SearchFilters,
} from "@/components/product/product-search-bar"
// 动态导入 EmptyState 以避免 hydration 错误
const EmptyState = dynamic(
  () =>
    import("@/components/ui/empty-state").then(mod => ({
      default: mod.EmptyState,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center py-12">加载中...</div>
    ),
  }
)
import { useNotifications } from "@/stores/app"
import { getAuthHeaders } from "@/lib/auth"
import {
  API_ROUTES,
  buildApiUrl,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from "@/lib/api"

// Context for template selection
const TemplateContext = createContext<string>("")

interface Product {
  _id: string
  templateId: string
  name: string
  brand: string
  productCode?: string
  boxCode?: string
  productType?: string
  packageType?: string
  specifications?: {
    circumference?: number
    length?: string
    packageQuantity?: number
  }
  launchDate?: string
  chemicalContent?: {
    tarContent?: number
    nicotineContent?: number
    carbonMonoxideContent?: number
  }
  appearance?: {
    color?: string
  }
  company?: string
  features?: {
    hasPop?: boolean
  }
  pricing?: {
    priceCategory?: string
    retailPrice?: number
    unit?: string
    companyPrice?: number
  }
  wholesale?: {
    name?: string
    price?: number
  }
  category?: string
  keywords: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface ProductTemplate {
  id: string
  name: string
  description: string
  category: string
  statistics: {
    productCount: number
    matchingTaskCount: number
  }
  isActive: boolean
  isDefault: boolean
}

interface ProductsResponse {
  success: boolean
  data: {
    products: Product[]
    pagination: {
      page: number
      limit: number
      total: number
      pages: number
      hasNext: boolean
      hasPrev: boolean
    }
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10) // 默认10条，改为可变
  const [total, setTotal] = useState(0)

  const [filters, setFilters] = useState({})
  const [selectedKeys, setSelectedKeys] = useState(new Set<string>())
  const [batchLoading, setBatchLoading] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [allProductIds, setAllProductIds] = useState<string[]>([])
  const [allIdsLoading, setAllIdsLoading] = useState(false)

  // 模板相关状态
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("")
  const [templatesLoading, setTemplatesLoading] = useState(true)

  // 分页大小选项
  const pageSizeOptions = [
    { label: "10条/页", value: 10 },
    { label: "20条/页", value: 20 },
    { label: "50条/页", value: 50 },
    { label: "100条/页", value: 100 },
  ]

  // 通知系统
  const notifications = useNotifications()

  // useEffect hooks - 必须在组件顶部
  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (selectedTemplateId) {
      fetchProducts()
    }
  }, [page, limit, selectedTemplateId])

  useEffect(() => {
    if (selectedTemplateId) {
      fetchAllProductIds()
    }
  }, [selectedTemplateId])

  // 模态框状态
  const {
    isOpen: isUploadOpen,
    onOpen: onUploadOpen,
    onClose: onUploadClose,
  } = useDisclosure()
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure()
  const {
    isOpen: isBatchDeleteOpen,
    onOpen: onBatchDeleteOpen,
    onClose: onBatchDeleteClose,
  } = useDisclosure()
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure()
  const {
    isOpen: isCreateOpen,
    onOpen: onCreateOpen,
    onClose: onCreateClose,
  } = useDisclosure()
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // 计算选中的商品
  const selectedProducts = useMemo(() => {
    return Array.from(selectedKeys)
      .map(key => products.find(product => product._id === key))
      .filter(Boolean) as Product[]
  }, [selectedKeys, products])

  // 是否全选（当前页）
  const isPageAllSelected = useMemo(() => {
    return (
      products.length > 0 &&
      products.every(product => selectedKeys.has(product._id))
    )
  }, [selectedKeys, products])

  // 是否全选（所有页）
  const isAllSelected = useMemo(() => {
    return (
      allProductIds.length > 0 &&
      allProductIds.every(id => selectedKeys.has(id))
    )
  }, [selectedKeys, allProductIds])

  // 是否部分选中
  const isIndeterminate = useMemo(() => {
    return selectedKeys.size > 0 && !isAllSelected
  }, [selectedKeys.size, isAllSelected])

  // 获取模板列表
  const fetchTemplates = async () => {
    try {
      setTemplatesLoading(true)
      const response = await fetch(buildApiUrl(API_ROUTES.TEMPLATES.OPTIONS), {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      const templateList = data.data.templates || []
      setTemplates(templateList)

      // 如果没有选中的模板且有模板，选择默认模板或第一个模板
      if (!selectedTemplateId && templateList.length > 0) {
        const defaultTemplate = templateList.find(
          (t: ProductTemplate) => t.isDefault
        )
        const templateId = defaultTemplate?.id || templateList[0].id
        setSelectedTemplateId(templateId)
      }
    } catch (error) {
      console.error("❌ 获取模板列表失败:", error)
      notifications.error("加载失败", "无法获取模板列表")
    } finally {
      setTemplatesLoading(false)
    }
  }

  // 带filters参数的数据获取函数
  const fetchProductsWithFilters = async (searchFilters: any = {}) => {
    if (!selectedTemplateId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log(
        `🔥 获取产品数据 - 页码: ${page}, 模板: ${selectedTemplateId}, 过滤器:`,
        searchFilters
      )

      // 使用统一的API配置
      const baseUrl = buildApiUrl(API_ROUTES.PRODUCTS.LIST)
      const url = new URL(baseUrl)
      url.searchParams.set("templateId", selectedTemplateId)
      url.searchParams.set("page", page.toString())
      url.searchParams.set("limit", limit.toString())

      // 添加过滤器参数
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (typeof value === "object" && !Array.isArray(value)) {
            // 处理范围类型的过滤器
            Object.entries(value).forEach(([subKey, subValue]) => {
              if (subValue !== undefined && subValue !== null) {
                url.searchParams.set(`${key}.${subKey}`, subValue.toString())
              }
            })
          } else {
            url.searchParams.set(key, value.toString())
          }
        }
      })

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: ProductsResponse = await response.json()
      setProducts(data.data.products)
      setTotal(data.data.pagination.total)
      console.log("✅ 产品数据获取成功", {
        count: data.data.products.length,
        total: data.data.pagination.total,
      })
    } catch (error) {
      console.error("❌ 产品数据获取失败:", error)
      notifications.error(
        "获取产品数据失败",
        error instanceof Error ? error.message : "未知错误"
      )
      setProducts([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  // 简单直接的数据获取函数
  const fetchProducts = async () => {
    if (!selectedTemplateId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log(
        `🔥 获取产品数据 - 页码: ${page}, 模板: ${selectedTemplateId}, 过滤器:`,
        filters
      )

      // 使用统一的API配置
      const baseUrl = buildApiUrl(API_ROUTES.PRODUCTS.LIST)
      const url = new URL(baseUrl)
      url.searchParams.set("templateId", selectedTemplateId)
      url.searchParams.set("page", page.toString())
      url.searchParams.set("limit", limit.toString())

      // 添加过滤器参数
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (typeof value === "object" && !Array.isArray(value)) {
            // 处理范围类型的过滤器
            Object.entries(value).forEach(([subKey, subValue]) => {
              if (subValue !== undefined && subValue !== null) {
                url.searchParams.set(`${key}.${subKey}`, subValue.toString())
              }
            })
          } else {
            url.searchParams.set(key, value.toString())
          }
        }
      })

      console.log(`🔗 请求URL: ${url.toString()}`)

      const response = await fetch(url.toString(), {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data: ProductsResponse = await response.json()
      console.log("✅ 产品数据获取成功:", data)

      setProducts(data.data.products)
      setTotal(data.data.pagination.total)
    } catch (error: any) {
      console.error("❌ 产品数据获取失败:", error)
      console.error("❌ 错误详情:", error?.message)
      console.error("❌ 错误堆栈:", error?.stack)

      // 在页面上也显示错误
      notifications.error(
        "加载失败",
        `获取产品数据失败: ${error?.message || "未知错误"}`
      )

      setProducts([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }

  // 删除产品
  const deleteProduct = async (id: string) => {
    try {
      const response = await fetch(
        buildApiUrl(API_ROUTES.PRODUCTS.DELETE(id)),
        {
          method: "DELETE",
          headers: getAuthHeaders(),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      console.log("✅ 产品删除成功")
      notifications.success("删除成功", "商品已成功删除")
      if (selectedTemplateId) {
        await fetchProducts() // 重新获取数据
        await fetchAllProductIds() // 更新全选商品数量
      }
    } catch (error) {
      console.error("❌ 产品删除失败:", error)
      notifications.error(
        "删除失败",
        error instanceof Error ? error.message : "未知错误"
      )
    }
  }

  // 批量删除商品
  const batchDeleteProducts = async (ids: string[]) => {
    try {
      setBatchLoading(true)

      const response = await fetch(
        buildApiUrl(API_ROUTES.PRODUCTS.HARD_DELETE),
        {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify({
            ids: ids,
            templateId: selectedTemplateId,
          }),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      console.log("✅ 批量删除成功")
      notifications.success("批量删除成功", `已成功删除 ${ids.length} 个商品`)
      setSelectedKeys(new Set()) // 清空选择
      if (selectedTemplateId) {
        await fetchProducts() // 重新获取数据
        await fetchAllProductIds() // 更新全选商品数量
      }
    } catch (error) {
      console.error("❌ 批量删除失败:", error)
      notifications.error(
        "批量删除失败",
        error instanceof Error ? error.message : "未知错误"
      )
    } finally {
      setBatchLoading(false)
    }
  }

  // 批量操作商品（启用/禁用）
  const batchOperation = async (action: "activate" | "deactivate") => {
    try {
      setBatchLoading(true)
      const ids = Array.from(selectedKeys)

      const response = await fetch(buildApiUrl(API_ROUTES.PRODUCTS.BATCH), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          operation: action,
          productIds: ids,
          templateId: selectedTemplateId,
        }),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const actionText = action === "activate" ? "启用" : "禁用"
      console.log(`✅ 批量${actionText}成功`)
      notifications.success(
        `批量${actionText}成功`,
        `已成功${actionText} ${ids.length} 个商品`
      )
      setSelectedKeys(new Set()) // 清空选择
      if (selectedTemplateId) {
        await fetchProducts() // 重新获取数据
        await fetchAllProductIds() // 更新全选商品数量
      }
    } catch (error) {
      const actionText = action === "activate" ? "启用" : "禁用"
      console.error(`❌ 批量${actionText}失败:`, error)
      notifications.error(
        `批量${actionText}失败`,
        error instanceof Error ? error.message : "未知错误"
      )
    } finally {
      setBatchLoading(false)
    }
  }

  // 编辑商品
  const updateProduct = async (productData: Partial<Product>) => {
    if (!editingProduct) return

    try {
      const response = await fetch(
        buildApiUrl(API_ROUTES.PRODUCTS.UPDATE(editingProduct._id)),
        {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(productData),
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      console.log("✅ 商品更新成功")
      notifications.success("更新成功", "商品信息已成功更新")
      setEditingProduct(null)
      onEditClose()
      if (selectedTemplateId) {
        await fetchProducts() // 重新获取数据
        await fetchAllProductIds() // 更新全选商品数量
      }
    } catch (error) {
      console.error("❌ 商品更新失败:", error)
      notifications.error(
        "更新失败",
        error instanceof Error ? error.message : "未知错误"
      )
    }
  }

  // 创建商品
  const createProduct = async (
    productData: Omit<Product, "_id" | "createdAt" | "updatedAt">
  ) => {
    try {
      const response = await fetch(buildApiUrl(API_ROUTES.PRODUCTS.CREATE), {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(productData),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      console.log("✅ 商品创建成功")
      notifications.success("创建成功", "新商品已成功创建")
      onCreateClose()
      if (selectedTemplateId) {
        await fetchProducts() // 重新获取数据
        await fetchAllProductIds() // 更新全选商品数量
      }
    } catch (error) {
      console.error("❌ 商品创建失败:", error)
      notifications.error(
        "创建失败",
        error instanceof Error ? error.message : "未知错误"
      )
    }
  }

  // 带filters参数的获取所有商品ID函数
  const fetchAllProductIdsWithFilters = async (searchFilters: any = {}) => {
    if (!selectedTemplateId) {
      setAllProductIds([])
      return
    }

    try {
      setAllIdsLoading(true)

      const baseUrl = buildApiUrl(API_ROUTES.PRODUCTS.ALL_IDS)
      const url = new URL(baseUrl)
      url.searchParams.set("templateId", selectedTemplateId)

      // 添加过滤器参数
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (typeof value === "object" && !Array.isArray(value)) {
            // 处理范围类型的过滤器
            Object.entries(value).forEach(([subKey, subValue]) => {
              if (subValue !== undefined && subValue !== null) {
                url.searchParams.set(`${key}.${subKey}`, subValue.toString())
              }
            })
          } else {
            url.searchParams.set(key, value.toString())
          }
        }
      })

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setAllProductIds(data.data?.ids || [])
      console.log("✅ 商品ID获取成功", {
        count: data.data?.ids?.length || 0,
      })
    } catch (error) {
      console.error("❌ 商品ID获取失败:", error)
      setAllProductIds([])
    } finally {
      setAllIdsLoading(false)
    }
  }

  // 获取所有商品ID（用于全选）
  const fetchAllProductIds = async () => {
    if (!selectedTemplateId) {
      setAllProductIds([])
      return
    }

    try {
      setAllIdsLoading(true)

      const baseUrl = buildApiUrl(API_ROUTES.PRODUCTS.ALL_IDS)
      const url = new URL(baseUrl)
      url.searchParams.set("templateId", selectedTemplateId)

      // 添加过滤器参数
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          if (typeof value === "object" && !Array.isArray(value)) {
            // 处理范围类型的过滤器
            Object.entries(value).forEach(([subKey, subValue]) => {
              if (subValue !== undefined && subValue !== null) {
                url.searchParams.set(`${key}.${subKey}`, subValue.toString())
              }
            })
          } else {
            url.searchParams.set(key, value.toString())
          }
        }
      })

      const response = await fetch(url.toString(), {
        headers: getAuthHeaders(),
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setAllProductIds(data.data.ids)
    } catch (error: any) {
      console.error("❌ 获取商品ID列表失败:", error)
      notifications.error(
        "获取失败",
        `获取商品ID列表失败: ${error?.message || "未知错误"}`
      )
      setAllProductIds([])
    } finally {
      setAllIdsLoading(false)
    }
  }

  // 选择处理 - 当前页全选
  const togglePageSelection = () => {
    if (isPageAllSelected) {
      // 取消当前页选择
      const newSelectedKeys = new Set(selectedKeys)
      products.forEach(product => newSelectedKeys.delete(product._id))
      setSelectedKeys(newSelectedKeys)
    } else {
      // 选择当前页
      const newSelectedKeys = new Set(selectedKeys)
      products.forEach(product => newSelectedKeys.add(product._id))
      setSelectedKeys(newSelectedKeys)
    }
  }

  // 全选所有页
  const selectAllPages = () => {
    if (isAllSelected) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(allProductIds))
    }
  }

  const toggleSelection = (id: string) => {
    const newSelectedKeys = new Set(selectedKeys)
    if (newSelectedKeys.has(id)) {
      newSelectedKeys.delete(id)
    } else {
      newSelectedKeys.add(id)
    }
    setSelectedKeys(newSelectedKeys)
  }

  // 搜索处理
  const handleSearch = () => {
    setPage(1) // 重置到第一页
    setSelectedKeys(new Set()) // 清空选择
    if (selectedTemplateId) {
      fetchProducts()
      fetchAllProductIds() // 重新获取ID列表
    }
  }

  // 处理分页大小改变
  const handleLimitChange = (newLimit: number) => {
    setLimit(newLimit)
    setPage(1) // 重置到第一页
    setSelectedKeys(new Set()) // 清空选择
  }

  // 处理删除
  const handleDelete = (id: string) => {
    setDeletingId(id)
    onDeleteOpen()
  }

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteProduct(deletingId)
      setDeletingId(null)
    }
    onDeleteClose()
  }

  // 处理批量删除
  const handleBatchDelete = () => {
    if (selectedKeys.size === 0) return
    onBatchDeleteOpen()
  }

  const confirmBatchDelete = async () => {
    const ids = Array.from(selectedKeys)
    await batchDeleteProducts(ids)
    onBatchDeleteClose()
  }

  // 处理编辑
  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    onEditOpen()
  }

  // 处理新增
  const handleCreate = () => {
    onCreateOpen()
  }

  // 上传成功回调
  const handleUploadSuccess = async (result: any) => {
    console.log("🎉 上传成功，刷新数据", result)

    if (selectedTemplateId) {
      await fetchProducts() // 重新获取商品列表
      await fetchAllProductIds() // 重新获取ID列表
    }

    // 通知信息已在上传组件中处理，这里不重复显示
  }

  const renderStatusChip = (isActive: boolean) => {
    return (
      <Chip color={isActive ? "success" : "default"} variant="flat" size="sm">
        {isActive ? "启用" : "禁用"}
      </Chip>
    )
  }

  const renderActions = (product: Product) => {
    return (
      <div className="flex items-center gap-1">
        <Button
          isIconOnly
          size="sm"
          variant="light"
          color="primary"
          onPress={() => handleEdit(product)}
          className="h-8 w-8 min-w-8"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          color="danger"
          onPress={() => handleDelete(product._id)}
          className="h-8 w-8 min-w-8"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <TemplateContext.Provider value={selectedTemplateId}>
      <div className="space-y-6">
        {/* 页面标题 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">商品管理</h1>
            <p className="text-default-500">
              管理商品信息，支持批量导入和数据分析
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="flat"
              startContent={<RefreshCw className="h-4 w-4" />}
              onClick={() => selectedTemplateId && fetchProducts()}
            >
              刷新
            </Button>
            <Button
              color="primary"
              startContent={<Upload className="h-4 w-4" />}
              onClick={onUploadOpen}
            >
              批量导入
            </Button>
            <Button
              color="primary"
              variant="flat"
              startContent={<Plus className="h-4 w-4" />}
              onClick={handleCreate}
            >
              新增商品
            </Button>
          </div>
        </div>

        {/* 模板选择器 */}
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                <span className="text-sm font-medium">选择商品模板:</span>
              </div>
              <Select
                placeholder="请选择模板"
                size="sm"
                className="max-w-xs"
                selectedKeys={
                  selectedTemplateId ? new Set([selectedTemplateId]) : new Set()
                }
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys as Set<string>)[0]
                  if (selectedKey) {
                    setSelectedTemplateId(selectedKey)
                    setPage(1) // 重置到第一页
                    setSelectedKeys(new Set()) // 清空选择
                  }
                }}
                isLoading={templatesLoading}
                isDisabled={templatesLoading}
              >
                {templates.map(template => (
                  <SelectItem key={template.id} textValue={template.name}>
                    <div className="flex w-full items-center justify-between">
                      <div>
                        <span className="font-medium">{template.name}</span>
                        {template.isDefault && (
                          <Chip
                            size="sm"
                            color="primary"
                            variant="flat"
                            className="ml-2"
                          >
                            默认
                          </Chip>
                        )}
                      </div>
                      <div className="text-xs text-default-500">
                        {template.statistics.productCount} 个商品
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </Select>
              {selectedTemplateId && (
                <div className="text-sm text-default-500">
                  当前模板:{" "}
                  <span className="font-medium">
                    {templates.find(t => t.id === selectedTemplateId)?.name ||
                      "未知模板"}
                  </span>
                </div>
              )}
              {!selectedTemplateId && !templatesLoading && (
                <div className="text-sm text-warning">
                  请先选择一个模板来管理商品
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {/* 搜索过滤器 */}
        <ProductSearchBar
          onSearch={searchFilters => {
            setFilters(searchFilters)
            setPage(1)
            setSelectedKeys(new Set())
            // 使用新的filters立即搜索
            if (selectedTemplateId) {
              fetchProductsWithFilters(searchFilters)
              fetchAllProductIdsWithFilters(searchFilters)
            }
          }}
          onClear={() => {
            setFilters({})
            setPage(1)
            setSelectedKeys(new Set())
            // 使用空filters立即搜索
            if (selectedTemplateId) {
              fetchProductsWithFilters({})
              fetchAllProductIdsWithFilters({})
            }
          }}
          isLoading={loading}
        />

        {/* 批量操作工具栏 */}
        {selectedKeys.size > 0 && (
          <Card>
            <CardBody>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-sm text-default-600">
                    已选择 {selectedKeys.size} 个商品
                  </span>
                  <Button
                    size="sm"
                    variant="light"
                    onClick={() => setSelectedKeys(new Set())}
                    startContent={<X className="h-4 w-4" />}
                  >
                    取消选择
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    color="success"
                    variant="flat"
                    onClick={() => batchOperation("activate")}
                    isLoading={batchLoading}
                    startContent={<CheckCircle className="h-4 w-4" />}
                  >
                    批量启用
                  </Button>
                  <Button
                    size="sm"
                    color="warning"
                    variant="flat"
                    onClick={() => batchOperation("deactivate")}
                    isLoading={batchLoading}
                    startContent={<XCircle className="h-4 w-4" />}
                  >
                    批量禁用
                  </Button>
                  <Button
                    size="sm"
                    color="danger"
                    variant="flat"
                    onClick={handleBatchDelete}
                    isLoading={batchLoading}
                    startContent={<Trash2 className="h-4 w-4" />}
                  >
                    批量删除
                  </Button>
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* 产品表格 */}
        <Card>
          <CardHeader className="flex justify-between">
            <div>
              <h2 className="text-lg font-semibold">产品列表</h2>
              <p className="text-sm text-default-500">共 {total} 个商品</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-default-500">每页显示</span>
              <Select
                size="sm"
                variant="bordered"
                selectedKeys={new Set([limit.toString()])}
                className="w-32"
                onSelectionChange={keys => {
                  const selectedKey = Array.from(keys as Set<string>)[0]
                  if (selectedKey) {
                    handleLimitChange(Number(selectedKey))
                  }
                }}
              >
                {pageSizeOptions.map(option => (
                  <SelectItem key={option.value.toString()}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
            </div>
          </CardHeader>
          <CardBody>
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="h-6 w-6 animate-spin" />
                <span className="ml-2">加载中...</span>
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={<Package className="h-12 w-12" />}
                title="暂无商品数据"
                description="开始添加您的第一个商品，或导入现有的商品数据"
                action={{
                  label: "批量导入",
                  onClick: onUploadOpen,
                }}
              />
            ) : (
              <>
                <Table aria-label="产品表格">
                  <TableHeader>
                    <TableColumn width={80}>
                      <div className="flex items-center gap-1">
                        <Checkbox
                          isSelected={isPageAllSelected}
                          isIndeterminate={
                            isIndeterminate && !isPageAllSelected
                          }
                          onChange={togglePageSelection}
                        />
                        <Dropdown>
                          <DropdownTrigger>
                            <Button
                              isIconOnly
                              size="sm"
                              variant="light"
                              className="h-6 w-6 min-w-6"
                              isLoading={allIdsLoading}
                            >
                              <MoreVertical className="h-3 w-3" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu
                            aria-label="选择选项"
                            onAction={key => {
                              if (key === "select-all") {
                                selectAllPages()
                              } else if (key === "select-page") {
                                togglePageSelection()
                              } else if (key === "clear-all") {
                                setSelectedKeys(new Set())
                              }
                            }}
                          >
                            <DropdownItem key="select-page">
                              {isPageAllSelected ? "取消当前页" : "选择当前页"}
                            </DropdownItem>
                            <DropdownItem key="select-all">
                              {isAllSelected
                                ? "取消全选"
                                : `全选所有 (${allProductIds.length})`}
                            </DropdownItem>
                            <DropdownItem
                              key="clear-all"
                              className="text-danger"
                            >
                              清空选择
                            </DropdownItem>
                          </DropdownMenu>
                        </Dropdown>
                      </div>
                    </TableColumn>
                    <TableColumn>商品信息</TableColumn>
                    <TableColumn>品牌/企业</TableColumn>
                    <TableColumn>编码信息</TableColumn>
                    <TableColumn>规格</TableColumn>
                    <TableColumn>价格信息</TableColumn>
                    <TableColumn>特性</TableColumn>
                    <TableColumn>状态</TableColumn>
                    <TableColumn width={120}>操作</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {products.map(product => (
                      <TableRow key={product._id}>
                        <TableCell>
                          <Checkbox
                            isSelected={selectedKeys.has(product._id)}
                            onChange={() => toggleSelection(product._id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {product.name || "未知商品"}
                            </p>
                            <div className="mt-1 flex gap-2">
                              {product.productType && (
                                <Chip size="sm" variant="flat" color="primary">
                                  {product.productType}
                                </Chip>
                              )}
                              {product.packageType && (
                                <Chip
                                  size="sm"
                                  variant="flat"
                                  color="secondary"
                                >
                                  {product.packageType}
                                </Chip>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {product.brand || "未知品牌"}
                            </p>
                            {product.company && (
                              <p className="text-xs text-default-500">
                                {product.company}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {product.productCode && (
                              <div>
                                <span className="text-xs text-default-500">
                                  产品码:
                                </span>
                                <code className="ml-1 rounded bg-default-100 px-1 text-xs">
                                  {product.productCode}
                                </code>
                              </div>
                            )}
                            {product.boxCode && (
                              <div>
                                <span className="text-xs text-default-500">
                                  盒码:
                                </span>
                                <code className="ml-1 rounded bg-default-100 px-1 text-xs">
                                  {product.boxCode}
                                </code>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-xs">
                            {product.specifications?.circumference && (
                              <div>
                                周长: {product.specifications.circumference}mm
                              </div>
                            )}
                            {product.specifications?.length && (
                              <div>长度: {product.specifications.length}</div>
                            )}
                            {product.specifications?.packageQuantity && (
                              <div>
                                {product.specifications.packageQuantity}支装
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {/* 公司价 - 主要显示 */}
                            {product.pricing?.companyPrice && (
                              <div className="text-base font-bold text-primary">
                                ¥{product.pricing.companyPrice}
                                <span className="ml-1 text-xs text-default-500">
                                  公司价/{product.pricing.unit || "条"}
                                </span>
                              </div>
                            )}
                            {/* 零售价 - 次要显示 */}
                            {product.pricing?.retailPrice && (
                              <div className="text-sm text-default-500">
                                零售价: ¥{product.pricing.retailPrice}
                              </div>
                            )}
                            {/* 价格类型 */}
                            {product.pricing?.priceCategory && (
                              <Chip
                                size="sm"
                                variant="flat"
                                color={
                                  product.pricing.priceCategory === "一类"
                                    ? "success"
                                    : product.pricing.priceCategory === "二类"
                                      ? "warning"
                                      : "default"
                                }
                              >
                                {product.pricing.priceCategory}
                              </Chip>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <div className="flex flex-wrap gap-1">
                              {product.features?.hasPop && (
                                <Chip size="sm" variant="flat" color="warning">
                                  爆珠
                                </Chip>
                              )}
                              {product.appearance?.color && (
                                <Chip size="sm" variant="flat" color="default">
                                  {product.appearance.color}
                                </Chip>
                              )}
                            </div>
                            {product.chemicalContent?.tarContent && (
                              <div className="text-xs text-default-500">
                                焦油{product.chemicalContent.tarContent}mg
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {renderStatusChip(product.isActive ?? true)}
                        </TableCell>
                        <TableCell>{renderActions(product)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* 分页 */}
                <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
                  <div className="text-sm text-default-500">
                    显示第 {(page - 1) * limit + 1} -{" "}
                    {Math.min(page * limit, total)} 条，共 {total} 条
                  </div>
                  <Pagination
                    total={Math.ceil(total / limit)}
                    page={page}
                    onChange={setPage}
                    showControls
                    showShadow
                    color="primary"
                  />
                  <div className="text-sm text-default-500">
                    第 {page} 页，共 {Math.ceil(total / limit)} 页
                  </div>
                </div>
              </>
            )}
          </CardBody>
        </Card>

        {/* 文件上传模态框 */}
        <RealProgressUpload
          isOpen={isUploadOpen}
          onClose={onUploadClose}
          endpoint={buildApiUrl("/products/upload")}
          templateId={selectedTemplateId}
          onSuccess={handleUploadSuccess}
          acceptedFileTypes={[".csv", ".xlsx", ".xls"]}
          maxFileSize={10}
        />

        {/* 删除确认模态框 */}
        <ConfirmModal
          isOpen={isDeleteOpen}
          onOpenChange={onDeleteClose}
          onConfirm={confirmDelete}
          title="确认删除"
          message="您确定要删除这个商品吗？此操作无法撤销。"
          type="danger"
          confirmText="删除"
          cancelText="取消"
        />

        {/* 批量删除确认模态框 */}
        <ConfirmModal
          isOpen={isBatchDeleteOpen}
          onOpenChange={onBatchDeleteClose}
          onConfirm={confirmBatchDelete}
          title="确认批量删除"
          message={`您确定要删除选中的 ${selectedKeys.size} 个商品吗？此操作无法撤销。`}
          type="danger"
          confirmText="删除"
          cancelText="取消"
          isLoading={batchLoading}
        />

        {/* 编辑商品模态框 */}
        <Modal
          isOpen={isEditOpen}
          onClose={onEditClose}
          size="5xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            {onClose => {
              const submitFormRef = useRef<(() => void) | null>(null)

              return (
                <>
                  <ModalHeader>编辑商品</ModalHeader>
                  <ModalBody>
                    <ProductForm
                      product={editingProduct}
                      onSubmit={updateProduct}
                      onCancel={onEditClose}
                      isLoading={loading}
                      renderButtons={() => null}
                      exposeSubmit={submitFn => {
                        submitFormRef.current = submitFn
                      }}
                    />
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="light" onPress={onEditClose}>
                      取消
                    </Button>
                    <Button
                      color="primary"
                      onPress={() => {
                        if (submitFormRef.current) {
                          submitFormRef.current()
                        }
                      }}
                      isLoading={loading}
                    >
                      更新
                    </Button>
                  </ModalFooter>
                </>
              )
            }}
          </ModalContent>
        </Modal>

        {/* 新增商品模态框 */}
        <Modal
          isOpen={isCreateOpen}
          onClose={onCreateClose}
          size="5xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            {onClose => {
              const submitFormRef = useRef<(() => void) | null>(null)

              return (
                <>
                  <ModalHeader>新增商品</ModalHeader>
                  <ModalBody>
                    <ProductForm
                      onSubmit={createProduct}
                      onCancel={onCreateClose}
                      isLoading={loading}
                      renderButtons={() => null}
                      exposeSubmit={submitFn => {
                        submitFormRef.current = submitFn
                      }}
                    />
                  </ModalBody>
                  <ModalFooter>
                    <Button variant="light" onPress={onCreateClose}>
                      取消
                    </Button>
                    <Button
                      color="primary"
                      onPress={() => {
                        if (submitFormRef.current) {
                          submitFormRef.current()
                        }
                      }}
                      isLoading={loading}
                    >
                      创建
                    </Button>
                  </ModalFooter>
                </>
              )
            }}
          </ModalContent>
        </Modal>
      </div>
    </TemplateContext.Provider>
  )
}
