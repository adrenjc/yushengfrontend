"use client"

import { useState } from "react"
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Switch,
  Slider,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Divider,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
  Badge,
} from "@nextui-org/react"
import {
  Settings,
  Save,
  RefreshCw,
  User,
  Shield,
  Database,
  Bell,
  Palette,
  Code,
  HardDrive,
  Network,
  Lock,
  Key,
  Users,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Check,
  X,
  AlertTriangle,
  Info,
} from "lucide-react"
import { formatDate, cn } from "@/lib/utils"

// 模拟数据
const mockSystemConfig = {
  general: {
    systemName: "智能商品匹配系统",
    version: "1.0.0",
    language: "zh-CN",
    timezone: "Asia/Shanghai",
    autoBackup: true,
    backupInterval: 24, // 小时
    maxFileSize: 10, // MB
    sessionTimeout: 30, // 分钟
  },
  matching: {
    defaultThreshold: 75,
    autoConfirmThreshold: 90,
    maxCandidates: 5,
    enableLearning: true,
    weights: {
      name: 30,
      brand: 25,
      keywords: 20,
      package: 15,
      price: 10,
    },
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
    pushEnabled: true,
    taskCompleted: true,
    priceAlert: true,
    systemAlert: true,
    reviewRequired: true,
  },
  security: {
    passwordPolicy: {
      minLength: 8,
      requireNumbers: true,
      requireSymbols: true,
      requireUppercase: true,
      expiryDays: 90,
    },
    sessionSecurity: {
      maxSessions: 3,
      idleTimeout: 30,
      rememberDuration: 7,
    },
    twoFactorAuth: false,
  },
}

const mockUsers = [
  {
    id: "1",
    username: "admin",
    email: "admin@example.com",
    name: "系统管理员",
    role: "admin",
    status: "active",
    lastLogin: "2024-11-26T09:30:00Z",
    createdAt: "2024-01-15T10:00:00Z",
  },
  {
    id: "2",
    username: "reviewer1",
    email: "reviewer1@example.com",
    name: "张三",
    role: "reviewer",
    status: "active",
    lastLogin: "2024-11-25T16:45:00Z",
    createdAt: "2024-02-01T14:20:00Z",
  },
  {
    id: "3",
    username: "operator1",
    email: "operator1@example.com",
    name: "李四",
    role: "operator",
    status: "inactive",
    lastLogin: "2024-11-20T11:15:00Z",
    createdAt: "2024-03-10T09:30:00Z",
  },
]

const RoleChip = ({ role }: { role: string }) => {
  const config = {
    admin: { color: "danger" as const, label: "管理员" },
    reviewer: { color: "warning" as const, label: "审核员" },
    operator: { color: "primary" as const, label: "操作员" },
  }

  const { color, label } =
    config[role as keyof typeof config] || config.operator

  return (
    <Chip variant="flat" color={color} size="sm">
      {label}
    </Chip>
  )
}

const StatusChip = ({ status }: { status: string }) => {
  const config = {
    active: { color: "success" as const, label: "启用" },
    inactive: { color: "default" as const, label: "禁用" },
    pending: { color: "warning" as const, label: "待激活" },
  }

  const { color, label } =
    config[status as keyof typeof config] || config.active

  return (
    <Chip variant="flat" color={color} size="sm">
      {label}
    </Chip>
  )
}

