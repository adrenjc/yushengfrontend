"use client"

import { useState, useCallback, useMemo } from "react"
import {
  Card,
  CardBody,
  Input,
  Select,
  SelectItem,
  Button,
  Chip,
  Accordion,
  AccordionItem,
  DateInput,
  Divider,
} from "@nextui-org/react"
import { Search, Filter, X, RotateCcw } from "lucide-react"
import { parseDate } from "@internationalized/date"

export interface SearchFilters {
  search?: string
  brand?: string
  company?: string
  category?: string
  productType?: string
  packageType?: string
  circumferenceMin?: number
  circumferenceMax?: number
  packageQuantityMin?: number
  packageQuantityMax?: number
  tarContentMin?: number
  tarContentMax?: number
  nicotineContentMin?: number
  nicotineContentMax?: number
  color?: string
  hasPop?: string
  priceCategory?: string
  retailPriceMin?: number
  retailPriceMax?: number
  launchDateStart?: string
  launchDateEnd?: string
  isActive?: string
  // 批发价相关筛选
  hasWholesalePrice?: string // "all" | "yes" | "no"
  wholesalePriceMin?: number
  wholesalePriceMax?: number
}

interface ProductSearchBarProps {
  onSearch: (filters: SearchFilters) => void
  onClear: () => void
  isLoading?: boolean
  className?: string
}

