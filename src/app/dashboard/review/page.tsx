"use client"

import { useState } from "react"
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tabs,
  Tab,
  Divider,
  Image,
  Badge,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Textarea,
  RadioGroup,
  Radio,
  Select,
  SelectItem,
} from "@nextui-org/react"
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  User,
  Calendar,
  Star,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  MoreVertical,
  Eye,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Flag,
  ClipboardCheck,
} from "lucide-react"
import { EmptyState } from "@/components/ui/empty-state"
import { formatDate, formatCurrency, formatPercentage, cn } from "@/lib/utils"
import type { MatchingRecord } from "@/types"

// 模拟数据
const mockReviewItems: MatchingRecord[] = [
  {
    _id: "1",
    taskId: "task1",
    wholesaleName: "中华软包香烟",
    wholesalePrice: 25.5,
    originalData: {
      name: "中华软包香烟",
      brand: "中华",
      price: 25.5,
      specifications: "20支/包",
      category: "香烟",
    },
    candidates: [
      {
        productId: "prod1",
        productName: "中华(软包)",
        brand: "中华",
        similarity: 94.5,
        confidence: "high",
        reasons: ["品牌完全匹配", "商品名称高度相似", "规格一致"],
        price: 25.0,
        priceMatch: 98.0,
      },
      {
        productId: "prod2",
        productName: "中华(硬包)",
        brand: "中华",
        similarity: 78.2,
        confidence: "medium",
        reasons: ["品牌完全匹配", "商品名称部分相似"],
        price: 26.0,
        priceMatch: 96.2,
      },
    ],
    selectedMatch: null,
    status: "pending",
    priority: "medium",
    reviewHistory: [],
    createdAt: "2024-11-26T10:30:00Z",
    updatedAt: "2024-11-26T10:30:00Z",
  },
  {
    _id: "2",
    taskId: "task1",
    wholesaleName: "玉溪硬包",
    wholesalePrice: 22.0,
    originalData: {
      name: "玉溪硬包",
      brand: "玉溪",
      price: 22.0,
      specifications: "20支/包",
      category: "香烟",
    },
    candidates: [
      {
        productId: "prod3",
        productName: "玉溪(硬包)",
        brand: "玉溪",
        similarity: 96.8,
        confidence: "high",
        reasons: ["品牌完全匹配", "商品名称完全匹配", "价格匹配"],
        price: 22.0,
        priceMatch: 100.0,
      },
    ],
    selectedMatch: null,
    status: "pending",
    priority: "high",
    reviewHistory: [],
    createdAt: "2024-11-26T09:15:00Z",
    updatedAt: "2024-11-26T09:15:00Z",
  },
  {
    _id: "3",
    taskId: "task2",
    wholesaleName: "芙蓉王软包烟",
    wholesalePrice: 28.5,
    originalData: {
      name: "芙蓉王软包烟",
      brand: "芙蓉王",
      price: 28.5,
      specifications: "20支/包",
      category: "香烟",
    },
    candidates: [
      {
        productId: "prod4",
        productName: "芙蓉王(软包)",
        brand: "芙蓉王",
        similarity: 89.3,
        confidence: "medium",
        reasons: ["品牌完全匹配", "商品名称高度相似"],
        price: 28.0,
        priceMatch: 98.2,
      },
      {
        productId: "prod5",
        productName: "芙蓉王(硬包)",
        brand: "芙蓉王",
        similarity: 72.1,
        confidence: "low",
        reasons: ["品牌完全匹配", "商品类型不同"],
        price: 30.0,
        priceMatch: 94.0,
      },
    ],
    selectedMatch: null,
    status: "pending",
    priority: "low",
    exceptions: ["价格差异较大"],
    reviewHistory: [],
    createdAt: "2024-11-25T16:45:00Z",
    updatedAt: "2024-11-25T16:45:00Z",
  },
]

