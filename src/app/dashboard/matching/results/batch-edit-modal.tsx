"use client"

import React, { useState, useEffect, useMemo } from "react"
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Card,
  CardBody,
  Chip,
  Input,
  Pagination,
} from "@nextui-org/react"
import { Search, Package, Edit } from "lucide-react"

interface Product {
  _id: string
  name: string
  brand: string
  company: string
  productType: string
  packageType: string
  specifications: {
    circumference: number
    length: string
    packageQuantity: number
  }
  chemicalContent: {
    tarContent: number
    nicotineContent: number
    carbonMonoxideContent: number
  }
  appearance: {
    color: string
  }
  features: {
    hasPop: boolean
  }
  pricing: {
    priceCategory: string
    retailPrice: number
    unit: string
    companyPrice: number
  }
  productCode: string
  boxCode: string
  keywords: string[]
  category: string
}

interface MatchingResult {
  _id: string
  originalData: {
    name: string
    price: number
    quantity: number
    unit: string
    supplier: string
  }
  selectedMatch?: {
    productId: {
      _id: string
      name: string
      brand: string
      company: string
      productType: string
      packageType: string
      specifications: {
        circumference: number
        length: string
        packageQuantity: number
      }
      chemicalContent: {
        tarContent: number
        nicotineContent: number
        carbonMonoxideContent: number
      }
      appearance: {
        color: string
      }
      features: {
        hasPop: boolean
      }
      pricing: {
        priceCategory: string
        retailPrice: number
        unit: string
        companyPrice: number
      }
      productCode: string
      boxCode: string
    }
    confidence: number
    score: number
    matchType: string
  }
  status: "confirmed" | "rejected" | "exception"
}

interface BatchEditModalProps {
  isOpen: boolean
  onClose: () => void
  selectedRecords: Set<string>
  records: MatchingResult[]
  templateProducts: Product[]
  batchChanges: Map<string, string>
  setBatchChanges: (changes: Map<string, string>) => void
  onSave: () => void
  isLoading: boolean
  isLoadingProducts: boolean
}