export default function SettingsPage() {
  const [config, setConfig] = useState(mockSystemConfig)
  const [users, setUsers] = useState(mockUsers)
  const [activeTab, setActiveTab] = useState("general")
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [isModified, setIsModified] = useState(false)

  const {
    isOpen: isUserModalOpen,
    onOpen: onUserModalOpen,
    onClose: onUserModalClose,
  } = useDisclosure()

  const handleConfigChange = (section: string, key: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [key]: value,
      },
    }))
    setIsModified(true)
  }

  const handleWeightChange = (key: string, value: number) => {
    setConfig(prev => ({
      ...prev,
      matching: {
        ...prev.matching,
        weights: {
          ...prev.matching.weights,
          [key]: value,
        },
      },
    }))
    setIsModified(true)
  }

  const handleSaveSettings = () => {
    // TODO: 实现保存设置逻辑
    console.log("Save settings:", config)
    setIsModified(false)
  }

  const handleResetSettings = () => {
    // TODO: 实现重置设置逻辑
    console.log("Reset settings")
    setConfig(mockSystemConfig)
    setIsModified(false)
  }

  const handleUserAction = (action: string, user?: any) => {
    switch (action) {
      case "create":
        setSelectedUser(null)
        onUserModalOpen()
        break
      case "edit":
        setSelectedUser(user)
        onUserModalOpen()
        break
      case "delete":
        // TODO: 实现删除用户逻辑
        console.log("Delete user:", user)
        break
      case "toggle":
        // TODO: 实现切换用户状态逻辑
        setUsers(prev =>
          prev.map(u =>
            u.id === user.id
              ? { ...u, status: u.status === "active" ? "inactive" : "active" }
              : u
          )
        )
        break
    }
  }

  const renderUserCell = (user: any, columnKey: React.Key) => {
    switch (columnKey) {
      case "user":
        return (
          <div className="flex items-center gap-3">
            <Avatar
              name={user.name}
              size="sm"
              className="bg-primary/10 text-primary"
            />
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-sm text-default-500">{user.username}</p>
            </div>
          </div>
        )
      case "email":
        return user.email
      case "role":
        return <RoleChip role={user.role} />
      case "status":
        return <StatusChip status={user.status} />
      case "lastLogin":
        return (
          <div>
            <p className="text-sm">{formatDate(user.lastLogin)}</p>
          </div>
        )
      case "actions":
        return (
          <Dropdown>
            <DropdownTrigger>
              <Button isIconOnly variant="light" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownTrigger>
            <DropdownMenu>
              <DropdownItem
                key="edit"
                startContent={<Edit className="h-4 w-4" />}
                onPress={() => handleUserAction("edit", user)}
              >
                编辑
              </DropdownItem>
              <DropdownItem
                key="toggle"
                startContent={
                  user.status === "active" ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )
                }
                onPress={() => handleUserAction("toggle", user)}
              >
                {user.status === "active" ? "禁用" : "启用"}
              </DropdownItem>
              <DropdownItem
                key="delete"
                startContent={<Trash2 className="h-4 w-4" />}
                className="text-danger"
                color="danger"
                onPress={() => handleUserAction("delete", user)}
              >
                删除
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        )
      default:
        return null
    }
  }

  const userColumns = [
    { key: "user", label: "用户" },
    { key: "email", label: "邮箱" },
    { key: "role", label: "角色" },
    { key: "status", label: "状态" },
    { key: "lastLogin", label: "最后登录" },
    { key: "actions", label: "操作" },
  ]

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">系统设置</h1>
          <p className="text-default-500">管理系统配置和用户权限</p>
        </div>
        <div className="flex items-center gap-3">
          {isModified && (
            <Badge content="已修改" color="warning" size="sm">
              <Button
                variant="flat"
                size="sm"
                startContent={<RefreshCw className="h-4 w-4" />}
                onPress={handleResetSettings}
              >
                重置
              </Button>
            </Badge>
          )}
          <Button
            color="primary"
            size="sm"
            startContent={<Save className="h-4 w-4" />}
            onPress={handleSaveSettings}
            isDisabled={!isModified}
          >
            保存设置
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
        <Tab key="general" title="常规设置">
          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">基本设置</h3>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="系统名称"
                    value={config.general.systemName}
                    onValueChange={value =>
                      handleConfigChange("general", "systemName", value)
                    }
                  />
                  <Input
                    label="系统版本"
                    value={config.general.version}
                    isReadOnly
                  />
                  <Select
                    label="语言"
                    selectedKeys={[config.general.language]}
                    onSelectionChange={keys =>
                      handleConfigChange(
                        "general",
                        "language",
                        Array.from(keys)[0]
                      )
                    }
                  >
                    <SelectItem key="zh-CN">简体中文</SelectItem>
                    <SelectItem key="en-US">English</SelectItem>
                  </Select>
                  <Select
                    label="时区"
                    selectedKeys={[config.general.timezone]}
                    onSelectionChange={keys =>
                      handleConfigChange(
                        "general",
                        "timezone",
                        Array.from(keys)[0]
                      )
                    }
                  >
                    <SelectItem key="Asia/Shanghai">Asia/Shanghai</SelectItem>
                    <SelectItem key="UTC">UTC</SelectItem>
                  </Select>
                </div>

                <Divider />

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">自动备份</p>
                      <p className="text-sm text-default-500">
                        定期自动备份系统数据
                      </p>
                    </div>
                    <Switch
                      isSelected={config.general.autoBackup}
                      onValueChange={value =>
                        handleConfigChange("general", "autoBackup", value)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      备份间隔 (小时)
                    </label>
                    <Slider
                      value={[config.general.backupInterval]}
                      onChange={([value]) =>
                        handleConfigChange("general", "backupInterval", value)
                      }
                      minValue={1}
                      maxValue={168}
                      step={1}
                      isDisabled={!config.general.autoBackup}
                    />
                    <p className="text-xs text-default-500">
                      当前设置: 每 {config.general.backupInterval} 小时备份一次
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      最大文件大小 (MB)
                    </label>
                    <Slider
                      value={[config.general.maxFileSize]}
                      onChange={([value]) =>
                        handleConfigChange("general", "maxFileSize", value)
                      }
                      minValue={1}
                      maxValue={100}
                      step={1}
                    />
                    <p className="text-xs text-default-500">
                      当前限制: {config.general.maxFileSize}MB
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="matching" title="匹配算法">
          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">匹配参数</h3>
                </div>
              </CardHeader>
              <CardBody className="space-y-6">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      默认匹配阈值 (%)
                    </label>
                    <Slider
                      value={[config.matching.defaultThreshold]}
                      onChange={([value]) =>
                        handleConfigChange(
                          "matching",
                          "defaultThreshold",
                          value
                        )
                      }
                      minValue={50}
                      maxValue={100}
                      step={1}
                    />
                    <p className="text-xs text-default-500">
                      低于此值的匹配将需要人工审核:{" "}
                      {config.matching.defaultThreshold}%
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">
                      自动确认阈值 (%)
                    </label>
                    <Slider
                      value={[config.matching.autoConfirmThreshold]}
                      onChange={([value]) =>
                        handleConfigChange(
                          "matching",
                          "autoConfirmThreshold",
                          value
                        )
                      }
                      minValue={80}
                      maxValue={100}
                      step={1}
                    />
                    <p className="text-xs text-default-500">
                      高于此值的匹配将自动确认:{" "}
                      {config.matching.autoConfirmThreshold}%
                    </p>
                  </div>
                </div>

                <Divider />

                <div>
                  <h4 className="mb-4 font-semibold">匹配权重配置</h4>
                  <div className="space-y-4">
                    {Object.entries(config.matching.weights).map(
                      ([key, value]) => {
                        const labels = {
                          name: "商品名称",
                          brand: "品牌",
                          keywords: "关键词",
                          package: "包装规格",
                          price: "价格",
                        }
                        return (
                          <div key={key} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <label className="text-sm font-medium">
                                {labels[key as keyof typeof labels]}
                              </label>
                              <span className="text-sm text-default-500">
                                {value}%
                              </span>
                            </div>
                            <Slider
                              value={[value]}
                              onChange={([newValue]) =>
                                handleWeightChange(key, newValue)
                              }
                              minValue={0}
                              maxValue={50}
                              step={1}
                            />
                          </div>
                        )
                      }
                    )}
                  </div>
                  <div className="bg-info-50 mt-4 rounded-lg p-3">
                    <div className="flex items-start gap-2">
                      <Info className="text-info mt-0.5 h-4 w-4" />
                      <div>
                        <p className="text-info text-sm font-medium">
                          权重总和
                        </p>
                        <p className="text-info text-xs">
                          当前权重总和:{" "}
                          {Object.values(config.matching.weights).reduce(
                            (a, b) => a + b,
                            0
                          )}
                          %
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <Divider />

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">启用机器学习</p>
                    <p className="text-sm text-default-500">
                      根据用户选择优化匹配算法
                    </p>
                  </div>
                  <Switch
                    isSelected={config.matching.enableLearning}
                    onValueChange={value =>
                      handleConfigChange("matching", "enableLearning", value)
                    }
                  />
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="notifications" title="通知设置">
          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">通知渠道</h3>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">邮件通知</p>
                    <p className="text-sm text-default-500">通过邮件发送通知</p>
                  </div>
                  <Switch
                    isSelected={config.notifications.emailEnabled}
                    onValueChange={value =>
                      handleConfigChange("notifications", "emailEnabled", value)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">短信通知</p>
                    <p className="text-sm text-default-500">
                      通过短信发送紧急通知
                    </p>
                  </div>
                  <Switch
                    isSelected={config.notifications.smsEnabled}
                    onValueChange={value =>
                      handleConfigChange("notifications", "smsEnabled", value)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">浏览器推送</p>
                    <p className="text-sm text-default-500">浏览器内推送通知</p>
                  </div>
                  <Switch
                    isSelected={config.notifications.pushEnabled}
                    onValueChange={value =>
                      handleConfigChange("notifications", "pushEnabled", value)
                    }
                  />
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">通知类型</h3>
              </CardHeader>
              <CardBody className="space-y-4">
                {Object.entries(config.notifications)
                  .filter(
                    ([key]) =>
                      !["emailEnabled", "smsEnabled", "pushEnabled"].includes(
                        key
                      )
                  )
                  .map(([key, value]) => {
                    const labels = {
                      taskCompleted: "任务完成",
                      priceAlert: "价格预警",
                      systemAlert: "系统警告",
                      reviewRequired: "需要审核",
                    }
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between"
                      >
                        <p className="font-medium">
                          {labels[key as keyof typeof labels]}
                        </p>
                        <Switch
                          isSelected={value as boolean}
                          onValueChange={newValue =>
                            handleConfigChange("notifications", key, newValue)
                          }
                        />
                      </div>
                    )
                  })}
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="security" title="安全设置">
          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">密码策略</h3>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">最小密码长度</label>
                  <Slider
                    value={[config.security.passwordPolicy.minLength]}
                    onChange={([value]) =>
                      setConfig(prev => ({
                        ...prev,
                        security: {
                          ...prev.security,
                          passwordPolicy: {
                            ...prev.security.passwordPolicy,
                            minLength: value,
                          },
                        },
                      }))
                    }
                    minValue={6}
                    maxValue={20}
                    step={1}
                  />
                  <p className="text-xs text-default-500">
                    当前要求: 至少 {config.security.passwordPolicy.minLength}{" "}
                    个字符
                  </p>
                </div>

                <div className="space-y-4">
                  {[
                    { key: "requireNumbers", label: "要求包含数字" },
                    { key: "requireSymbols", label: "要求包含特殊字符" },
                    { key: "requireUppercase", label: "要求包含大写字母" },
                  ].map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <p className="font-medium">{label}</p>
                      <Switch
                        isSelected={
                          config.security.passwordPolicy[
                            key as keyof typeof config.security.passwordPolicy
                          ] as boolean
                        }
                        onValueChange={value =>
                          setConfig(prev => ({
                            ...prev,
                            security: {
                              ...prev.security,
                              passwordPolicy: {
                                ...prev.security.passwordPolicy,
                                [key]: value,
                              },
                            },
                          }))
                        }
                      />
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">会话安全</h3>
                </div>
              </CardHeader>
              <CardBody className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">启用双因子认证</p>
                    <p className="text-sm text-default-500">提高账户安全性</p>
                  </div>
                  <Switch
                    isSelected={config.security.twoFactorAuth}
                    onValueChange={value =>
                      handleConfigChange("security", "twoFactorAuth", value)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">会话超时 (分钟)</label>
                  <Slider
                    value={[config.security.sessionSecurity.idleTimeout]}
                    onChange={([value]) =>
                      setConfig(prev => ({
                        ...prev,
                        security: {
                          ...prev.security,
                          sessionSecurity: {
                            ...prev.security.sessionSecurity,
                            idleTimeout: value,
                          },
                        },
                      }))
                    }
                    minValue={5}
                    maxValue={120}
                    step={5}
                  />
                  <p className="text-xs text-default-500">
                    闲置 {config.security.sessionSecurity.idleTimeout}{" "}
                    分钟后自动登出
                  </p>
                </div>
              </CardBody>
            </Card>
          </div>
        </Tab>

        <Tab key="users" title="用户管理">
          <div className="mt-6 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  <h3 className="text-lg font-semibold">用户列表</h3>
                </div>
                <Button
                  color="primary"
                  size="sm"
                  startContent={<Plus className="h-4 w-4" />}
                  onPress={() => handleUserAction("create")}
                >
                  添加用户
                </Button>
              </CardHeader>
              <CardBody>
                <Table aria-label="用户管理表格">
                  <TableHeader columns={userColumns}>
                    {column => (
                      <TableColumn key={column.key}>{column.label}</TableColumn>
                    )}
                  </TableHeader>
                  <TableBody items={users}>
                    {item => (
                      <TableRow key={item.id}>
                        {columnKey => (
                          <TableCell>
                            {renderUserCell(item, columnKey)}
                          </TableCell>
                        )}
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardBody>
            </Card>
          </div>
        </Tab>
      </Tabs>

      {/* 用户编辑模态框 */}
      <Modal isOpen={isUserModalOpen} onClose={onUserModalClose} size="2xl">
        <ModalContent>
          <ModalHeader>{selectedUser ? "编辑用户" : "添加用户"}</ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="用户名"
                  placeholder="请输入用户名"
                  defaultValue={selectedUser?.username || ""}
                />
                <Input
                  label="邮箱"
                  type="email"
                  placeholder="请输入邮箱"
                  defaultValue={selectedUser?.email || ""}
                />
              </div>
              <Input
                label="姓名"
                placeholder="请输入真实姓名"
                defaultValue={selectedUser?.name || ""}
              />
              <Select
                label="角色"
                placeholder="选择用户角色"
                defaultSelectedKeys={selectedUser ? [selectedUser.role] : []}
              >
                <SelectItem key="admin">管理员</SelectItem>
                <SelectItem key="reviewer">审核员</SelectItem>
                <SelectItem key="operator">操作员</SelectItem>
              </Select>
              {!selectedUser && (
                <Input
                  label="初始密码"
                  type="password"
                  placeholder="请输入初始密码"
                />
              )}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onUserModalClose}>
              取消
            </Button>
            <Button color="primary" onPress={onUserModalClose}>
              {selectedUser ? "更新" : "创建"}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  )
}
