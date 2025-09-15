"use client"

import { useState, useCallback, useRef } from "react"
import {
  Card,
  CardBody,
  Button,
  Progress,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@nextui-org/react"
import {
  Upload,
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertCircle,
  Download,
} from "lucide-react"
import { useNotifications } from "@/stores/app"
import { STORAGE_KEYS } from "@/constants"
import { ensureDevToken } from "@/lib/auth"

interface FileUploadProps {
  onUploadSuccess?: (data: any) => void
  onUploadError?: (error: string) => void
  acceptedFileTypes?: string[]
  maxFileSize?: number // MB
  endpoint?: string
  customUpload?: boolean // 是否使用自定义上传
  isLoading?: boolean // 外部加载状态
}

interface UploadFile {
  file: File
  id: string
  status: "pending" | "uploading" | "success" | "error"
  progress: number
  error?: string
  result?: any
}

export function FileUpload({
  onUploadSuccess,
  onUploadError,
  acceptedFileTypes = [".xlsx", ".xls", ".csv"],
  maxFileSize = 10,
  endpoint = "/api/products/upload",
  customUpload = false,
  isLoading = false,
}: FileUploadProps) {
  const { success: showSuccess, error: showError } = useNotifications()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadFiles, setUploadFiles] = useState<UploadFile[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const { isOpen, onOpen, onClose } = useDisclosure()
  const {
    isOpen: isErrorDetailOpen,
    onOpen: onErrorDetailOpen,
    onClose: onErrorDetailClose,
  } = useDisclosure()
  const [selectedErrorDetails, setSelectedErrorDetails] = useState<any>(null)

  const validateFile = (file: File): string | null => {
    // 检查文件类型
    const fileExtension = file.name.toLowerCase().match(/\.[^.]+$/)?.[0]
    if (!fileExtension || !acceptedFileTypes.includes(fileExtension)) {
      return `不支持的文件类型。支持格式：${acceptedFileTypes.join(", ")}`
    }

    // 检查文件大小
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxFileSize) {
      return `文件大小超过限制（最大 ${maxFileSize}MB）`
    }

    return null
  }

  const uploadFile = async (uploadFile: UploadFile) => {
    const formData = new FormData()
    formData.append("file", uploadFile.file)

    try {
      const token = ensureDevToken()
      if (!token) {
        throw new Error("未找到认证token")
      }

      const xhr = new XMLHttpRequest()

      // 监听上传进度
      xhr.upload.onprogress = event => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100)
          setUploadFiles(prev =>
            prev.map(f =>
              f.id === uploadFile.id
                ? { ...f, progress, status: "uploading" }
                : f
            )
          )
        }
      }

      // 处理响应
      xhr.onload = () => {
        if (xhr.status === 200) {
          try {
            const result = JSON.parse(xhr.responseText)

            // 检查业务逻辑是否成功
            if (result.success === false) {
              // 业务逻辑失败，显示详细错误
              setUploadFiles(prev =>
                prev.map(f =>
                  f.id === uploadFile.id
                    ? {
                        ...f,
                        status: "error",
                        progress: 100,
                        error: result.message || "上传失败",
                        result, // 保存完整的错误信息
                      }
                    : f
                )
              )

              // 显示详细错误信息
              const errorCount =
                result?.data?.summary?.invalid ||
                result?.data?.summary?.total ||
                0
              const errorMessage = `${result.message}（${errorCount} 个错误）`
              showError("上传失败", errorMessage)
              onUploadError?.(result.message)
              return
            }

            // 业务逻辑成功
            setUploadFiles(prev =>
              prev.map(f =>
                f.id === uploadFile.id
                  ? { ...f, status: "success", progress: 100, result }
                  : f
              )
            )

            const summary = result?.data?.summary || result?.summary
            const successCount =
              summary?.successCount ?? summary?.success ?? summary?.valid ?? 0
            const failedCount =
              summary?.failedCount ?? summary?.failed ?? summary?.invalid ?? 0
            const duplicateCount = summary?.duplicateCount ?? 0
            const totalCount = summary?.total ?? 0

            // 构建详细的结果消息
            let msg = ""
            let messageType = "success"

            if (successCount > 0) {
              msg += `新增 ${successCount} 条`
            }

            if (failedCount > 0) {
              msg += msg ? `，失败 ${failedCount} 条` : `失败 ${failedCount} 条`
            }

            if (duplicateCount > 0) {
              msg += msg
                ? `，重复 ${duplicateCount} 条`
                : `重复 ${duplicateCount} 条`
            }

            // 如果没有成功导入任何数据，改为警告
            if (successCount === 0) {
              if (duplicateCount === totalCount) {
                messageType = "warning"
                msg = `所有 ${totalCount} 条数据都已存在，未导入新数据`
              } else if (failedCount === totalCount) {
                messageType = "error"
                msg = `所有 ${totalCount} 条数据都导入失败`
              }
            }

            if (!msg) {
              msg = "处理完成"
            }

            // 根据结果类型显示不同的通知
            if (messageType === "warning") {
              showError("导入警告", `${uploadFile.file.name}：${msg}`)
            } else if (messageType === "error") {
              showError("导入失败", `${uploadFile.file.name}：${msg}`)
            } else {
              showSuccess("导入成功", `${uploadFile.file.name}：${msg}`)
            }
            // 通知上层刷新
            onUploadSuccess?.(result)
          } catch (error) {
            throw new Error("解析响应失败")
          }
        } else {
          throw new Error(`上传失败：${xhr.status}`)
        }
      }

      xhr.onerror = () => {
        throw new Error("网络错误")
      }

      xhr.open("POST", endpoint)
      xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      xhr.send(formData)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "上传失败"
      setUploadFiles(prev =>
        prev.map(f =>
          f.id === uploadFile.id
            ? { ...f, status: "error", error: errorMessage }
            : f
        )
      )
      showError("上传失败", errorMessage)
      onUploadError?.(errorMessage)
    }
  }

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const newFiles: UploadFile[] = []

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const error = validateFile(file)

      if (error) {
        showError("文件验证失败", error)
        continue
      }

      const uploadFile: UploadFile = {
        file,
        id: Math.random().toString(36).substring(2, 15),
        status: "pending",
        progress: 0,
      }

      newFiles.push(uploadFile)
    }

    if (newFiles.length > 0) {
      if (customUpload) {
        // 自定义上传模式：直接调用回调，传入第一个文件
        onUploadSuccess?.(newFiles[0].file)
      } else {
        // 标准上传模式：显示进度框并执行上传
        setUploadFiles(prev => [...prev, ...newFiles])
        onOpen()

        // 开始上传
        newFiles.forEach(fileToUpload => {
          uploadFile(fileToUpload)
        })
      }
    }
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [])

  const removeFile = (id: string) => {
    setUploadFiles(prev => prev.filter(f => f.id !== id))
  }

  const clearAllFiles = () => {
    setUploadFiles([])
    onClose()
  }

  const getStatusIcon = (status: UploadFile["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-success" />
      case "error":
        return <AlertCircle className="h-4 w-4 text-danger" />
      default:
        return <FileSpreadsheet className="h-4 w-4 text-primary" />
    }
  }

  const getStatusColor = (status: UploadFile["status"]) => {
    switch (status) {
      case "success":
        return "success" as const
      case "error":
        return "danger" as const
      case "uploading":
        return "primary" as const
      default:
        return "default" as const
    }
  }

  const downloadTemplate = () => {
    // 创建美观的示例数据 - 使用后端期望的字段名（与Excel模板一致）
    const templateData = [
      [
        "商品名称",
        "公司价",
        "品牌",
        "产品编码",
        "盒码编码",
        "产品类型",
        "包装类型",
        "烟支周长(mm)",
        "烟支长度",
        "包装数量",
        "上市时间",
        "焦油含量(mg)",
        "烟气烟碱量(mg)",
        "烟气一氧化碳量(mg)",
        "颜色",
        "所属企业",
        "是否爆珠",
        "价格类型",
        "零售价",
        "单位",
      ],
      [
        "中华(软)",
        "424",
        "中华",
        "6901028042758",
        "6901028042741",
        "烤烟型",
        "条盒软盒",
        "24.4",
        "84.0(30+54) mm",
        "200",
        "2023-01-10",
        "10",
        "1.0",
        "11",
        "红色",
        "上海烟草集团有限责任公司",
        "否",
        "一类",
        "600",
        "元/条",
      ],
      [
        "玉溪(软蓝)",
        "263",
        "玉溪",
        "6901028212588",
        "6901028212571",
        "烤烟型",
        "条盒软盒",
        "24.2",
        "84.0(30+54) mm",
        "200",
        "2023-01-10",
        "8",
        "0.8",
        "9",
        "蓝色",
        "红塔烟草(集团)有限责任公司",
        "否",
        "二类",
        "380",
        "元/条",
      ],
      [
        "云烟(大重九)",
        "200",
        "云烟",
        "6901029809024",
        "6901029809017",
        "混合型",
        "条盒硬盒",
        "24.0",
        "84.0(30+54) mm",
        "200",
        "2023-01-10",
        "12",
        "1.2",
        "13",
        "金色",
        "云南中烟工业有限责任公司",
        "否",
        "二类",
        "280",
        "元/条",
      ],
    ]

    // 转换为CSV格式
    const csvContent = templateData.map(row => row.join(",")).join("\n")
    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    })
    const link = document.createElement("a")
    link.href = URL.createObjectURL(blob)
    link.download = "商品上传模板.csv"
    link.click()
    URL.revokeObjectURL(link.href)

    showSuccess("模板下载", "商品上传模板已下载，请确保使用正确的列名")
  }

  const showErrorDetails = (errorData: any) => {
    setSelectedErrorDetails(errorData)
    onErrorDetailOpen()
  }

  return (
    <>
      <Card
        className={`cursor-pointer border-2 border-dashed transition-colors ${
          isDragOver
            ? "border-primary bg-primary/5"
            : "border-default-300 hover:border-primary/50"
        } ${isLoading ? "pointer-events-none opacity-50" : ""}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        <CardBody className="p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Upload
                className={`h-8 w-8 text-primary ${isLoading ? "animate-pulse" : ""}`}
              />
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {customUpload ? "选择批发清单文件" : "上传商品数据文件"}
              </h3>
              <p className="mt-2 text-default-500">
                {isLoading
                  ? "正在处理文件..."
                  : "拖拽文件到此处，或点击选择文件"}
              </p>
              <p className="mt-1 text-sm text-default-400">
                支持 {acceptedFileTypes.join(", ")} 格式，最大 {maxFileSize}MB
              </p>
              {!customUpload && (
                <div className="mt-3 rounded-lg bg-primary-50 p-3">
                  <p className="mb-1 text-xs font-medium text-primary-700">
                    📋 必需列名格式：
                  </p>
                  <p className="text-xs text-primary-600">
                    商品名称、品牌、盒码、条码、公司价、关键词
                  </p>
                  <p className="mt-1 text-xs text-primary-500">
                    💡 建议先下载模板文件作为参考
                  </p>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                color="primary"
                variant="flat"
                startContent={<Upload className="h-4 w-4" />}
                onClick={e => {
                  e.stopPropagation()
                  if (!isLoading) fileInputRef.current?.click()
                }}
                isLoading={isLoading}
                disabled={isLoading}
              >
                选择文件
              </Button>
              {!customUpload && (
                <Button
                  variant="ghost"
                  startContent={<Download className="h-4 w-4" />}
                  onClick={e => {
                    e.stopPropagation()
                    downloadTemplate()
                  }}
                  disabled={isLoading}
                >
                  下载模板
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={acceptedFileTypes.join(",")}
        className="hidden"
        onChange={e => handleFileSelect(e.target.files)}
      />

      {/* 上传进度模态框 */}
      <Modal isOpen={isOpen} onClose={onClose} size="2xl">
        <ModalContent>
          <ModalHeader>文件上传进度</ModalHeader>
          <ModalBody>
            <div className="max-h-96 space-y-4 overflow-y-auto">
              {uploadFiles.map(uploadFile => (
                <div key={uploadFile.id} className="rounded-lg border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(uploadFile.status)}
                      <span className="truncate font-medium">
                        {uploadFile.file.name}
                      </span>
                      <Chip
                        size="sm"
                        variant="flat"
                        color={getStatusColor(uploadFile.status)}
                      >
                        {uploadFile.status === "pending" && "等待中"}
                        {uploadFile.status === "uploading" && "上传中"}
                        {uploadFile.status === "success" && "完成"}
                        {uploadFile.status === "error" && "失败"}
                      </Chip>
                    </div>
                    <Button
                      isIconOnly
                      variant="light"
                      size="sm"
                      onClick={() => removeFile(uploadFile.id)}
                      aria-label="移除文件"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  {uploadFile.status === "uploading" && (
                    <Progress
                      value={uploadFile.progress}
                      size="sm"
                      color="primary"
                    />
                  )}

                  {uploadFile.error && (
                    <div className="mt-2">
                      <p className="text-sm text-danger">{uploadFile.error}</p>
                      {uploadFile.result?.data?.invalidProducts && (
                        <Button
                          size="sm"
                          variant="light"
                          color="danger"
                          className="mt-2"
                          onClick={() => showErrorDetails(uploadFile.result)}
                        >
                          查看详细错误 ({uploadFile.result.data.summary.invalid}{" "}
                          个)
                        </Button>
                      )}
                    </div>
                  )}

                  {uploadFile.result &&
                    (() => {
                      const summary =
                        uploadFile.result?.data?.summary ||
                        uploadFile.result?.summary
                      const successCount =
                        summary?.successCount ??
                        summary?.success ??
                        summary?.valid ??
                        0
                      const failedCount =
                        summary?.failedCount ??
                        summary?.failed ??
                        summary?.invalid ??
                        0
                      const duplicateCount = summary?.duplicateCount ?? 0
                      const totalCount = summary?.total ?? 0

                      return (
                        <div className="mt-2 space-y-1 text-sm">
                          {successCount > 0 && (
                            <p className="text-success">
                              ✅ 新增导入 {successCount} 条
                            </p>
                          )}
                          {duplicateCount > 0 && (
                            <p className="text-warning">
                              ⚠️ 重复跳过 {duplicateCount} 条
                            </p>
                          )}
                          {failedCount > 0 && (
                            <p className="text-danger">
                              ❌ 导入失败 {failedCount} 条
                            </p>
                          )}
                          {successCount === 0 &&
                            duplicateCount === totalCount && (
                              <div className="space-y-2">
                                <p className="font-medium text-warning">
                                  💡 所有数据都已存在，建议检查是否重复导入
                                </p>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="light"
                                    color="primary"
                                    onClick={() =>
                                      showErrorDetails(uploadFile.result)
                                    }
                                  >
                                    查看重复数据
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="light"
                                    color="warning"
                                    onClick={() => {
                                      if (uploadFile.result?.data?.duplicates) {
                                        const duplicateText =
                                          uploadFile.result.data.duplicates
                                            .map(
                                              (item: any) =>
                                                `${item.data?.name || "未知商品"} - ${item.reason}`
                                            )
                                            .join("\n")
                                        navigator.clipboard.writeText(
                                          duplicateText
                                        )
                                        showSuccess(
                                          "复制成功",
                                          "重复数据信息已复制到剪贴板"
                                        )
                                      }
                                    }}
                                  >
                                    复制重复列表
                                  </Button>
                                </div>
                              </div>
                            )}
                        </div>
                      )
                    })()}
                </div>
              ))}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={clearAllFiles}>
              清空列表
            </Button>
            <Button color="primary" onClick={onClose}>
              完成
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* 详细错误信息模态框 */}
      <Modal
        isOpen={isErrorDetailOpen}
        onClose={onErrorDetailClose}
        size="5xl"
        scrollBehavior="inside"
      >
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            <h3>导入详情</h3>
            {selectedErrorDetails?.data?.summary && (
              <div className="flex flex-wrap gap-4 text-sm text-default-500">
                <span>总计: {selectedErrorDetails.data.summary.total} 行</span>
                {selectedErrorDetails.data.summary.successCount > 0 && (
                  <span className="text-success">
                    新增: {selectedErrorDetails.data.summary.successCount} 行
                  </span>
                )}
                {selectedErrorDetails.data.summary.duplicateCount > 0 && (
                  <span className="text-warning">
                    重复: {selectedErrorDetails.data.summary.duplicateCount} 行
                  </span>
                )}
                {selectedErrorDetails.data.summary.invalid > 0 && (
                  <span className="text-danger">
                    错误: {selectedErrorDetails.data.summary.invalid} 行
                  </span>
                )}
              </div>
            )}
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              {/* 处理有错误的情况 */}
              {selectedErrorDetails?.data?.invalidProducts &&
                selectedErrorDetails.data.invalidProducts.length > 0 && (
                  <>
                    <div className="rounded-lg bg-danger-50 p-4">
                      <h4 className="mb-2 font-medium text-danger">导入错误</h4>
                      <p className="mb-3 text-sm text-danger-700">
                        {selectedErrorDetails.message}
                      </p>
                      <div className="text-sm text-danger-600">
                        <p className="mb-1 font-medium">常见解决方案：</p>
                        <ul className="list-inside list-disc space-y-1">
                          <li>确保Excel文件包含 "商品名称" 和 "品牌" 列</li>
                          <li>检查是否使用了正确的列名（区分大小写）</li>
                          <li>下载最新的模板文件作为参考</li>
                          <li>确保数据行不为空</li>
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 font-medium">错误详情列表</h4>
                      <div className="max-h-96 space-y-3 overflow-y-auto">
                        {selectedErrorDetails.data.invalidProducts.map(
                          (item: any, index: number) => (
                            <div
                              key={index}
                              className="rounded-lg border border-danger-200 p-3"
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  第 {item.row} 行
                                </span>
                                <Chip size="sm" color="danger" variant="flat">
                                  {item.errors?.length || 0} 个错误
                                </Chip>
                              </div>

                              {/* 显示该行的数据 */}
                              {item.data && (
                                <div className="mb-2 rounded bg-default-50 p-2 text-xs">
                                  <strong>数据内容：</strong>
                                  {Object.entries(item.data).map(
                                    ([key, value]) => (
                                      <span key={key} className="ml-2">
                                        {key}: "{String(value)}"
                                      </span>
                                    )
                                  )}
                                </div>
                              )}

                              {/* 显示错误信息 */}
                              {item.errors && item.errors.length > 0 && (
                                <div className="space-y-1">
                                  {item.errors.map(
                                    (error: string, errorIndex: number) => (
                                      <div
                                        key={errorIndex}
                                        className="flex items-start gap-2"
                                      >
                                        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-danger" />
                                        <span className="text-sm text-danger-700">
                                          {error}
                                        </span>
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </>
                )}

              {/* 处理重复数据的情况 */}
              {selectedErrorDetails?.data?.duplicates &&
                selectedErrorDetails.data.duplicates.length > 0 && (
                  <>
                    <div className="rounded-lg bg-warning-50 p-4">
                      <h4 className="mb-2 font-medium text-warning">
                        重复数据
                      </h4>
                      <p className="mb-3 text-sm text-warning-700">
                        以下商品已存在于数据库中，因此被跳过导入
                      </p>
                      <div className="text-sm text-warning-600">
                        <p className="mb-1 font-medium">可能的原因：</p>
                        <ul className="list-inside list-disc space-y-1">
                          <li>商品名称和品牌组合已存在</li>
                          <li>盒码或条码已被其他商品使用</li>
                          <li>之前已经导入过相同的文件</li>
                        </ul>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-3 font-medium">重复商品列表</h4>
                      <div className="max-h-96 space-y-3 overflow-y-auto">
                        {selectedErrorDetails.data.duplicates.map(
                          (item: any, index: number) => (
                            <div
                              key={index}
                              className="rounded-lg border border-warning-200 p-3"
                            >
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-sm font-medium">
                                  {item.data?.name || "未知商品"}
                                </span>
                                <Chip size="sm" color="warning" variant="flat">
                                  重复
                                </Chip>
                              </div>

                              {/* 显示商品信息 */}
                              {item.data && (
                                <div className="mb-2 space-y-1 text-xs">
                                  <p>
                                    <strong>品牌：</strong>
                                    {item.data.brand || "-"}
                                  </p>
                                  <p>
                                    <strong>盒码：</strong>
                                    {item.data.boxCode || "-"}
                                  </p>
                                  <p>
                                    <strong>条码：</strong>
                                    {item.data.barcode || "-"}
                                  </p>
                                  <p>
                                    <strong>价格：</strong>¥
                                    {item.data.companyPrice || "-"}
                                  </p>
                                </div>
                              )}

                              {/* 显示重复原因 */}
                              <div className="flex items-start gap-2">
                                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-warning" />
                                <span className="text-sm text-warning-700">
                                  {item.reason || "已存在相同商品"}
                                </span>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    </div>
                  </>
                )}

              {/* 如果既没有错误也没有重复数据 */}
              {!selectedErrorDetails?.data?.invalidProducts?.length &&
                !selectedErrorDetails?.data?.duplicates?.length && (
                  <div className="py-8 text-center">
                    <p className="text-default-500">暂无详细信息</p>
                  </div>
                )}
            </div>
          </ModalBody>
          <ModalFooter className="flex justify-between">
            <div className="flex gap-2">
              <Button
                variant="light"
                startContent={<Download className="h-4 w-4" />}
                onClick={downloadTemplate}
              >
                下载正确模板
              </Button>
              <Button
                variant="light"
                onClick={() => {
                  // 复制错误信息到剪贴板
                  const errorText =
                    selectedErrorDetails?.data?.errors?.join("\n") || ""
                  navigator.clipboard.writeText(errorText)
                  showSuccess("复制成功", "错误信息已复制到剪贴板")
                }}
              >
                复制错误信息
              </Button>
            </div>
            <Button color="primary" onClick={onErrorDetailClose}>
              关闭
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  )
}
