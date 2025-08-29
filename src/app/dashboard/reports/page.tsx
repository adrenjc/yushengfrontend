"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Select,
  SelectItem,
  DatePicker,
  Tabs,
  Tab,
  Chip,
  Progress,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@nextui-org/react"
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Download,
  RefreshCw,
  Calendar,
  Target,
  Users,
  Package,
  DollarSign,
  Activity,
  FileText,
  PieChart,
  LineChart,
} from "lucide-react"
import { formatDate, formatCurrency, formatPercentage } from "@/lib/utils"

// 模拟数据
const mockReportData = {
  overview: {
    totalProducts: 1580,
    totalMatches: 2890,
    totalRevenue: 158960,
    averageAccuracy: 94.5,
    trends: {
      products: 12.5,
      matches: 8.3,
      revenue: 15.2,
      accuracy: 2.1,
    },
  },
  matching: {
    totalTasks: 145,
    completedTasks: 132,
    successRate: 91.0,
    averageProcessTime: 45, // 分钟
    accuracyDistribution: [
      { range: "90-100%", count: 89, percentage: 67.4 },
      { range: "80-89%", count: 28, percentage: 21.2 },
      { range: "70-79%", count: 12, percentage: 9.1 },
      { range: "60-69%", count: 3, percentage: 2.3 },
    ],
  },
  products: {
    categories: [
      { name: "香烟", count: 856, revenue: 89650 },
      { name: "酒类", count: 423, revenue: 45320 },
      { name: "饮料", count: 301, revenue: 23990 },
    ],
    topPerforming: [
      { name: "中华(软包)", matches: 89, accuracy: 96.5, revenue: 8950 },
      { name: "玉溪(硬包)", matches: 67, accuracy: 94.2, revenue: 6780 },
      { name: "芙蓉王(软包)", matches: 54, accuracy: 92.8, revenue: 5940 },
    ],
  },
  users: {
    totalUsers: 28,
    activeUsers: 24,
    totalReviews: 1247,
    averageReviewTime: 3.2, // 分钟
    userStats: [
      { name: "张三", role: "reviewer", reviews: 156, accuracy: 97.2 },
      { name: "李四", role: "operator", tasks: 89, efficiency: 95.5 },
      { name: "王五", role: "reviewer", reviews: 134, accuracy: 94.8 },
    ],
  },
}

const StatCard = ({
  title,
  value,
  subtitle,
  trend,
  trendValue,
  icon,
  color = "primary",
}: {
  title: string
  value: string | number
  subtitle?: string
  trend?: "up" | "down" | "stable"
  trendValue?: number
  icon: React.ReactNode
  color?: "primary" | "success" | "warning" | "danger"
}) => {
  return (
    <Card>
      <CardBody className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <div
            className={`rounded-lg p-3 ${
              color === "primary" && "bg-primary/10 text-primary"
            } ${color === "success" && "bg-success/10 text-success"} ${
              color === "warning" && "bg-warning/10 text-warning"
            } ${color === "danger" && "bg-danger/10 text-danger"}`}
          >
            {icon}
          </div>
          {trend && trendValue && (
            <div className="flex items-center gap-1">
              {trend === "up" ? (
                <TrendingUp className="h-4 w-4 text-success" />
              ) : trend === "down" ? (
                <TrendingDown className="h-4 w-4 text-danger" />
              ) : null}
              <span
                className={`text-sm font-medium ${
                  trend === "up"
                    ? "text-success"
                    : trend === "down"
                      ? "text-danger"
                      : "text-default-500"
                }`}
              >
                {formatPercentage(Math.abs(trendValue))}
              </span>
            </div>
          )}
        </div>
        <div>
          <p className="mb-1 text-sm text-default-500">{title}</p>
          <p className="mb-1 text-2xl font-bold">{value}</p>
          {subtitle && <p className="text-xs text-default-400">{subtitle}</p>}
        </div>
      </CardBody>
    </Card>
  )
}

