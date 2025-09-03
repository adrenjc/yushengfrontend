"use client"

import { useState, useEffect, useMemo } from "react"
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
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Textarea,
  Switch,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Pagination,
} from "@nextui-org/react"
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Copy,
  Star,
  Settings,
  Package,
  TrendingUp,
  Calendar,
  MoreVertical,
  ChevronDown,
  Eye,
} from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { useNotifications } from "@/stores/app"
import { buildApiUrl, apiGet, apiPost, apiPut, apiDelete } from "@/lib/api"
import { getAuthHeaders } from "@/lib/auth"

interface ProductTemplate {
  id: string
  name: string
  description: string
  category: string
  settings: {
    matchingThresholds: {
      autoConfirm: number
      manualReview: number
      expertReview: number
    }
    priceValidation: boolean
    allowCrossTemplateSearch: boolean
  }
  statistics: {
    productCount: number
    matchingTaskCount: number
    lastUsedAt: string | null
  }
  createdBy: {
    _id: string
    name: string
    email: string
  }
  isActive: boolean
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface TemplateFormData {
  name: string
  description: string
  category: string
  settings: {
    matchingThresholds: {
      autoConfirm: number
      manualReview: number
      expertReview: number
    }
    priceValidation: boolean
    allowCrossTemplateSearch: boolean
  }
}

const defaultFormData: TemplateFormData = {
  name: "",
  description: "",
  category: "默认分类",
  settings: {
    matchingThresholds: {
      autoConfirm: 65,
      manualReview: 40,
      expertReview: 15,
    },
    priceValidation: true,
    allowCrossTemplateSearch: false,
  },
}

const StatusChip = ({
  isActive,
  isDefault,
}: {
  isActive: boolean
  isDefault: boolean
}) => {
  if (isDefault) {
    return (
      <Chip
        variant="flat"
        color="primary"
        size="sm"
        startContent={<Star className="h-3 w-3" />}
      >
        默认模板
      </Chip>
    )
  }

  return (
    <Chip variant="flat" color={isActive ? "success" : "default"} size="sm">
      {isActive ? "启用" : "禁用"}
    </Chip>
  )
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<ProductTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [total, setTotal] = useState(0)

  // 模态框状态
  const {
    isOpen: isCreateOpen,
    onOpen: onCreateOpen,
    onClose: onCreateClose,
  } = useDisclosure()
  const {
    isOpen: isEditOpen,
    onOpen: onEditOpen,
    onClose: onEditClose,
  } = useDisclosure()
  const {
    isOpen: isDeleteOpen,
    onOpen: onDeleteOpen,
    onClose: onDeleteClose,
  } = useDisclosure()
  const {
    isOpen: isCopyOpen,
    onOpen: onCopyOpen,
    onClose: onCopyClose,
  } = useDisclosure()

  // 表单状态
  const [formData, setFormData] = useState<TemplateFormData>(defaultFormData)
  const [editingTemplate, setEditingTemplate] =
    useState<ProductTemplate | null>(null)
  const [copyingTemplate, setCopyingTemplate] =
    useState<ProductTemplate | null>(null)
  const [deletingTemplate, setDeletingTemplate] =
    useState<ProductTemplate | null>(null)
  const [copyName, setCopyName] = useState("")

  // 操作状态
  const [submitLoading, setSubmitLoading] = useState(false)

  // 通知系统
  const notifications = useNotifications()

  // 获取模板列表
  const fetchTemplates = async () => {
    try {
      setLoading(true)
      const params = {
        page: currentPage.toString(),
        limit: pageSize.toString(),
        ...(searchQuery && { search: searchQuery }),
        ...(categoryFilter !== "all" && { category: categoryFilter }),
        ...(statusFilter !== "all" && { isActive: statusFilter }),
      }

      const data = await apiGet("/templates", params)
      setTemplates(data.data.templates || [])
      setTotal(data.data.pagination.total || 0)
    } catch (error) {
      console.error("❌ 获取模板列表失败:", error)
      // 如果是认证错误，会自动处理跳转，这里不需要显示错误
      if (!(error as any)?.isAuthError) {
        notifications.error(
          "加载失败",
          (error as Error).message || "无法获取模板列表"
        )
      }
    } finally {
      setLoading(false)
    }
  }

  // 创建模板
  const handleCreate = async () => {
    if (!formData.name.trim()) {
      notifications.error("请填写模板名称", "模板名称不能为空")
      return
    }

    setSubmitLoading(true)
    try {
      await apiPost("/templates", formData)
      notifications.success("创建成功", "模板已创建")
      onCreateClose()
      setFormData(defaultFormData)
      await fetchTemplates()
    } catch (error) {
      console.error("❌ 创建模板失败:", error)
      // 如果是认证错误，会自动处理跳转，这里不需要显示错误
      if (!(error as any)?.isAuthError) {
        notifications.error(
          "创建失败",
          (error as Error).message || "无法创建模板"
        )
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  // 更新模板
  const handleUpdate = async () => {
    if (!editingTemplate || !formData.name.trim()) {
      return
    }

    setSubmitLoading(true)
    try {
      await apiPut(`/templates/${editingTemplate.id}`, formData)
      notifications.success("更新成功", "模板已更新")
      onEditClose()
      setEditingTemplate(null)
      setFormData(defaultFormData)
      await fetchTemplates()
    } catch (error) {
      console.error("❌ 更新模板失败:", error)
      // 如果是认证错误，会自动处理跳转，这里不需要显示错误
      if (!(error as any)?.isAuthError) {
        notifications.error(
          "更新失败",
          (error as Error).message || "无法更新模板"
        )
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  // 删除模板
  const handleDelete = async () => {
    if (!deletingTemplate) return

    setSubmitLoading(true)
    try {
      await apiDelete(`/templates/${deletingTemplate.id}`)
      notifications.success("删除成功", "模板已删除")
      onDeleteClose()
      setDeletingTemplate(null)
      await fetchTemplates()
    } catch (error) {
      console.error("❌ 删除模板失败:", error)
      // 如果是认证错误，会自动处理跳转，这里不需要显示错误
      if (!(error as any)?.isAuthError) {
        notifications.error(
          "删除失败",
          (error as Error).message || "无法删除模板"
        )
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  // 复制模板
  const handleCopy = async () => {
    if (!copyingTemplate || !copyName.trim()) {
      notifications.error("请填写新模板名称", "新模板名称不能为空")
      return
    }

    setSubmitLoading(true)
    try {
      await apiPost(`/templates/${copyingTemplate.id}/copy`, { name: copyName })
      notifications.success("复制成功", "模板已复制")
      onCopyClose()
      setCopyingTemplate(null)
      setCopyName("")
      await fetchTemplates()
    } catch (error) {
      console.error("❌ 复制模板失败:", error)
      // 如果是认证错误，会自动处理跳转，这里不需要显示错误
      if (!(error as any)?.isAuthError) {
        notifications.error(
          "复制失败",
          (error as Error).message || "无法复制模板"
        )
      }
    } finally {
      setSubmitLoading(false)
    }
  }

  // 设置默认模板
  const handleSetDefault = async (template: ProductTemplate) => {
    try {
      // 使用 apiRequest 但是 PATCH 方法，所以用 fetch 但显式处理认证错误
      const response = await fetch(
        buildApiUrl(`/templates/${template.id}/default`),
        {
          method: "PATCH",
          headers: getAuthHeaders(),
        }
      )

      if (!response.ok) {
        // 尝试解析错误响应
        let errorData = null
        try {
          errorData = await response.json()
        } catch {}

        // 检查是否为认证错误
        if (response.status === 401 && errorData?.isAuthError) {
          // 认证错误，触发登录跳转
          const { useAuthStore } = await import("@/stores/auth")
          const authStore = useAuthStore.getState()
          authStore.logout()

          notifications.warning("登录已过期", errorData.message || "登录已过期")
          setTimeout(() => {
            window.location.href = "/auth/login"
          }, 1000)
          return
        }

        throw new Error(errorData?.message || "无法设置默认模板")
      }

      notifications.success("设置成功", `${template.name} 已设为默认模板`)
      await fetchTemplates()
    } catch (error) {
      console.error("❌ 设置默认模板失败:", error)
      if (!(error as any)?.isAuthError) {
        notifications.error(
          "设置失败",
          (error as Error).message || "无法设置默认模板"
        )
      }
    }
  }

  // 编辑模板
  const startEdit = (template: ProductTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      description: template.description,
      category: template.category,
      settings: template.settings,
    })
    onEditOpen()
  }

  // 开始复制
  const startCopy = (template: ProductTemplate) => {
    setCopyingTemplate(template)
    setCopyName(`${template.name}_副本`)
    onCopyOpen()
  }

  // 开始删除
  const startDelete = (template: ProductTemplate) => {
    setDeletingTemplate(template)
    onDeleteOpen()
  }

  // 过滤数据
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        template.description.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesCategory =
        categoryFilter === "all" || template.category === categoryFilter
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "true" && template.isActive) ||
        (statusFilter === "false" && !template.isActive)

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [templates, searchQuery, categoryFilter, statusFilter])

  // 获取分类选项
  const categoryOptions = useMemo(() => {
    const categories = new Set(templates.map(t => t.category))
    return Array.from(categories).sort()
  }, [templates])

  useEffect(() => {
    fetchTemplates()
  }, [currentPage, pageSize])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, categoryFilter, statusFilter])

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">模板管理</h1>
          <p className="text-default-500">
            管理商品模板，每个模板包含独立的商品库
          </p>
        </div>
        <Button
          color="primary"
          startContent={<Plus className="h-4 w-4" />}
          onPress={onCreateOpen}
        >
          创建模板
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-default-500">总模板数</p>
                <p className="text-xl font-bold">{total}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-success/10 p-2">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-default-500">启用模板</p>
                <p className="text-xl font-bold">
                  {templates.filter(t => t.isActive).length}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-warning/10 p-2">
                <Star className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-default-500">默认模板</p>
                <p className="text-xl font-bold">
                  {templates.find(t => t.isDefault)?.name || "无"}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-secondary/10 p-2">
                <Calendar className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-default-500">总商品数</p>
                <p className="text-xl font-bold">
                  {templates.reduce(
                    (sum, t) => sum + t.statistics.productCount,
                    0
                  )}
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 筛选和搜索 */}
      <Card>
        <CardBody className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <Input
              placeholder="搜索模板..."
              startContent={<Search className="h-4 w-4" />}
              value={searchQuery}
              onValueChange={setSearchQuery}
              className="max-w-xs"
              size="sm"
            />
            <Select
              placeholder="分类筛选"
              selectedKeys={
                categoryFilter === "all" ? new Set() : new Set([categoryFilter])
              }
              onSelectionChange={keys =>
                setCategoryFilter(
                  (Array.from(keys as Set<string>)[0] as string) || "all"
                )
              }
              className="max-w-xs"
              size="sm"
            >
              <>
                <SelectItem key="all">全部分类</SelectItem>
                {categoryOptions.map(category => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </>
            </Select>
            <Select
              placeholder="状态筛选"
              selectedKeys={
                statusFilter === "all" ? new Set() : new Set([statusFilter])
              }
              onSelectionChange={keys =>
                setStatusFilter(
                  (Array.from(keys as Set<string>)[0] as string) || "all"
                )
              }
              className="max-w-xs"
              size="sm"
            >
              <SelectItem key="all">全部状态</SelectItem>
              <SelectItem key="true">启用</SelectItem>
              <SelectItem key="false">禁用</SelectItem>
            </Select>
            <div className="ml-auto text-sm text-default-500">
              共 {filteredTemplates.length} 个模板
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 模板列表 */}
      <Card>
        <CardBody>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
                <p>加载中...</p>
              </div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <EmptyState
              icon={<Package className="h-12 w-12" />}
              title="暂无模板"
              description="点击上方按钮创建第一个模板"
            />
          ) : (
            <>
              <Table aria-label="模板列表">
                <TableHeader>
                  <TableColumn>模板信息</TableColumn>
                  <TableColumn>分类</TableColumn>
                  <TableColumn>统计信息</TableColumn>
                  <TableColumn>状态</TableColumn>
                  <TableColumn>创建信息</TableColumn>
                  <TableColumn>操作</TableColumn>
                </TableHeader>
                <TableBody>
                  {filteredTemplates.map(template => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-xs text-default-500">
                            {template.description || "无描述"}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Chip variant="flat" size="sm">
                          {template.category}
                        </Chip>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="text-sm">
                            商品: {template.statistics.productCount}
                          </p>
                          <p className="text-xs text-default-500">
                            任务: {template.statistics.matchingTaskCount}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusChip
                          isActive={template.isActive}
                          isDefault={template.isDefault}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">
                            {template.createdBy?.name || "系统"}
                          </p>
                          <p className="text-xs text-default-500">
                            {new Date(template.createdAt).toLocaleDateString(
                              "zh-CN"
                            )}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Dropdown>
                          <DropdownTrigger>
                            <Button variant="light" size="sm" isIconOnly>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownTrigger>
                          <DropdownMenu aria-label="操作菜单">
                            <DropdownItem
                              key="edit"
                              startContent={<Edit className="h-4 w-4" />}
                              onClick={() => startEdit(template)}
                            >
                              编辑
                            </DropdownItem>
                            <DropdownItem
                              key="copy"
                              startContent={<Copy className="h-4 w-4" />}
                              onClick={() => startCopy(template)}
                            >
                              复制
                            </DropdownItem>
                            {!template.isDefault ? (
                              <DropdownItem
                                key="default"
                                startContent={<Star className="h-4 w-4" />}
                                onClick={() => handleSetDefault(template)}
                              >
                                设为默认
                              </DropdownItem>
                            ) : null}
                            {!template.isDefault ? (
                              <DropdownItem
                                key="delete"
                                startContent={<Trash2 className="h-4 w-4" />}
                                color="danger"
                                onClick={() => startDelete(template)}
                              >
                                删除
                              </DropdownItem>
                            ) : null}
                          </DropdownMenu>
                        </Dropdown>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* 分页 */}
              {Math.ceil(total / pageSize) > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-default-500">
                    显示 {(currentPage - 1) * pageSize + 1} -{" "}
                    {Math.min(currentPage * pageSize, total)} 条， 共 {total}{" "}
                    条记录
                  </div>
                  <Pagination
                    page={currentPage}
                    total={Math.ceil(total / pageSize)}
                    onChange={setCurrentPage}
                    showControls
                    showShadow
                    size="sm"
                  />
                </div>
              )}
            </>
          )}
        </CardBody>
      </Card>

      {/* 创建模板模态框 */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="2xl">
        <ModalContent>
          <ModalHeader>创建模板</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="模板名称"
                placeholder="请输入模板名称"
                value={formData.name}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, name: value }))
                }
                isRequired
              />
              <Textarea
                label="模板描述"
                placeholder="请输入模板描述（可选）"
                value={formData.description}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, description: value }))
                }
              />
              <Input
                label="分类"
                placeholder="请输入分类"
                value={formData.category}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, category: value }))
                }
              />

              <div className="space-y-3">
                <h4 className="text-medium font-medium">匹配阈值配置</h4>
                <Input
                  type="number"
                  label="自动确认阈值"
                  placeholder="65"
                  value={formData.settings.matchingThresholds.autoConfirm.toString()}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        matchingThresholds: {
                          ...prev.settings.matchingThresholds,
                          autoConfirm: parseInt(value) || 65,
                        },
                      },
                    }))
                  }
                />
                <Input
                  type="number"
                  label="人工审核阈值"
                  placeholder="40"
                  value={formData.settings.matchingThresholds.manualReview.toString()}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        matchingThresholds: {
                          ...prev.settings.matchingThresholds,
                          manualReview: parseInt(value) || 40,
                        },
                      },
                    }))
                  }
                />
                <Input
                  type="number"
                  label="专家审核阈值"
                  placeholder="15"
                  value={formData.settings.matchingThresholds.expertReview.toString()}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        matchingThresholds: {
                          ...prev.settings.matchingThresholds,
                          expertReview: parseInt(value) || 15,
                        },
                      },
                    }))
                  }
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-medium font-medium">其他设置</h4>
                <Switch
                  isSelected={formData.settings.priceValidation}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        priceValidation: value,
                      },
                    }))
                  }
                >
                  启用价格验证
                </Switch>
                <Switch
                  isSelected={formData.settings.allowCrossTemplateSearch}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        allowCrossTemplateSearch: value,
                      },
                    }))
                  }
                >
                  允许跨模板搜索
                </Switch>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onCreateClose}>
              取消
            </Button>
            <Button
              color="primary"
              onPress={handleCreate}
              isLoading={submitLoading}
            >
              创建
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 编辑模板模态框 */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="2xl">
        <ModalContent>
          <ModalHeader>编辑模板</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="模板名称"
                placeholder="请输入模板名称"
                value={formData.name}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, name: value }))
                }
                isRequired
              />
              <Textarea
                label="模板描述"
                placeholder="请输入模板描述（可选）"
                value={formData.description}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, description: value }))
                }
              />
              <Input
                label="分类"
                placeholder="请输入分类"
                value={formData.category}
                onValueChange={value =>
                  setFormData(prev => ({ ...prev, category: value }))
                }
              />

              <div className="space-y-3">
                <h4 className="text-medium font-medium">匹配阈值配置</h4>
                <Input
                  type="number"
                  label="自动确认阈值"
                  placeholder="65"
                  value={formData.settings.matchingThresholds.autoConfirm.toString()}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        matchingThresholds: {
                          ...prev.settings.matchingThresholds,
                          autoConfirm: parseInt(value) || 65,
                        },
                      },
                    }))
                  }
                />
                <Input
                  type="number"
                  label="人工审核阈值"
                  placeholder="40"
                  value={formData.settings.matchingThresholds.manualReview.toString()}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        matchingThresholds: {
                          ...prev.settings.matchingThresholds,
                          manualReview: parseInt(value) || 40,
                        },
                      },
                    }))
                  }
                />
                <Input
                  type="number"
                  label="专家审核阈值"
                  placeholder="15"
                  value={formData.settings.matchingThresholds.expertReview.toString()}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        matchingThresholds: {
                          ...prev.settings.matchingThresholds,
                          expertReview: parseInt(value) || 15,
                        },
                      },
                    }))
                  }
                />
              </div>

              <div className="space-y-3">
                <h4 className="text-medium font-medium">其他设置</h4>
                <Switch
                  isSelected={formData.settings.priceValidation}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        priceValidation: value,
                      },
                    }))
                  }
                >
                  启用价格验证
                </Switch>
                <Switch
                  isSelected={formData.settings.allowCrossTemplateSearch}
                  onValueChange={value =>
                    setFormData(prev => ({
                      ...prev,
                      settings: {
                        ...prev.settings,
                        allowCrossTemplateSearch: value,
                      },
                    }))
                  }
                >
                  允许跨模板搜索
                </Switch>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onEditClose}>
              取消
            </Button>
            <Button
              color="primary"
              onPress={handleUpdate}
              isLoading={submitLoading}
            >
              更新
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 复制模板模态框 */}
      <Modal isOpen={isCopyOpen} onClose={onCopyClose}>
        <ModalContent>
          <ModalHeader>复制模板</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p className="text-sm text-default-600">
                将复制模板{" "}
                <span className="font-medium">{copyingTemplate?.name}</span>{" "}
                及其所有商品数据
              </p>
              <Input
                label="新模板名称"
                placeholder="请输入新模板名称"
                value={copyName}
                onValueChange={setCopyName}
                isRequired
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onCopyClose}>
              取消
            </Button>
            <Button
              color="primary"
              onPress={handleCopy}
              isLoading={submitLoading}
            >
              复制
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 删除确认模态框 */}
      <Modal isOpen={isDeleteOpen} onClose={onDeleteClose}>
        <ModalContent>
          <ModalHeader>删除模板</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <p>
                确定要删除模板{" "}
                <span className="font-medium">{deletingTemplate?.name}</span>{" "}
                吗？
              </p>
              <div className="rounded-lg bg-danger-50 p-3 text-sm text-danger-700">
                <p className="font-medium">⚠️ 警告</p>
                <p>删除模板将同时删除其包含的所有商品数据，此操作不可恢复！</p>
              </div>
              {deletingTemplate && (
                <div className="text-sm text-default-600">
                  <p>
                    该模板包含{" "}
                    <span className="font-medium">
                      {deletingTemplate.statistics.productCount}
                    </span>{" "}
                    个商品
                  </p>
                  <p>
                    相关联的{" "}
                    <span className="font-medium">
                      {deletingTemplate.statistics.matchingTaskCount}
                    </span>{" "}
                    个匹配任务
                  </p>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onDeleteClose}>
              取消
            </Button>
            <Button
              color="danger"
              onPress={handleDelete}
              isLoading={submitLoading}
            >
              确认删除
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
