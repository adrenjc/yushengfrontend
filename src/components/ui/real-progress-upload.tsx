"use client"

import { useState, useRef } from "react"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Progress,
  Card,
  CardBody,
  Chip,
} from "@nextui-org/react"
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Download,
} from "lucide-react"
import { useNotifications } from "@/stores/app"
import { getAuthToken } from "@/lib/auth"

interface UploadResult {
  total: number
  success: number
  failed: number
  errors: string[]
}

interface RealProgressUploadProps {
  isOpen: boolean
  onClose: () => void
  endpoint: string
  templateId: string
  onSuccess?: (result: UploadResult) => void
  acceptedFileTypes?: string[]
  maxFileSize?: number // MB
}

enum UploadStage {
  SELECT = "select",
  UPLOADING = "uploading",
  PROCESSING = "processing",
  COMPLETED = "completed",
  ERROR = "error",
}

export function RealProgressUpload({
  isOpen,
  onClose,
  endpoint,
  templateId,
  onSuccess,
  acceptedFileTypes = [".csv", ".xlsx", ".xls"],
  maxFileSize = 10,
}: RealProgressUploadProps) {
  const [stage, setStage] = useState<UploadStage>(UploadStage.SELECT)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [processingProgress, setProcessingProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [error, setError] = useState<string>("")
  const [isDragOver, setIsDragOver] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const notifications = useNotifications()

  const resetState = () => {
    setStage(UploadStage.SELECT)
    setUploadProgress(0)
    setProcessingProgress(0)
    setSelectedFile(null)
    setResult(null)
    setError("")
    setIsDragOver(false)
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
  }

  const handleClose = () => {
    if (stage === UploadStage.UPLOADING || stage === UploadStage.PROCESSING) {
      // 正在上传或处理时，取消操作
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      notifications.info("取消上传", "文件上传已取消")
    }
    resetState()
    onClose()
  }

  const validateFile = (file: File): string | null => {
    // 检查文件类型
    const fileExtension = "." + file.name.split(".").pop()?.toLowerCase()
    if (!acceptedFileTypes.includes(fileExtension)) {
      return `不支持的文件类型。支持的格式: ${acceptedFileTypes.join(", ")}`
    }

    // 检查文件大小
    if (file.size > maxFileSize * 1024 * 1024) {
      return `文件大小超过限制。最大支持 ${maxFileSize}MB`
    }

    return null
  }

  const handleFileSelect = (file: File) => {
    const error = validateFile(file)
    if (error) {
      notifications.error("文件验证失败", error)
      return
    }
    setSelectedFile(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      handleFileSelect(files[0])
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }

  const startUpload = async () => {
    if (!selectedFile || !templateId) return

    try {
      setStage(UploadStage.UPLOADING)
      setUploadProgress(0)

      // 创建 AbortController 用于取消上传
      abortControllerRef.current = new AbortController()

      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("templateId", templateId)
      formData.append(
        "importType",
        selectedFile.name.endsWith(".csv") ? "csv" : "excel"
      )

      // 创建 XMLHttpRequest 以获取真实上传进度
      const xhr = new XMLHttpRequest()

      // 监听上传进度
      xhr.upload.addEventListener("progress", e => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100)
          setUploadProgress(progress)
        }
      })

      // 监听状态变化
      xhr.addEventListener("readystatechange", () => {
        if (xhr.readyState === XMLHttpRequest.DONE) {
          try {
            let response
            try {
              response = JSON.parse(xhr.responseText)
            } catch (parseError) {
              throw new Error("服务器响应格式错误")
            }

            if (xhr.status === 200) {
              setStage(UploadStage.PROCESSING)
              // 模拟处理进度
              simulateProcessingProgress()

              if (response.success) {
                setResult(response.data.results)
                setStage(UploadStage.COMPLETED)
                onSuccess?.(response.data.results)
                notifications.success("上传成功", response.message)
              } else {
                throw new Error(response.message || "上传失败")
              }
            } else if (xhr.status >= 400) {
              // 处理400-500错误
              const errorMessage =
                response.message ||
                response.error ||
                `服务器错误 (${xhr.status})`
              throw new Error(errorMessage)
            } else {
              throw new Error(`网络错误: ${xhr.status}`)
            }
          } catch (error) {
            setStage(UploadStage.ERROR)
            const errorMessage =
              error instanceof Error ? error.message : "上传失败"
            setError(errorMessage)
            notifications.error("上传失败", errorMessage)
          }
        }
      })

      // 监听取消信号
      abortControllerRef.current.signal.addEventListener("abort", () => {
        xhr.abort()
      })

      // 开始上传
      xhr.open("POST", endpoint)
      const token = getAuthToken()
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`)
      }
      xhr.send(formData)
    } catch (error) {
      setStage(UploadStage.ERROR)
      const errorMessage = error instanceof Error ? error.message : "上传失败"
      setError(errorMessage)
      notifications.error("上传失败", errorMessage)
    }
  }

  const simulateProcessingProgress = () => {
    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 100) {
        progress = 100
        clearInterval(interval)
      }
      setProcessingProgress(progress)
    }, 200)
  }

  const getStageInfo = () => {
    switch (stage) {
      case UploadStage.SELECT:
        return { title: "选择文件", color: "default" as const }
      case UploadStage.UPLOADING:
        return { title: "上传中...", color: "primary" as const }
      case UploadStage.PROCESSING:
        return { title: "处理中...", color: "secondary" as const }
      case UploadStage.COMPLETED:
        return { title: "完成", color: "success" as const }
      case UploadStage.ERROR:
        return { title: "失败", color: "danger" as const }
    }
  }

  const downloadTemplate = (format: "csv" | "excel" = "excel") => {
    // 创建一个包含正确字段的美观模板
    const headers = [
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
    ]

    // 提供更美观和真实的多行示例数据
    const sampleDataRows = [
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

    if (format === "csv") {
      // 创建包含表头和多行示例数据的CSV
      const allRows = [headers, ...sampleDataRows]
      const csvContent = allRows.map(row => row.join(",")).join("\n")
      const blob = new Blob(["\ufeff" + csvContent], {
        type: "text/csv;charset=utf-8;",
      })
      const link = document.createElement("a")
      const url = URL.createObjectURL(blob)
      link.setAttribute("href", url)
      link.setAttribute("download", "商品导入模板.csv")
      link.style.visibility = "hidden"
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } else {
      // 使用xlsx创建Excel文件
      import("xlsx")
        .then(XLSX => {
          // 创建包含表头和多行示例数据的工作表
          const allRows = [headers, ...sampleDataRows]
          const ws = XLSX.utils.aoa_to_sheet(allRows)

          // 设置列宽以提高美观度（按新字段顺序）
          const colWidths = [
            { wch: 20 }, // 商品名称
            { wch: 10 }, // 公司价
            { wch: 12 }, // 品牌
            { wch: 15 }, // 产品编码
            { wch: 15 }, // 盒码编码
            { wch: 10 }, // 产品类型
            { wch: 12 }, // 包装类型
            { wch: 12 }, // 烟支周长
            { wch: 18 }, // 烟支长度
            { wch: 10 }, // 包装数量
            { wch: 12 }, // 上市时间
            { wch: 12 }, // 焦油含量
            { wch: 12 }, // 烟气烟碱量
            { wch: 15 }, // 烟气一氧化碳量
            { wch: 8 }, // 颜色
            { wch: 25 }, // 所属企业
            { wch: 10 }, // 是否爆珠
            { wch: 10 }, // 价格类型
            { wch: 10 }, // 零售价
            { wch: 8 }, // 单位
          ]
          ws["!cols"] = colWidths

          // 设置表头样式：黑字蓝底
          const headerStyle = {
            fill: {
              fgColor: { rgb: "4472C4" }, // 蓝色背景
            },
            font: {
              color: { rgb: "FFFFFF" }, // 白色字体
              bold: true,
            },
            alignment: {
              horizontal: "center",
              vertical: "center",
            },
          }

          // 为表头行的每个单元格设置样式
          for (let col = 0; col < headers.length; col++) {
            const cellRef = XLSX.utils.encode_cell({ r: 0, c: col })
            if (!ws[cellRef]) continue
            ws[cellRef].s = headerStyle
          }

          const wb = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb, ws, "商品导入模板")
          XLSX.writeFile(wb, "商品导入模板.xlsx")

          notifications.success(
            "模板下载成功",
            "Excel模板已下载，包含详细示例数据"
          )
        })
        .catch(() => {
          // 如果xlsx加载失败，回退到CSV
          notifications.warning("Excel导出失败", "已切换到CSV格式下载")
          downloadTemplate("csv")
        })
    }
  }

  const stageInfo = getStageInfo()

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="2xl"
      isDismissable={
        stage === UploadStage.SELECT ||
        stage === UploadStage.COMPLETED ||
        stage === UploadStage.ERROR
      }
      hideCloseButton={
        stage === UploadStage.UPLOADING || stage === UploadStage.PROCESSING
      }
    >
      <ModalContent>
        <ModalHeader className="flex items-center gap-2">
          <Chip color={stageInfo.color} variant="flat">
            {stageInfo.title}
          </Chip>
          批量导入商品
        </ModalHeader>

        <ModalBody>
          {stage === UploadStage.SELECT && (
            <div className="space-y-4">
              <div className="mb-4 text-sm text-default-600">
                <p>支持的文件格式: {acceptedFileTypes.join(", ")}</p>
                <p>最大文件大小: {maxFileSize}MB</p>
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    variant="flat"
                    color="primary"
                    startContent={<Download className="h-4 w-4" />}
                    onClick={() => downloadTemplate("excel")}
                  >
                    下载Excel模板
                  </Button>
                  <Button
                    size="sm"
                    variant="flat"
                    color="secondary"
                    startContent={<Download className="h-4 w-4" />}
                    onClick={() => downloadTemplate("csv")}
                  >
                    下载CSV模板
                  </Button>
                </div>
              </div>

              <Card
                className={`border-2 border-dashed transition-colors ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : selectedFile
                      ? "border-success bg-success/5"
                      : "border-default-300"
                }`}
              >
                <CardBody
                  className="cursor-pointer py-8 text-center"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="space-y-2">
                    {selectedFile ? (
                      <CheckCircle className="mx-auto h-12 w-12 text-success" />
                    ) : (
                      <Upload className="mx-auto h-12 w-12 text-default-400" />
                    )}
                    <div>
                      {selectedFile ? (
                        <>
                          <p className="font-medium">{selectedFile.name}</p>
                          <p className="text-sm text-default-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-medium">
                            {isDragOver
                              ? "松开鼠标上传文件"
                              : "点击或拖拽文件到此处"}
                          </p>
                          <p className="text-sm text-default-500">
                            支持 {acceptedFileTypes.join(", ")} 格式
                          </p>
                        </>
                      )}
                    </div>
                    {selectedFile && (
                      <Button
                        size="sm"
                        variant="light"
                        onClick={e => {
                          e.stopPropagation()
                          setSelectedFile(null)
                        }}
                      >
                        重新选择
                      </Button>
                    )}
                  </div>
                </CardBody>
              </Card>

              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedFileTypes.join(",")}
                onChange={e => {
                  const file = e.target.files?.[0]
                  if (file) handleFileSelect(file)
                }}
                className="hidden"
              />
            </div>
          )}

          {stage === UploadStage.UPLOADING && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">{selectedFile?.name}</span>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>上传进度</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} color="primary" />
              </div>
            </div>
          )}

          {stage === UploadStage.PROCESSING && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-secondary" />
                <span className="font-medium">{selectedFile?.name}</span>
              </div>
              <div>
                <div className="mb-2 flex justify-between text-sm">
                  <span>文件处理中...</span>
                  <span>{processingProgress.toFixed(0)}%</span>
                </div>
                <Progress value={processingProgress} color="secondary" />
              </div>
              <p className="text-sm text-default-600">
                正在解析和导入商品数据，请稍候...
              </p>
            </div>
          )}

          {stage === UploadStage.COMPLETED && result && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-success">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">导入完成</span>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardBody className="py-3 text-center">
                    <div className="text-2xl font-bold text-success">
                      {result.total}
                    </div>
                    <div className="text-sm text-default-600">总记录数</div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="py-3 text-center">
                    <div className="text-2xl font-bold text-success">
                      {result.success}
                    </div>
                    <div className="text-sm text-default-600">成功导入</div>
                  </CardBody>
                </Card>
                <Card>
                  <CardBody className="py-3 text-center">
                    <div className="text-2xl font-bold text-danger">
                      {result.failed}
                    </div>
                    <div className="text-sm text-default-600">导入失败</div>
                  </CardBody>
                </Card>
              </div>

              {result.errors.length > 0 && (
                <Card>
                  <CardBody>
                    <div className="mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-warning" />
                      <span className="font-medium">错误详情</span>
                    </div>
                    <div className="max-h-40 space-y-1 overflow-y-auto">
                      {result.errors.map((error, index) => (
                        <div
                          key={index}
                          className="rounded bg-danger/10 p-2 text-sm text-danger"
                        >
                          {error}
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>
              )}
            </div>
          )}

          {stage === UploadStage.ERROR && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-danger">
                <XCircle className="h-5 w-5" />
                <span className="font-medium">上传失败</span>
              </div>
              <Card className="bg-danger/10">
                <CardBody>
                  <p className="text-danger">{error}</p>
                </CardBody>
              </Card>
            </div>
          )}
        </ModalBody>

        <ModalFooter>
          {stage === UploadStage.SELECT && (
            <>
              <Button variant="light" onPress={handleClose}>
                取消
              </Button>
              <Button
                color="primary"
                onPress={startUpload}
                isDisabled={!selectedFile}
              >
                开始上传
              </Button>
            </>
          )}

          {(stage === UploadStage.UPLOADING ||
            stage === UploadStage.PROCESSING) && (
            <Button color="danger" variant="light" onPress={handleClose}>
              取消上传
            </Button>
          )}

          {(stage === UploadStage.COMPLETED || stage === UploadStage.ERROR) && (
            <>
              <Button variant="light" onPress={resetState}>
                重新上传
              </Button>
              <Button color="primary" onPress={handleClose}>
                完成
              </Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