const StatusChip = ({ status }: { status: string }) => {
  const config = {
    pending: {
      color: "warning" as const,
      label: "待审核",
      icon: <Clock className="h-3 w-3" />,
    },
    approved: {
      color: "success" as const,
      label: "已通过",
      icon: <CheckCircle className="h-3 w-3" />,
    },
    rejected: {
      color: "danger" as const,
      label: "已拒绝",
      icon: <XCircle className="h-3 w-3" />,
    },
    exception: {
      color: "danger" as const,
      label: "异常",
      icon: <AlertTriangle className="h-3 w-3" />,
    },
  }

  const { color, label, icon } =
    config[status as keyof typeof config] || config.pending

  return (
    <Chip variant="flat" color={color} size="sm" startContent={icon}>
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

const ConfidenceChip = ({ confidence }: { confidence: string }) => {
  const config = {
    high: {
      color: "success" as const,
      label: "高信心",
      icon: <Star className="h-3 w-3" />,
    },
    medium: {
      color: "warning" as const,
      label: "中信心",
      icon: <Star className="h-3 w-3" />,
    },
    low: {
      color: "danger" as const,
      label: "低信心",
      icon: <Star className="h-3 w-3" />,
    },
  }

  const { color, label, icon } =
    config[confidence as keyof typeof config] || config.medium

  return (
    <Chip variant="flat" color={color} size="sm" startContent={icon}>
      {label}
    </Chip>
  )
}

export default function ReviewPage() {
  const [reviewItems, setReviewItems] =
    useState<MatchingRecord[]>(mockReviewItems)
  const [selectedItem, setSelectedItem] = useState<MatchingRecord | null>(null)
  const [searchValue, setSearchValue] = useState("")
  const [selectedStatus, setSelectedStatus] = useState<string>("all")
  const [selectedPriority, setSelectedPriority] = useState<string>("all")
  const [reviewAction, setReviewAction] = useState<string>("")
  const [reviewComment, setReviewComment] = useState("")
  const [selectedCandidate, setSelectedCandidate] = useState<string>("")

  const {
    isOpen: isReviewOpen,
    onOpen: onReviewOpen,
    onClose: onReviewClose,
  } = useDisclosure()

  const filteredItems = reviewItems.filter(item => {
    const matchesSearch =
      item.originalData?.name
        ?.toLowerCase()
        .includes(searchValue.toLowerCase()) ||
      item.originalData?.brand
        ?.toLowerCase()
        .includes(searchValue.toLowerCase())
    const matchesStatus =
      selectedStatus === "all" || item.status === selectedStatus
    const matchesPriority =
      selectedPriority === "all" || item.priority === selectedPriority

    return matchesSearch && matchesStatus && matchesPriority
  })

  const handleReview = (item: MatchingRecord) => {
    setSelectedItem(item)
    setSelectedCandidate(item.candidates[0]?.productId || "")
    setReviewAction("")
    setReviewComment("")
    onReviewOpen()
  }

  const handleConfirmReview = () => {
    if (!selectedItem || !reviewAction) return

    // TODO: 实现审核逻辑
    console.log("Review action:", {
      itemId: selectedItem._id,
      action: reviewAction,
      selectedCandidate,
      comment: reviewComment,
    })

    // 更新本地状态
    setReviewItems(items =>
      items.map(item =>
        item._id === selectedItem._id
          ? {
              ...item,
              status:
                reviewAction === "approve"
                  ? ("approved" as const)
                  : ("rejected" as const),
              selectedMatch:
                reviewAction === "approve" && selectedCandidate
                  ? {
                      productId: selectedCandidate,
                      confirmedBy: "current-user", // TODO: 使用实际用户ID
                      confirmedAt: new Date().toISOString(),
                      note: reviewComment,
                      confidence: 100,
                    }
                  : null,
            }
          : item
      )
    )

    onReviewClose()
  }

  const handleQuickAction = (
    item: MatchingRecord,
    action: "approve" | "reject"
  ) => {
    // TODO: 实现快速操作逻辑
    console.log("Quick action:", { itemId: item._id, action })

    setReviewItems(items =>
      items.map(i =>
        i._id === item._id
          ? {
              ...i,
              status:
                action === "approve"
                  ? ("approved" as const)
                  : ("rejected" as const),
              selectedMatch:
                action === "approve" && i.candidates[0]
                  ? {
                      productId: i.candidates[0].productId,
                      confirmedBy: "current-user", // TODO: 使用实际用户ID
                      confirmedAt: new Date().toISOString(),
                      note: "",
                      confidence: 100,
                    }
                  : null,
            }
          : i
      )
    )
  }

  const renderItemCell = (item: MatchingRecord, columnKey: React.Key) => {
    switch (columnKey) {
      case "original":
        return (
          <div>
            <p className="font-medium">{item.originalData?.name}</p>
            <p className="text-sm text-default-500">
              {item.originalData?.brand}
            </p>
            <p className="text-sm text-default-400">
              {formatCurrency(item.originalData?.price ?? 0)} |{" "}
              {item.originalData?.specifications}
            </p>
          </div>
        )
      case "candidates":
        const bestCandidate = item.candidates[0]
        return bestCandidate ? (
          <div>
            <div className="mb-1 flex items-center gap-2">
              <p className="font-medium">{bestCandidate.productName}</p>
              <ConfidenceChip confidence={bestCandidate.confidence} />
            </div>
            <p className="text-sm text-default-500">
              相似度: {formatPercentage(bestCandidate.similarity ?? 0)}
            </p>
            <p className="text-sm text-default-400">
              {formatCurrency(bestCandidate.price ?? 0)}
            </p>
            {item.candidates.length > 1 && (
              <Badge content={item.candidates.length} color="primary" size="sm">
                <span className="text-xs text-primary">多个候选</span>
              </Badge>
            )}
          </div>
        ) : (
          <span className="text-default-400">无匹配</span>
        )
      case "status":
        return <StatusChip status={item.status} />
      case "priority":
        return <PriorityChip priority={item.priority} />
      case "createdAt":
        return (
          <div>
            <p className="text-sm">{formatDate(item.createdAt)}</p>
            {item.exceptions && item.exceptions.length > 0 && (
              <div className="mt-1 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-warning" />
                <span className="text-xs text-warning">
                  {item.exceptions[0]}
                </span>
              </div>
            )}
          </div>
        )
      case "actions":
        if (item.status === "pending") {
          return (
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                color="success"
                variant="flat"
                isIconOnly
                onPress={() => handleQuickAction(item, "approve")}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                color="danger"
                variant="flat"
                isIconOnly
                onPress={() => handleQuickAction(item, "reject")}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="flat"
                isIconOnly
                onPress={() => handleReview(item)}
              >
                <Eye className="h-3 w-3" />
              </Button>
            </div>
          )
        } else {
          return (
            <Dropdown>
              <DropdownTrigger>
                <Button isIconOnly variant="light" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownTrigger>
              <DropdownMenu>
                <DropdownItem
                  key="view"
                  startContent={<Eye className="h-4 w-4" />}
                  onPress={() => handleReview(item)}
                >
                  查看详情
                </DropdownItem>
                <DropdownItem
                  key="revert"
                  startContent={<RotateCcw className="h-4 w-4" />}
                >
                  撤销审核
                </DropdownItem>
              </DropdownMenu>
            </Dropdown>
          )
        }
      default:
        return null
    }
  }

  const columns = [
    { key: "original", label: "原始商品" },
    { key: "candidates", label: "匹配候选" },
    { key: "status", label: "状态" },
    { key: "priority", label: "优先级" },
    { key: "createdAt", label: "创建时间" },
    { key: "actions", label: "操作" },
  ]

  const topContent = (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Input
            placeholder="搜索商品..."
            value={searchValue}
            onValueChange={setSearchValue}
            startContent={<Search className="h-4 w-4" />}
            className="w-full sm:max-w-[300px]"
            variant="bordered"
            size="sm"
          />
          <Select
            placeholder="状态"
            selectedKeys={[selectedStatus]}
            onSelectionChange={keys =>
              setSelectedStatus(Array.from(keys)[0] as string)
            }
            className="w-32"
            size="sm"
          >
            <SelectItem key="all">全部</SelectItem>
            <SelectItem key="pending">待审核</SelectItem>
            <SelectItem key="approved">已通过</SelectItem>
            <SelectItem key="rejected">已拒绝</SelectItem>
          </Select>
          <Select
            placeholder="优先级"
            selectedKeys={[selectedPriority]}
            onSelectionChange={keys =>
              setSelectedPriority(Array.from(keys)[0] as string)
            }
            className="w-32"
            size="sm"
          >
            <SelectItem key="all">全部</SelectItem>
            <SelectItem key="high">高</SelectItem>
            <SelectItem key="medium">中</SelectItem>
            <SelectItem key="low">低</SelectItem>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button
            variant="flat"
            size="sm"
            startContent={<Filter className="h-4 w-4" />}
          >
            高级筛选
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-sm text-default-400">
          共 {filteredItems.length} 个待审核项目
        </span>
      </div>
    </div>
  )

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <h1 className="text-2xl font-bold">审核中心</h1>
          <Badge
            content={reviewItems.filter(i => i.status === "pending").length}
            color="warning"
          >
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </Badge>
        </div>
        <p className="text-default-500">审核智能匹配结果，确保数据准确性</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-4">
            <div className="rounded-lg bg-warning/10 p-3">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            <div>
              <p className="text-sm text-default-500">待审核</p>
              <p className="text-xl font-bold">
                {reviewItems.filter(i => i.status === "pending").length}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-4">
            <div className="rounded-lg bg-success/10 p-3">
              <CheckCircle className="h-6 w-6 text-success" />
            </div>
            <div>
              <p className="text-sm text-default-500">已通过</p>
              <p className="text-xl font-bold">
                {reviewItems.filter(i => i.status === "approved").length}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-4">
            <div className="rounded-lg bg-danger/10 p-3">
              <XCircle className="h-6 w-6 text-danger" />
            </div>
            <div>
              <p className="text-sm text-default-500">已拒绝</p>
              <p className="text-xl font-bold">
                {reviewItems.filter(i => i.status === "rejected").length}
              </p>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="flex flex-row items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <AlertTriangle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-default-500">高优先级</p>
              <p className="text-xl font-bold">
                {reviewItems.filter(i => i.priority === "high").length}
              </p>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* 审核列表 */}
      <Card>
        <CardBody>
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<ClipboardCheck className="h-12 w-12" />}
              title="暂无待审核项目"
              description="所有匹配结果已审核完成"
            />
          ) : (
            <Table
              aria-label="审核列表"
              topContent={topContent}
              classNames={{
                wrapper: "min-h-[400px]",
              }}
            >
              <TableHeader columns={columns}>
                {column => (
                  <TableColumn key={column.key}>{column.label}</TableColumn>
                )}
              </TableHeader>
              <TableBody items={filteredItems}>
                {item => (
                  <TableRow key={item._id}>
                    {columnKey => (
                      <TableCell>{renderItemCell(item, columnKey)}</TableCell>
                    )}
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* 审核详情模态框 */}
      <Modal
        isOpen={isReviewOpen}
        onClose={onReviewClose}
        size="4xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader>审核匹配结果</ModalHeader>
          <ModalBody>
            {selectedItem && (
              <div className="space-y-6">
                {/* 原始商品信息 */}
                <Card>
                  <CardHeader>
                    <h3 className="text-lg font-semibold">原始商品信息</h3>
                  </CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-default-500">商品名称</p>
                        <p className="font-medium">
                          {selectedItem.originalData?.name}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">品牌</p>
                        <p className="font-medium">
                          {selectedItem.originalData?.brand}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">价格</p>
                        <p className="font-medium">
                          {formatCurrency(
                            selectedItem.originalData?.price ?? 0
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-default-500">规格</p>
                        <p className="font-medium">
                          {selectedItem.originalData?.specifications}
                        </p>
                      </div>
                    </div>
                  </CardBody>
                </Card>

                {/* 匹配候选 */}
                <div>
                  <h3 className="mb-4 text-lg font-semibold">匹配候选</h3>
                  <RadioGroup
                    value={selectedCandidate}
                    onValueChange={setSelectedCandidate}
                  >
                    {selectedItem.candidates.map((candidate, index) => (
                      <div key={candidate.productId} className="w-full">
                        <Radio
                          value={candidate.productId}
                          className="w-full max-w-none"
                        >
                          <Card className="w-full">
                            <CardBody className="p-4">
                              <div className="mb-3 flex items-start justify-between">
                                <div>
                                  <h4 className="font-semibold">
                                    {candidate.productName}
                                  </h4>
                                  <p className="text-sm text-default-500">
                                    {candidate.brand}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <ConfidenceChip
                                    confidence={candidate.confidence}
                                  />
                                  <Chip
                                    variant="flat"
                                    color="primary"
                                    size="sm"
                                  >
                                    {formatPercentage(
                                      candidate.similarity ?? 0
                                    )}
                                  </Chip>
                                </div>
                              </div>

                              <div className="mb-3 grid grid-cols-2 gap-4">
                                <div>
                                  <p className="text-sm text-default-500">
                                    价格
                                  </p>
                                  <p className="font-medium">
                                    {formatCurrency(candidate.price ?? 0)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-default-500">
                                    价格匹配度
                                  </p>
                                  <p className="font-medium">
                                    {formatPercentage(
                                      candidate.priceMatch ?? 0
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="mb-2 text-sm text-default-500">
                                  匹配原因
                                </p>
                                <div className="flex flex-wrap gap-1">
                                  {candidate.reasons?.map((reason, idx) => (
                                    <Chip key={idx} variant="flat" size="sm">
                                      {reason}
                                    </Chip>
                                  )) || []}
                                </div>
                              </div>
                            </CardBody>
                          </Card>
                        </Radio>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* 审核决定 */}
                <div>
                  <h3 className="mb-4 text-lg font-semibold">审核决定</h3>
                  <RadioGroup
                    value={reviewAction}
                    onValueChange={setReviewAction}
                    orientation="horizontal"
                  >
                    <Radio value="approve">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-success" />
                        <span>通过</span>
                      </div>
                    </Radio>
                    <Radio value="reject">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-danger" />
                        <span>拒绝</span>
                      </div>
                    </Radio>
                    <Radio value="flag">
                      <div className="flex items-center gap-2">
                        <Flag className="h-4 w-4 text-warning" />
                        <span>标记异常</span>
                      </div>
                    </Radio>
                  </RadioGroup>
                </div>

                {/* 审核备注 */}
                <div>
                  <Textarea
                    label="审核备注"
                    placeholder="请填写审核备注..."
                    value={reviewComment}
                    onValueChange={setReviewComment}
                    maxRows={3}
                  />
                </div>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onReviewClose}>
              取消
            </Button>
            <Button
              color="primary"
              onPress={handleConfirmReview}
              isDisabled={!reviewAction}
            >
              提交审核
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