export default function ProductSearchBar({
  onSearch,
  onClear,
  isLoading = false,
  className = "",
}: ProductSearchBarProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    isActive: "all",
    hasPop: "all",
    hasWholesalePrice: "all",
  })

  // 已应用的筛选条件（只有在点击搜索后才更新）
  const [appliedFilters, setAppliedFilters] = useState<SearchFilters>({})

  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  // 下拉选项数据
  const options = useMemo(
    () => ({
      productTypes: ["烤烟型", "混合型", "雪茄型", "斗烟型"],
      packageTypes: ["条盒硬盒", "条盒软盒", "听装", "盒装"],
      priceCategories: ["一类", "二类", "三类", "四类", "五类"],
      colors: ["金", "银", "蓝", "红", "绿", "黑", "白", "紫", "橙", "黄"],
      companies: [
        "红塔集团",
        "湖北中烟",
        "河南中烟",
        "江西中烟",
        "四川中烟",
        "浙江中烟",
        "江苏中烟",
        "甘肃中烟",
        "重庆中烟",
        "上海",
      ],
      brands: [
        "玉溪",
        "黄鹤楼",
        "黄金叶",
        "金圣",
        "娇子",
        "利群",
        "南京",
        "兰州",
        "天子",
        "熊猫",
      ],
    }),
    []
  )

  // 处理输入变化
  const handleInputChange = useCallback(
    (field: keyof SearchFilters, value: any) => {
      setFilters(prev => ({ ...prev, [field]: value }))
    },
    []
  )

  // 处理快速筛选变化（立即触发搜索）
  const handleQuickFilterChange = useCallback(
    (field: keyof SearchFilters, value: any) => {
      const newFilters = { ...filters, [field]: value }
      setFilters(newFilters)

      // 立即触发搜索
      setTimeout(() => {
        const processedFilters: Partial<SearchFilters> = {}
        Object.entries(newFilters).forEach(([key, val]) => {
          if (
            val !== undefined &&
            val !== null &&
            val !== "" &&
            val !== "all"
          ) {
            ;(processedFilters as any)[key] = val
          }
        })
        setAppliedFilters(processedFilters as SearchFilters)
        onSearch(processedFilters as SearchFilters)
      }, 0)
    },
    [filters, onSearch]
  )

  // 执行搜索
  const handleSearch = useCallback(() => {
    const processedFilters: Partial<SearchFilters> = {}

    // 处理基础搜索
    if (filters.search?.trim()) {
      processedFilters.search = filters.search.trim()
    }

    // 处理基本信息
    if (filters.brand) processedFilters.brand = filters.brand
    if (filters.company) processedFilters.company = filters.company
    if (filters.category) processedFilters.category = filters.category

    // 处理产品规格
    if (filters.productType) processedFilters.productType = filters.productType
    if (filters.packageType) processedFilters.packageType = filters.packageType

    // 处理状态和特性
    if (filters.isActive && filters.isActive !== "all") {
      processedFilters.isActive = filters.isActive
    }
    if (filters.hasPop && filters.hasPop !== "all") {
      processedFilters.hasPop = filters.hasPop
    }

    // 处理价格
    if (filters.priceCategory)
      processedFilters.priceCategory = filters.priceCategory
    if (filters.retailPriceMin)
      processedFilters.retailPriceMin = Number(filters.retailPriceMin)
    if (filters.retailPriceMax)
      processedFilters.retailPriceMax = Number(filters.retailPriceMax)

    // 处理规格范围
    if (filters.circumferenceMin)
      processedFilters.circumferenceMin = Number(filters.circumferenceMin)
    if (filters.circumferenceMax)
      processedFilters.circumferenceMax = Number(filters.circumferenceMax)
    if (filters.packageQuantityMin)
      processedFilters.packageQuantityMin = Number(filters.packageQuantityMin)
    if (filters.packageQuantityMax)
      processedFilters.packageQuantityMax = Number(filters.packageQuantityMax)

    // 处理化学含量
    if (filters.tarContentMin)
      processedFilters.tarContentMin = Number(filters.tarContentMin)
    if (filters.tarContentMax)
      processedFilters.tarContentMax = Number(filters.tarContentMax)
    if (filters.nicotineContentMin)
      processedFilters.nicotineContentMin = Number(filters.nicotineContentMin)
    if (filters.nicotineContentMax)
      processedFilters.nicotineContentMax = Number(filters.nicotineContentMax)

    // 处理其他字段
    if (filters.color) processedFilters.color = filters.color
    if (filters.launchDateStart)
      processedFilters.launchDateStart = filters.launchDateStart
    if (filters.launchDateEnd)
      processedFilters.launchDateEnd = filters.launchDateEnd

    // 更新已应用的筛选条件（用于显示提示）
    setAppliedFilters(processedFilters as SearchFilters)

    onSearch(processedFilters as SearchFilters)
  }, [filters, onSearch])

  // 清空所有筛选
  const handleClear = useCallback(() => {
    const defaultFilters = {
      isActive: "all",
      hasPop: "all",
    }
    setFilters(defaultFilters)
    setAppliedFilters({})
    onClear()
  }, [onClear])

  // 处理键盘事件
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch()
      }
    },
    [handleSearch]
  )

  // 计算已应用的筛选条件（只有在搜索后才显示）
  const activeFilters = useMemo(() => {
    const active: string[] = []
    if (appliedFilters.search?.trim()) active.push("搜索")
    if (appliedFilters.brand) active.push(`品牌: ${appliedFilters.brand}`)
    if (appliedFilters.company) active.push(`企业: ${appliedFilters.company}`)
    if (appliedFilters.productType)
      active.push(`类型: ${appliedFilters.productType}`)
    if (appliedFilters.packageType)
      active.push(`包装: ${appliedFilters.packageType}`)
    if (appliedFilters.priceCategory)
      active.push(`价格类型: ${appliedFilters.priceCategory}`)
    if (appliedFilters.color) active.push(`颜色: ${appliedFilters.color}`)
    if (appliedFilters.isActive && appliedFilters.isActive !== "all") {
      active.push(
        `状态: ${appliedFilters.isActive === "true" ? "启用" : "禁用"}`
      )
    }
    if (appliedFilters.hasPop && appliedFilters.hasPop !== "all") {
      active.push(`爆珠: ${appliedFilters.hasPop === "true" ? "有" : "无"}`)
    }
    if (
      appliedFilters.hasWholesalePrice &&
      appliedFilters.hasWholesalePrice !== "all"
    ) {
      active.push(
        `批发价: ${appliedFilters.hasWholesalePrice === "yes" ? "有" : "无"}`
      )
    }
    if (appliedFilters.circumferenceMin || appliedFilters.circumferenceMax) {
      active.push("周长范围")
    }
    if (appliedFilters.retailPriceMin || appliedFilters.retailPriceMax) {
      active.push("价格范围")
    }
    if (appliedFilters.wholesalePriceMin || appliedFilters.wholesalePriceMax) {
      active.push("批发价范围")
    }
    if (appliedFilters.tarContentMin || appliedFilters.tarContentMax) {
      active.push("焦油含量")
    }
    if (appliedFilters.launchDateStart || appliedFilters.launchDateEnd) {
      active.push("上市时间")
    }
    return active
  }, [appliedFilters])

  return (
    <Card className={`mb-4 ${className}`}>
      <CardBody className="space-y-4">
        {/* 主搜索栏 */}
        <div className="flex gap-2">
          <Input
            placeholder="搜索商品名称、品牌、企业..."
            value={filters.search || ""}
            onChange={e => handleInputChange("search", e.target.value)}
            onKeyDown={handleKeyDown}
            startContent={<Search className="text-default-400" size={18} />}
            className="flex-1"
            classNames={{
              input: "text-sm",
              inputWrapper: "h-10",
            }}
          />
          <Button
            color="primary"
            onPress={handleSearch}
            isLoading={isLoading}
            className="h-10 px-6"
            startContent={!isLoading && <Search size={16} />}
          >
            搜索
          </Button>
          <Button
            variant="flat"
            onPress={handleClear}
            className="h-10 px-4"
            startContent={<RotateCcw size={16} />}
          >
            清空
          </Button>
        </div>

        {/* 快速筛选 */}
        <div className="flex flex-wrap gap-2">
          <Select
            placeholder="产品类型"
            selectedKeys={filters.productType ? [filters.productType] : []}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              handleQuickFilterChange("productType", value || "")
            }}
            className="w-32"
            size="sm"
            classNames={{ trigger: "h-8 min-h-8" }}
          >
            {options.productTypes.map(type => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </Select>

          <Select
            placeholder="价格类型"
            selectedKeys={filters.priceCategory ? [filters.priceCategory] : []}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              handleQuickFilterChange("priceCategory", value || "")
            }}
            className="w-32"
            size="sm"
            classNames={{ trigger: "h-8 min-h-8" }}
          >
            {options.priceCategories.map(category => (
              <SelectItem key={category} value={category}>
                {category}
              </SelectItem>
            ))}
          </Select>

          <Select
            placeholder="状态"
            selectedKeys={[filters.isActive || "all"]}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              handleQuickFilterChange("isActive", value || "all")
            }}
            className="w-24"
            size="sm"
            classNames={{ trigger: "h-8 min-h-8" }}
          >
            <SelectItem key="all" value="all">
              全部
            </SelectItem>
            <SelectItem key="true" value="true">
              启用
            </SelectItem>
            <SelectItem key="false" value="false">
              禁用
            </SelectItem>
          </Select>

          <Select
            placeholder="爆珠"
            selectedKeys={[filters.hasPop || "all"]}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              handleQuickFilterChange("hasPop", value || "all")
            }}
            className="w-24"
            size="sm"
            classNames={{ trigger: "h-8 min-h-8" }}
          >
            <SelectItem key="all" value="all">
              全部
            </SelectItem>
            <SelectItem key="true" value="true">
              有爆珠
            </SelectItem>
            <SelectItem key="false" value="false">
              无爆珠
            </SelectItem>
          </Select>

          <Select
            placeholder="批发价"
            selectedKeys={[filters.hasWholesalePrice || "all"]}
            onSelectionChange={keys => {
              const value = Array.from(keys)[0] as string
              handleQuickFilterChange("hasWholesalePrice", value || "all")
            }}
            className="w-32"
            size="sm"
            classNames={{ trigger: "h-8 min-h-8" }}
          >
            <SelectItem key="all" value="all">
              全部
            </SelectItem>
            <SelectItem key="yes" value="yes">
              已有批发价
            </SelectItem>
            <SelectItem key="no" value="no">
              暂无批发价
            </SelectItem>
          </Select>

          <Button
            variant="flat"
            size="sm"
            className="h-8"
            startContent={<Filter size={14} />}
            onPress={() => setIsAdvancedOpen(!isAdvancedOpen)}
          >
            高级筛选
          </Button>
        </div>

        {/* 活跃筛选条件显示 */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {activeFilters.map((filter, index) => (
              <Chip
                key={index}
                size="sm"
                variant="flat"
                color="primary"
                endContent={
                  <button
                    className="ml-1"
                    onClick={() => {
                      // 根据筛选条件类型清除相应的值，并立即触发搜索
                      if (filter === "搜索") {
                        handleQuickFilterChange("search", "")
                      } else if (filter.startsWith("品牌:")) {
                        handleQuickFilterChange("brand", "")
                      } else if (filter.startsWith("企业:")) {
                        handleQuickFilterChange("company", "")
                      } else if (filter.startsWith("类型:")) {
                        handleQuickFilterChange("productType", "")
                      } else if (filter.startsWith("包装:")) {
                        handleQuickFilterChange("packageType", "")
                      } else if (filter.startsWith("价格类型:")) {
                        handleQuickFilterChange("priceCategory", "")
                      } else if (filter.startsWith("颜色:")) {
                        handleQuickFilterChange("color", "")
                      } else if (filter.startsWith("状态:")) {
                        handleQuickFilterChange("isActive", "all")
                      } else if (filter.startsWith("爆珠:")) {
                        handleQuickFilterChange("hasPop", "all")
                      } else if (filter.startsWith("批发价:")) {
                        handleQuickFilterChange("hasWholesalePrice", "all")
                      } else {
                        // 处理范围筛选
                        const rangeFilters: Record<
                          string,
                          [keyof SearchFilters, keyof SearchFilters]
                        > = {
                          批发价范围: [
                            "wholesalePriceMin",
                            "wholesalePriceMax",
                          ],
                          周长范围: ["circumferenceMin", "circumferenceMax"],
                          价格范围: ["retailPriceMin", "retailPriceMax"],
                          焦油含量: ["tarContentMin", "tarContentMax"],
                          上市时间: ["launchDateStart", "launchDateEnd"],
                        }

                        const fieldsToClear = rangeFilters[filter]
                        if (fieldsToClear) {
                          const newFilters = { ...filters }
                          fieldsToClear.forEach(field => {
                            newFilters[field] = undefined
                          })
                          setFilters(newFilters)

                          // 立即触发搜索
                          setTimeout(() => {
                            const processedFilters: Partial<SearchFilters> = {}
                            Object.entries(newFilters).forEach(([key, val]) => {
                              if (
                                val !== undefined &&
                                val !== null &&
                                val !== "" &&
                                val !== "all"
                              ) {
                                ;(processedFilters as any)[key] = val
                              }
                            })
                            setAppliedFilters(processedFilters as SearchFilters)
                            onSearch(processedFilters as SearchFilters)
                          }, 0)
                        }
                      }
                    }}
                  >
                    <X size={12} />
                  </button>
                }
              >
                {filter}
              </Chip>
            ))}
          </div>
        )}

        {/* 高级筛选折叠面板 */}
        {isAdvancedOpen && (
          <Accordion defaultExpandedKeys={["advanced"]}>
            <AccordionItem
              key="advanced"
              aria-label="高级筛选"
              title="高级筛选选项"
              className="px-0"
            >
              <div className="space-y-4 pt-2">
                {/* 基本信息 */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Select
                    label="品牌"
                    placeholder="选择品牌"
                    selectedKeys={filters.brand ? [filters.brand] : []}
                    onSelectionChange={keys => {
                      const value = Array.from(keys)[0] as string
                      handleInputChange("brand", value || "")
                    }}
                    size="sm"
                  >
                    {options.brands.map(brand => (
                      <SelectItem key={brand} value={brand}>
                        {brand}
                      </SelectItem>
                    ))}
                  </Select>

                  <Select
                    label="企业"
                    placeholder="选择企业"
                    selectedKeys={filters.company ? [filters.company] : []}
                    onSelectionChange={keys => {
                      const value = Array.from(keys)[0] as string
                      handleInputChange("company", value || "")
                    }}
                    size="sm"
                  >
                    {options.companies.map(company => (
                      <SelectItem key={company} value={company}>
                        {company}
                      </SelectItem>
                    ))}
                  </Select>

                  <Select
                    label="包装类型"
                    placeholder="选择包装类型"
                    selectedKeys={
                      filters.packageType ? [filters.packageType] : []
                    }
                    onSelectionChange={keys => {
                      const value = Array.from(keys)[0] as string
                      handleInputChange("packageType", value || "")
                    }}
                    size="sm"
                  >
                    {options.packageTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </Select>
                </div>

                <Divider />

                {/* 规格范围 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-default-700">
                    规格范围
                  </h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Input
                        label="周长最小值"
                        placeholder="例: 20"
                        value={filters.circumferenceMin?.toString() || ""}
                        onChange={e =>
                          handleInputChange("circumferenceMin", e.target.value)
                        }
                        size="sm"
                        type="number"
                        endContent={
                          <span className="text-xs text-default-400">mm</span>
                        }
                      />
                      <span className="text-default-400">-</span>
                      <Input
                        label="周长最大值"
                        placeholder="例: 25"
                        value={filters.circumferenceMax?.toString() || ""}
                        onChange={e =>
                          handleInputChange("circumferenceMax", e.target.value)
                        }
                        size="sm"
                        type="number"
                        endContent={
                          <span className="text-xs text-default-400">mm</span>
                        }
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        label="包装数量最小值"
                        placeholder="例: 200"
                        value={filters.packageQuantityMin?.toString() || ""}
                        onChange={e =>
                          handleInputChange(
                            "packageQuantityMin",
                            e.target.value
                          )
                        }
                        size="sm"
                        type="number"
                        endContent={
                          <span className="text-xs text-default-400">支</span>
                        }
                      />
                      <span className="text-default-400">-</span>
                      <Input
                        label="包装数量最大值"
                        placeholder="例: 400"
                        value={filters.packageQuantityMax?.toString() || ""}
                        onChange={e =>
                          handleInputChange(
                            "packageQuantityMax",
                            e.target.value
                          )
                        }
                        size="sm"
                        type="number"
                        endContent={
                          <span className="text-xs text-default-400">支</span>
                        }
                      />
                    </div>
                  </div>
                </div>

                <Divider />

                {/* 化学含量 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-default-700">
                    化学含量
                  </h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Input
                        label="焦油含量最小值"
                        placeholder="例: 8"
                        value={filters.tarContentMin?.toString() || ""}
                        onChange={e =>
                          handleInputChange("tarContentMin", e.target.value)
                        }
                        size="sm"
                        type="number"
                        endContent={
                          <span className="text-xs text-default-400">mg</span>
                        }
                      />
                      <span className="text-default-400">-</span>
                      <Input
                        label="焦油含量最大值"
                        placeholder="例: 12"
                        value={filters.tarContentMax?.toString() || ""}
                        onChange={e =>
                          handleInputChange("tarContentMax", e.target.value)
                        }
                        size="sm"
                        type="number"
                        endContent={
                          <span className="text-xs text-default-400">mg</span>
                        }
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        label="烟碱含量最小值"
                        placeholder="例: 0.8"
                        value={filters.nicotineContentMin?.toString() || ""}
                        onChange={e =>
                          handleInputChange(
                            "nicotineContentMin",
                            e.target.value
                          )
                        }
                        size="sm"
                        type="number"
                        step="0.1"
                        endContent={
                          <span className="text-xs text-default-400">mg</span>
                        }
                      />
                      <span className="text-default-400">-</span>
                      <Input
                        label="烟碱含量最大值"
                        placeholder="例: 1.2"
                        value={filters.nicotineContentMax?.toString() || ""}
                        onChange={e =>
                          handleInputChange(
                            "nicotineContentMax",
                            e.target.value
                          )
                        }
                        size="sm"
                        type="number"
                        step="0.1"
                        endContent={
                          <span className="text-xs text-default-400">mg</span>
                        }
                      />
                    </div>
                  </div>
                </div>

                <Divider />

                {/* 价格和其他 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-default-700">
                    价格范围
                  </h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <div className="flex items-center gap-2">
                      <Input
                        label="零售价格最小值"
                        placeholder="例: 100"
                        value={filters.retailPriceMin?.toString() || ""}
                        onChange={e =>
                          handleInputChange("retailPriceMin", e.target.value)
                        }
                        size="sm"
                        type="number"
                        endContent={
                          <span className="text-xs text-default-400">元</span>
                        }
                      />
                      <span className="text-default-400">-</span>
                      <Input
                        label="零售价格最大值"
                        placeholder="例: 1000"
                        value={filters.retailPriceMax?.toString() || ""}
                        onChange={e =>
                          handleInputChange("retailPriceMax", e.target.value)
                        }
                        size="sm"
                        type="number"
                        endContent={
                          <span className="text-xs text-default-400">元</span>
                        }
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        label="批发价格最小值"
                        placeholder="例: 150"
                        value={filters.wholesalePriceMin?.toString() || ""}
                        onChange={e =>
                          handleInputChange("wholesalePriceMin", e.target.value)
                        }
                        size="sm"
                        type="number"
                        endContent={
                          <span className="text-xs text-default-400">元</span>
                        }
                      />
                      <span className="text-default-400">-</span>
                      <Input
                        label="批发价格最大值"
                        placeholder="例: 800"
                        value={filters.wholesalePriceMax?.toString() || ""}
                        onChange={e =>
                          handleInputChange("wholesalePriceMax", e.target.value)
                        }
                        size="sm"
                        type="number"
                        endContent={
                          <span className="text-xs text-default-400">元</span>
                        }
                      />
                    </div>
                  </div>
                </div>

                <Divider />

                {/* 其他属性 */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-default-700">
                    其他属性
                  </h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <Select
                      label="颜色"
                      placeholder="选择颜色"
                      selectedKeys={filters.color ? [filters.color] : []}
                      onSelectionChange={keys => {
                        const value = Array.from(keys)[0] as string
                        handleInputChange("color", value || "")
                      }}
                      size="sm"
                    >
                      {options.colors.map(color => (
                        <SelectItem key={color} value={color}>
                          {color}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                </div>
              </div>
            </AccordionItem>
          </Accordion>
        )}
      </CardBody>
    </Card>
  )
}