export default function ReportsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState("last30days")
  const [activeTab, setActiveTab] = useState("overview")
  const [reportType, setReportType] = useState("summary")

  const handleExportReport = () => {
    // TODO: 实现报表导出逻辑
    console.log("Export report:", { period: selectedPeriod, type: reportType })
  }

  const handleRefreshData = () => {
    // TODO: 实现数据刷新逻辑
    console.log("Refresh report data")
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">数据报表</h1>
          <p className="text-default-500">系统运营数据分析和报表</p>
        </div>
        <div className="flex items-center gap-3">
          <Select
            placeholder="选择时间范围"
            selectedKeys={[selectedPeriod]}
            onSelectionChange={keys =>
              setSelectedPeriod(Array.from(keys)[0] as string)
            }
            className="w-48"
            size="sm"
          >
            <SelectItem key="last7days">最近7天</SelectItem>
            <SelectItem key="last30days">最近30天</SelectItem>
            <SelectItem key="last90days">最近90天</SelectItem>
            <SelectItem key="custom">自定义范围</SelectItem>
          </Select>
          <Button
            variant="flat"
            size="sm"
            startContent={<RefreshCw className="h-4 w-4" />}
            onPress={handleRefreshData}
          >
            刷新
          </Button>
          <Button
            color="primary"
            size="sm"
            startContent={<Download className="h-4 w-4" />}
            onPress={handleExportReport}
          >
            导出报表
          </Button>
        </div>
      </div>

      {/* 主要内容 */}
      <Tabs
        selectedKey={activeTab}
        onSelectionChange={key => setActiveTab(key as string)}
        color="primary"
        variant="underlined"
      >
        <Tab key="overview" title="总览">
          <div className="mt-6 space-y-6">
            {/* 关键指标 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="商品总数"
                value={mockReportData.overview.totalProducts.toLocaleString()}
                trend="up"
                trendValue={mockReportData.overview.trends.products}
                icon={<Package className="h-6 w-6" />}
                color="primary"
              />
              <StatCard
                title="匹配总数"
                value={mockReportData.overview.totalMatches.toLocaleString()}
                trend="up"
                trendValue={mockReportData.overview.trends.matches}
                icon={<Target className="h-6 w-6" />}
                color="success"
              />
              <StatCard
                title="总收入"
                value={formatCurrency(mockReportData.overview.totalRevenue)}
                trend="up"
                trendValue={mockReportData.overview.trends.revenue}
                icon={<DollarSign className="h-6 w-6" />}
                color="warning"
              />
              <StatCard
                title="平均准确率"
                value={`${mockReportData.overview.averageAccuracy}%`}
                trend="up"
                trendValue={mockReportData.overview.trends.accuracy}
                icon={<Activity className="h-6 w-6" />}
                color="success"
              />
            </div>

            {/* 图表区域 */}
            <div className="grid gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">匹配趋势</h3>
                </CardHeader>
                <CardBody>
                  <div className="flex h-64 items-center justify-center rounded-lg bg-default-50">
                    <div className="text-center">
                      <LineChart className="mx-auto mb-2 h-12 w-12 text-default-400" />
                      <p className="text-default-500">匹配趋势图表</p>
                      <p className="text-xs text-default-400">
                        集成图表组件显示
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">分类分布</h3>
                </CardHeader>
                <CardBody>
                  <div className="flex h-64 items-center justify-center rounded-lg bg-default-50">
                    <div className="text-center">
                      <PieChart className="mx-auto mb-2 h-12 w-12 text-default-400" />
                      <p className="text-default-500">分类分布图表</p>
                      <p className="text-xs text-default-400">
                        集成图表组件显示
                      </p>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </Tab>

        <Tab key="matching" title="匹配分析">
          <div className="mt-6 space-y-6">
            {/* 匹配统计 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="总任务数"
                value={mockReportData.matching.totalTasks}
                icon={<FileText className="h-6 w-6" />}
                color="primary"
              />
              <StatCard
                title="完成任务"
                value={mockReportData.matching.completedTasks}
                subtitle={`完成率 ${formatPercentage(mockReportData.matching.successRate)}`}
                icon={<Target className="h-6 w-6" />}
                color="success"
              />
              <StatCard
                title="平均处理时间"
                value={`${mockReportData.matching.averageProcessTime}分钟`}
                icon={<Calendar className="h-6 w-6" />}
                color="warning"
              />
              <StatCard
                title="成功率"
                value={`${mockReportData.matching.successRate}%`}
                icon={<Activity className="h-6 w-6" />}
                color="success"
              />
            </div>

            {/* 准确率分布 */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">准确率分布</h3>
              </CardHeader>
              <CardBody>
                <div className="space-y-4">
                  {mockReportData.matching.accuracyDistribution.map(
                    (item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-16 text-sm font-medium">
                            {item.range}
                          </span>
                          <Progress
                            value={item.percentage}
                            color={
                              item.percentage >= 60
                                ? "success"
                                : item.percentage >= 20
                                  ? "warning"
                                  : "danger"
                            }
                            className="max-w-md flex-1"
                            size="sm"
                          />
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-default-500">
                            {item.count}个任务
                          </span>
                          <Chip
                            variant="flat"
                            color={
                              item.percentage >= 60
                                ? "success"
                                : item.percentage >= 20
                                  ? "warning"
                                  : "danger"
                            }
                            size="sm"
                          >
                            {formatPercentage(item.percentage)}
                          </Chip>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="products" title="商品分析">
          <div className="mt-6 space-y-6">
            {/* 分类统计 */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">分类统计</h3>
              </CardHeader>
              <CardBody>
                <Table aria-label="分类统计表格">
                  <TableHeader>
                    <TableColumn>分类</TableColumn>
                    <TableColumn>商品数量</TableColumn>
                    <TableColumn>收入</TableColumn>
                    <TableColumn>占比</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {mockReportData.products.categories.map(
                      (category, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="font-medium">{category.name}</div>
                          </TableCell>
                          <TableCell>{category.count}</TableCell>
                          <TableCell>
                            {formatCurrency(category.revenue)}
                          </TableCell>
                          <TableCell>
                            <Chip variant="flat" color="primary" size="sm">
                              {formatPercentage(
                                (category.count /
                                  mockReportData.overview.totalProducts) *
                                  100
                              )}
                            </Chip>
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>

            {/* 热门商品 */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">热门商品</h3>
              </CardHeader>
              <CardBody>
                <Table aria-label="热门商品表格">
                  <TableHeader>
                    <TableColumn>商品名称</TableColumn>
                    <TableColumn>匹配次数</TableColumn>
                    <TableColumn>准确率</TableColumn>
                    <TableColumn>收入</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {mockReportData.products.topPerforming.map(
                      (product, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <div className="font-medium">{product.name}</div>
                          </TableCell>
                          <TableCell>{product.matches}</TableCell>
                          <TableCell>
                            <Chip
                              variant="flat"
                              color={
                                product.accuracy >= 95 ? "success" : "warning"
                              }
                              size="sm"
                            >
                              {formatPercentage(product.accuracy)}
                            </Chip>
                          </TableCell>
                          <TableCell>
                            {formatCurrency(product.revenue)}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="users" title="用户分析">
          <div className="mt-6 space-y-6">
            {/* 用户统计 */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="总用户数"
                value={mockReportData.users.totalUsers}
                icon={<Users className="h-6 w-6" />}
                color="primary"
              />
              <StatCard
                title="活跃用户"
                value={mockReportData.users.activeUsers}
                subtitle={`活跃率 ${formatPercentage((mockReportData.users.activeUsers / mockReportData.users.totalUsers) * 100)}`}
                icon={<Activity className="h-6 w-6" />}
                color="success"
              />
              <StatCard
                title="总审核数"
                value={mockReportData.users.totalReviews}
                icon={<FileText className="h-6 w-6" />}
                color="warning"
              />
              <StatCard
                title="平均审核时间"
                value={`${mockReportData.users.averageReviewTime}分钟`}
                icon={<Calendar className="h-6 w-6" />}
                color="primary"
              />
            </div>

            {/* 用户表现 */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">用户表现</h3>
              </CardHeader>
              <CardBody>
                <Table aria-label="用户表现表格">
                  <TableHeader>
                    <TableColumn>用户</TableColumn>
                    <TableColumn>角色</TableColumn>
                    <TableColumn>工作量</TableColumn>
                    <TableColumn>效率/准确率</TableColumn>
                  </TableHeader>
                  <TableBody>
                    {mockReportData.users.userStats.map((user, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="font-medium">{user.name}</div>
                        </TableCell>
                        <TableCell>
                          <Chip variant="flat" size="sm">
                            {user.role === "reviewer" ? "审核员" : "操作员"}
                          </Chip>
                        </TableCell>
                        <TableCell>
                          {"reviews" in user
                            ? `${user.reviews}个审核`
                            : `${(user as any).tasks}个任务`}
                        </TableCell>
                        <TableCell>
                          <Chip
                            variant="flat"
                            color={
                              ("accuracy" in user
                                ? user.accuracy
                                : (user as any).efficiency) >= 95
                                ? "success"
                                : "warning"
                            }
                            size="sm"
                          >
                            {formatPercentage(
                              "accuracy" in user
                                ? user.accuracy
                                : (user as any).efficiency
                            )}
                          </Chip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>
    </div>
  )
}
