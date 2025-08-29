"use client"

import { useState, useEffect, useMemo, createContext, useContext } from "react"
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
  Eye,
  Edit,
  Trash2,
  MoreVertical,
  RefreshCw,
  CheckSquare,
  Square,
  X,
  CheckCircle,
  XCircle,
} from "lucide-react"
import { FileUpload } from "@/components/ui/file-upload"
import { ConfirmModal } from "@/components/ui/confirm-modal"
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
  boxCode: string
  barcode: string
  companyPrice: number
  brand: string
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

// 商品表单组件
interface ProductFormProps {
  product?: Product | null
  onSubmit: (data: any) => void
  onCancel: () => void
  isLoading?: boolean
}

function ProductForm({
  product,
  onSubmit,
  onCancel,
  isLoading = false,
}: ProductFormProps) {
  // 从父组件获取selectedTemplateId
  const selectedTemplateId = useContext(TemplateContext) || ""
  const [formData, setFormData] = useState({
    name: product?.name || "",
    brand: product?.brand || "",
    category: product?.category || "",
    companyPrice: product?.companyPrice || 0,
    boxCode: product?.boxCode || "",
    barcode: product?.barcode || "",
    keywords: product?.keywords?.join(", ") || "",
    isActive: product?.isActive ?? true,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // 验证必填字段
    if (!formData.name.trim()) {
      return
    }
    if (!formData.brand.trim()) {
      return
    }

    // 处理关键词
    const keywords = formData.keywords
      .split(",")
      .map(k => k.trim())
      .filter(k => k.length > 0)

    const submitData = {
      ...formData,
      templateId: selectedTemplateId,
      keywords,
      companyPrice: Number(formData.companyPrice) || 0,
    }

    onSubmit(submitData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Input
          label="商品名称"
          placeholder="输入商品名称"
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          isRequired
        />
        <Input
          label="品牌"
          placeholder="输入品牌"
          value={formData.brand}
          onChange={e => setFormData({ ...formData, brand: e.target.value })}
          isRequired
        />
        <Input
          label="分类"
          placeholder="输入分类"
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value })}
        />
        <Input
          label="公司价"
          type="number"
          placeholder="0.00"
          value={formData.companyPrice.toString()}
          onChange={e =>
            setFormData({ ...formData, companyPrice: Number(e.target.value) })
          }
          startContent={<span className="text-default-400">¥</span>}
        />
        <Input
          label="盒码"
          placeholder="输入盒码"
          value={formData.boxCode}
          onChange={e => setFormData({ ...formData, boxCode: e.target.value })}
        />
        <Input
          label="条码"
          placeholder="输入条码"
          value={formData.barcode}
          onChange={e => setFormData({ ...formData, barcode: e.target.value })}
        />
      </div>

      <Textarea
        label="关键词"
        placeholder="多个关键词用逗号分隔"
        value={formData.keywords}
        onChange={e => setFormData({ ...formData, keywords: e.target.value })}
        rows={3}
      />

      <Checkbox
        isSelected={formData.isActive}
        onValueChange={checked =>
          setFormData({ ...formData, isActive: checked })
        }
      >
        启用商品
      </Checkbox>

      <Divider />

      <div className="flex justify-end gap-2">
        <Button variant="light" onPress={onCancel}>
          取消
        </Button>
        <Button color="primary" type="submit" isLoading={isLoading}>
          {product ? "更新" : "创建"}
        </Button>
      </div>
    </form>
  )
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(10) // 默认10条，改为可变
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState("")
  const [selectedKeys, setSelectedKeys] = useState(new Set<string>())
  const [batchLoading, setBatchLoading] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [allProductIds, setAllProductIds] = useState<string[]>([])
  const [allIdsLoading, setAllIdsLoading] = useState(false)
  const [isClient, setIsClient] = useState(false)

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
        headers: {
          Authorization: "Bearer dev-mock-token",
        },
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

  // 简单直接的数据获取函数
  const fetchProducts = async () => {
    if (!selectedTemplateId) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      console.log(
        `🔥 获取产品数据 - 页码: ${page}, 搜索: ${search}, 模板: ${selectedTemplateId}`
      )

      // 使用统一的API配置
      const baseUrl = buildApiUrl(API_ROUTES.PRODUCTS.LIST)
      const url = new URL(baseUrl)
      url.searchParams.set("templateId", selectedTemplateId)
      url.searchParams.set("page", page.toString())
      url.searchParams.set("limit", limit.toString())
      if (search) url.searchParams.set("search", search)

      console.log(`🔗 请求URL: ${url.toString()}`)

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: "Bearer dev-mock-token",
          "Content-Type": "application/json",
        },
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
          headers: {
            Authorization: "Bearer dev-mock-token",
          },
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      console.log("✅ 产品删除成功")
      notifications.success("删除成功", "商品已成功删除")
      if (selectedTemplateId) {
        await fetchProducts() // 重新获取数据
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
          headers: {
            Authorization: "Bearer dev-mock-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids }),
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
        headers: {
          Authorization: "Bearer dev-mock-token",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ids, action }),
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
          headers: {
            Authorization: "Bearer dev-mock-token",
            "Content-Type": "application/json",
          },
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
        headers: {
          Authorization: "Bearer dev-mock-token",
          "Content-Type": "application/json",
        },
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
      }
    } catch (error) {
      console.error("❌ 商品创建失败:", error)
      notifications.error(
        "创建失败",
        error instanceof Error ? error.message : "未知错误"
      )
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
      if (search) url.searchParams.set("search", search)

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: "Bearer dev-mock-token",
          "Content-Type": "application/json",
        },
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
  const handleUploadSuccess = async () => {
    console.log("🎉 上传成功，刷新数据")
    notifications.success("上传成功", "文件已成功上传并导入商品数据")
    onUploadClose()
    if (selectedTemplateId) {
      await fetchProducts()
    }
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
      <div className="flex items-center gap-2">
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onClick={() => console.log("查看", product._id)}
        >
          <Eye className="h-4 w-4" />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          onClick={() => handleEdit(product)}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          isIconOnly
          size="sm"
          variant="light"
          color="danger"
          onClick={() => handleDelete(product._id)}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  // useEffect hooks - 必须在组件顶部
  useEffect(() => {
    fetchTemplates()
    setIsClient(true) // 标记客户端已挂载
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
  }, [search, selectedTemplateId])

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

        {/* 搜索和筛选 */}
        <Card>
          <CardBody>
            <div className="flex gap-4">
              <Input
                placeholder="搜索商品名称、品牌、条码..."
                value={search}
                onValueChange={setSearch}
                onKeyDown={e => e.key === "Enter" && handleSearch()}
                startContent={<Search className="h-4 w-4 text-default-400" />}
                className="flex-1"
              />
              <Button color="primary" onClick={handleSearch}>
                搜索
              </Button>
            </div>
          </CardBody>
        </Card>

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
                icon={isClient ? <Package className="h-12 w-12" /> : null}
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
                    <TableColumn>商品名称</TableColumn>
                    <TableColumn>盒码</TableColumn>
                    <TableColumn>条码</TableColumn>
                    <TableColumn>公司价</TableColumn>
                    <TableColumn>品牌</TableColumn>
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
                            {product.keywords &&
                              product.keywords.length > 0 && (
                                <p className="text-xs text-default-500">
                                  {product.keywords.slice(0, 3).join(", ")}
                                  {product.keywords.length > 3 && "..."}
                                </p>
                              )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-default-100 px-2 py-1 text-xs">
                            {product.boxCode || "无"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <code className="rounded bg-default-100 px-2 py-1 text-xs">
                            {product.barcode || "无"}
                          </code>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium text-success">
                            ¥{(product.companyPrice || 0).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>{product.brand || "未知品牌"}</TableCell>
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
        <Modal isOpen={isUploadOpen} onClose={onUploadClose} size="3xl">
          <ModalContent>
            <ModalHeader>批量导入商品</ModalHeader>
            <ModalBody>
              <FileUpload
                onUploadSuccess={handleUploadSuccess}
                acceptedFileTypes={[".xlsx", ".xls", ".csv"]}
                maxFileSize={10}
                endpoint={buildApiUrl(
                  API_ROUTES.PRODUCTS.UPLOAD(selectedTemplateId)
                )}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onUploadClose}>
                取消
              </Button>
            </ModalFooter>
          </ModalContent>
        </Modal>

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
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader>编辑商品</ModalHeader>
            <ModalBody>
              <ProductForm
                product={editingProduct}
                onSubmit={updateProduct}
                onCancel={onEditClose}
                isLoading={loading}
              />
            </ModalBody>
          </ModalContent>
        </Modal>

        {/* 新增商品模态框 */}
        <Modal
          isOpen={isCreateOpen}
          onClose={onCreateClose}
          size="3xl"
          scrollBehavior="inside"
        >
          <ModalContent>
            <ModalHeader>新增商品</ModalHeader>
            <ModalBody>
              <ProductForm
                onSubmit={createProduct}
                onCancel={onCreateClose}
                isLoading={loading}
              />
            </ModalBody>
          </ModalContent>
        </Modal>
      </div>
    </TemplateContext.Provider>
  )
}