export default function BatchEditModal({
  isOpen,
  onClose,
  selectedRecords,
  records,
  templateProducts,
  batchChanges,
  setBatchChanges,
  onSave,
  isLoading,
  isLoadingProducts,
}: BatchEditModalProps) {
  const [expandedRecord, setExpandedRecord] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [currentPage, setCurrentPage] = useState(1)

  // 重置状态当模态关闭时
  useEffect(() => {
    if (!isOpen) {
      setExpandedRecord(null)
      setSearchTerm("")
      setCurrentPage(1)
    }
  }, [isOpen])

  // 过滤商品 - 性能优化，支持全字段搜索
  const filteredProducts = useMemo(() => {
    if (!searchTerm) return templateProducts

    const lowerSearchTerm = searchTerm.toLowerCase()
    return templateProducts.filter(
      product =>
        product.name.toLowerCase().includes(lowerSearchTerm) ||
        product.brand.toLowerCase().includes(lowerSearchTerm) ||
        product.company?.toLowerCase().includes(lowerSearchTerm) ||
        product.productType?.toLowerCase().includes(lowerSearchTerm) ||
        product.packageType?.toLowerCase().includes(lowerSearchTerm) ||
        product.productCode?.toLowerCase().includes(lowerSearchTerm) ||
        product.boxCode?.toLowerCase().includes(lowerSearchTerm) ||
        product.pricing?.priceCategory
          ?.toLowerCase()
          .includes(lowerSearchTerm) ||
        product.keywords.some(keyword =>
          keyword.toLowerCase().includes(searchTerm.toLowerCase())
        )
    )
  }, [templateProducts, searchTerm])

  // 分页 - 网格布局适配
  const productsPerPage = 18 // 3列 x 6行
  const totalPages = Math.ceil(filteredProducts.length / productsPerPage)
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(
      (currentPage - 1) * productsPerPage,
      currentPage * productsPerPage
    )
  }, [filteredProducts, currentPage, productsPerPage])

  // 选择商品
  const selectProduct = (recordId: string, productId: string) => {
    // 避免重复选择
    if (batchChanges.get(recordId) === productId) {
      return
    }

    const newChanges = new Map(batchChanges)
    newChanges.set(recordId, productId)
    setBatchChanges(newChanges)

    // 立即关闭，简化交互
    setExpandedRecord(null)

    console.log("✅ 已选择商品:", productId, "记录:", recordId)
  }

  // 清除选择
  const clearSelection = (recordId: string) => {
    const newChanges = new Map(batchChanges)
    newChanges.delete(recordId)
    setBatchChanges(newChanges)
    console.log("🗑️ 已清除选择:", recordId)
  }

  // 切换展开状态
  const toggleExpand = (recordId: string) => {
    console.log("🔄 切换展开状态:", recordId, "当前:", expandedRecord)
    if (expandedRecord === recordId) {
      setExpandedRecord(null)
      console.log("🔒 关闭选择器")
    } else {
      setExpandedRecord(recordId)
      setSearchTerm("") // 重置搜索
      setCurrentPage(1) // 重置分页
      console.log("🔧 打开选择器")
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="5xl"
      scrollBehavior="inside"
      classNames={{
        base: "max-w-[90vw] h-[85vh]",
        body: "h-[70vh] min-h-[600px]",
      }}
    >
      <ModalContent>
        <ModalHeader className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">批量修改匹配</h3>
            <p className="text-sm text-default-500">
              点击记录展开商品列表，为每个记录选择对应商品
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Chip color="primary" variant="flat">
              共 {selectedRecords.size} 条记录
            </Chip>
            <Button
              color="primary"
              onClick={onSave}
              isLoading={isLoading}
              disabled={batchChanges.size === 0}
            >
              保存修改 ({batchChanges.size})
            </Button>
          </div>
        </ModalHeader>

        <ModalBody>
          <div className="space-y-4">
            {Array.from(selectedRecords).map(recordId => {
              const record = records.find(r => r._id === recordId)
              if (!record) return null

              const selectedProductId = batchChanges.get(recordId)
              const selectedProduct = selectedProductId
                ? templateProducts.find(p => p._id === selectedProductId)
                : null
              const isExpanded = expandedRecord === recordId

              return (
                <div key={recordId} className="space-y-2">
                  {/* 记录信息卡片 */}
                  <Card
                    className={`transition-all ${
                      isExpanded ? "bg-primary-50 ring-2 ring-primary" : ""
                    }`}
                  >
                    <CardBody className="p-4">
                      <div className="grid grid-cols-12 items-center gap-4">
                        {/* 原始商品 */}
                        <div className="col-span-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium">
                                {record.originalData.name}
                              </p>
                              {isExpanded && (
                                <Chip size="sm" color="primary" variant="flat">
                                  编辑中
                                </Chip>
                              )}
                            </div>
                            <p className="text-xs text-default-500">
                              ¥{record.originalData.price} |{" "}
                              {record.originalData.quantity}
                              {record.originalData.unit}
                            </p>
                            <p className="text-xs text-default-400">
                              供应商: {record.originalData.supplier}
                            </p>
                          </div>
                        </div>

                        {/* 当前匹配 */}
                        <div className="col-span-3">
                          <div className="text-center">
                            <p className="mb-1 text-xs text-default-500">
                              当前匹配
                            </p>
                            {record.selectedMatch?.productId ? (
                              <div className="space-y-1">
                                <p className="text-sm">
                                  {record.selectedMatch.productId.name}
                                </p>
                                <p className="text-xs text-default-500">
                                  {record.selectedMatch.productId.brand} | ¥
                                  {record.selectedMatch.productId.pricing
                                    ?.companyPrice ||
                                    record.selectedMatch.productId.pricing
                                      ?.retailPrice ||
                                    0}
                                </p>
                              </div>
                            ) : (
                              <span className="text-sm text-default-400">
                                无匹配
                              </span>
                            )}
                          </div>
                        </div>

                        {/* 新选择 */}
                        <div className="col-span-4">
                          <div className="text-center">
                            <p className="mb-1 text-xs text-default-500">
                              新选择
                            </p>
                            {selectedProduct ? (
                              <div className="space-y-1 rounded-lg border-l-4 border-primary bg-primary-50 p-2">
                                <p className="text-sm font-medium text-primary-700">
                                  {selectedProduct.name}
                                </p>
                                <p className="text-xs text-primary-600">
                                  {selectedProduct.brand} | ¥
                                  {selectedProduct.pricing?.companyPrice ||
                                    selectedProduct.pricing?.retailPrice ||
                                    0}
                                </p>
                                <Button
                                  size="sm"
                                  color="danger"
                                  variant="light"
                                  onClick={() => clearSelection(recordId)}
                                >
                                  清除
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2 text-sm text-default-400">
                                <span>点击右侧按钮选择商品</span>
                                <Edit className="h-3 w-3" />
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 操作按钮 */}
                        <div className="col-span-2 text-right">
                          <Button
                            color="primary"
                            variant={isExpanded ? "solid" : "flat"}
                            onClick={() => toggleExpand(recordId)}
                          >
                            {isExpanded ? "收起" : "选择商品"}
                          </Button>
                        </div>
                      </div>
                    </CardBody>
                  </Card>

                  {/* 商品选择器 */}
                  {isExpanded && (
                    <Card key={`selector-${recordId}`}>
                      <CardBody className="p-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h4 className="font-medium text-primary-700">
                              为 "{record.originalData.name}" 选择商品
                            </h4>
                            <Button
                              size="sm"
                              variant="light"
                              onClick={() => setExpandedRecord(null)}
                            >
                              关闭
                            </Button>
                          </div>

                          <Input
                            ref={input => {
                              if (input && isOpen && expandedRecord) {
                                setTimeout(() => input.focus(), 100)
                              }
                            }}
                            placeholder="搜索商品名称、品牌、企业、产品类型、价格类型、条码、盒码或关键词..."
                            value={searchTerm}
                            onValueChange={setSearchTerm}
                            startContent={<Search className="h-4 w-4" />}
                            onClear={() => setSearchTerm("")}
                            isClearable
                            className="max-w-md"
                          />

                          {isLoadingProducts ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="text-center">
                                <div className="mb-2 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                <p className="text-sm text-default-500">
                                  加载商品...
                                </p>
                              </div>
                            </div>
                          ) : paginatedProducts.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-8">
                              <Package className="mb-2 h-12 w-12 text-default-300" />
                              <p className="text-default-500">
                                {searchTerm
                                  ? "未找到匹配的商品"
                                  : "模板下无商品"}
                              </p>
                            </div>
                          ) : (
                            <div className="max-h-72 overflow-y-auto scroll-smooth will-change-scroll">
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                                {paginatedProducts.map(product => {
                                  const isSelected =
                                    batchChanges.get(recordId) === product._id
                                  return (
                                    <Card
                                      key={product._id}
                                      className={`cursor-pointer transition-all duration-200 ease-in-out ${
                                        isSelected
                                          ? "bg-primary-50 shadow-lg ring-2 ring-primary"
                                          : "hover:bg-default-50 hover:shadow-md"
                                      }`}
                                      onClick={() =>
                                        selectProduct(recordId, product._id)
                                      }
                                      isPressable
                                    >
                                      <CardBody className="relative p-3">
                                        {isSelected && (
                                          <div className="absolute right-2 top-2">
                                            <Chip
                                              size="sm"
                                              color="primary"
                                              variant="solid"
                                              className="text-xs"
                                            >
                                              ✓ 已选
                                            </Chip>
                                          </div>
                                        )}
                                        <div className="space-y-2">
                                          <p
                                            className={`line-clamp-2 text-sm font-medium ${
                                              isSelected
                                                ? "text-primary-700"
                                                : ""
                                            }`}
                                          >
                                            {product.name}
                                          </p>
                                          <div className="space-y-1">
                                            {/* 基本信息 */}
                                            <div className="flex flex-wrap gap-2 text-xs text-default-600">
                                              <span>{product.brand}</span>
                                              {product.company && (
                                                <>
                                                  <span>|</span>
                                                  <span>{product.company}</span>
                                                </>
                                              )}
                                            </div>

                                            {/* 价格信息 */}
                                            <p
                                              className={`text-xs font-medium ${
                                                isSelected
                                                  ? "text-primary-600"
                                                  : "text-success"
                                              }`}
                                            >
                                              ¥
                                              {product.pricing?.companyPrice ||
                                                product.pricing?.retailPrice ||
                                                0}
                                              {product.pricing?.unit &&
                                                ` / ${product.pricing.unit}`}
                                            </p>

                                            {/* 规格信息 */}
                                            {product.specifications && (
                                              <div className="space-y-0.5">
                                                {product.specifications
                                                  .circumference && (
                                                  <p className="text-xs text-default-500">
                                                    周长:{" "}
                                                    {
                                                      product.specifications
                                                        .circumference
                                                    }
                                                    mm
                                                  </p>
                                                )}
                                                {product.specifications
                                                  .length && (
                                                  <p className="text-xs text-default-500">
                                                    长度:{" "}
                                                    {
                                                      product.specifications
                                                        .length
                                                    }
                                                  </p>
                                                )}
                                              </div>
                                            )}

                                            {/* 编码信息 */}
                                            <div className="space-y-0.5">
                                              {product.productCode && (
                                                <p className="text-xs text-default-500">
                                                  产品编码:{" "}
                                                  {product.productCode}
                                                </p>
                                              )}
                                              {product.boxCode && (
                                                <p className="text-xs text-default-500">
                                                  盒码: {product.boxCode}
                                                </p>
                                              )}
                                            </div>
                                          </div>

                                          {/* 特殊属性标签 */}
                                          <div className="flex flex-wrap gap-1">
                                            {product.pricing?.priceCategory && (
                                              <Chip
                                                size="sm"
                                                variant="flat"
                                                color="secondary"
                                                className="text-xs"
                                              >
                                                {product.pricing.priceCategory}
                                              </Chip>
                                            )}
                                            {product.packageType && (
                                              <Chip
                                                size="sm"
                                                variant="flat"
                                                color="default"
                                                className="text-xs"
                                              >
                                                {product.packageType}
                                              </Chip>
                                            )}
                                            {product.features?.hasPop && (
                                              <Chip
                                                size="sm"
                                                variant="flat"
                                                color="success"
                                                className="text-xs"
                                              >
                                                爆珠
                                              </Chip>
                                            )}
                                            {product.appearance?.color && (
                                              <Chip
                                                size="sm"
                                                variant="flat"
                                                color="warning"
                                                className="text-xs"
                                              >
                                                {product.appearance.color}
                                              </Chip>
                                            )}
                                          </div>
                                          {product.keywords.length > 0 && (
                                            <div className="flex flex-wrap gap-1">
                                              {product.keywords
                                                .slice(0, 2)
                                                .map((keyword, index) => (
                                                  <Chip
                                                    key={index}
                                                    size="sm"
                                                    variant="flat"
                                                    color={
                                                      isSelected
                                                        ? "primary"
                                                        : "default"
                                                    }
                                                    className="text-xs"
                                                  >
                                                    {keyword}
                                                  </Chip>
                                                ))}
                                              {product.keywords.length > 2 && (
                                                <Chip
                                                  size="sm"
                                                  variant="flat"
                                                  color={
                                                    isSelected
                                                      ? "primary"
                                                      : "default"
                                                  }
                                                  className="text-xs"
                                                >
                                                  +{product.keywords.length - 2}
                                                </Chip>
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </CardBody>
                                    </Card>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {totalPages > 1 && (
                            <div className="flex justify-center">
                              <Pagination
                                total={totalPages}
                                page={currentPage}
                                onChange={setCurrentPage}
                                size="sm"
                              />
                            </div>
                          )}
                        </div>
                      </CardBody>
                    </Card>
                  )}
                </div>
              )
            })}
          </div>
        </ModalBody>

        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            取消
          </Button>
          <Button
            color="primary"
            onPress={onSave}
            isLoading={isLoading}
            disabled={batchChanges.size === 0}
          >
            保存所有修改 ({batchChanges.size})
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}
