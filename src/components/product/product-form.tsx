"use client"

import { useState, useEffect } from "react"
import {
  Button,
  Input,
  Select,
  SelectItem,
  Textarea,
  Switch,
  Card,
  CardBody,
  CardHeader,
  Divider,
  Chip,
} from "@nextui-org/react"
import {
  Calendar,
  Package,
  Beaker,
  Palette,
  DollarSign,
  Tag,
} from "lucide-react"

interface Product {
  _id?: string
  templateId?: string
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
  category?: string
  keywords: string[]
  isActive: boolean
}

interface ProductFormProps {
  product?: Product | null
  onSubmit: (data: any) => Promise<void>
  onCancel: () => void
  isLoading?: boolean
  renderButtons?: (handleSubmit: () => void) => React.ReactNode
  exposeSubmit?: (submitFn: () => void) => void
}

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  isLoading,
  renderButtons,
  exposeSubmit,
}: ProductFormProps) {
  // 基本信息
  const [name, setName] = useState("")
  const [brand, setBrand] = useState("")
  const [company, setCompany] = useState("")
  const [category, setCategory] = useState("")

  // 编码信息
  const [productCode, setProductCode] = useState("")
  const [boxCode, setBoxCode] = useState("")

  // 产品规格
  const [productType, setProductType] = useState("")
  const [packageType, setPackageType] = useState("")
  const [circumference, setCircumference] = useState("")
  const [length, setLength] = useState("")
  const [packageQuantity, setPackageQuantity] = useState("")

  // 化学成分
  const [tarContent, setTarContent] = useState("")
  const [nicotineContent, setNicotineContent] = useState("")
  const [carbonMonoxideContent, setCarbonMonoxideContent] = useState("")

  // 外观特性
  const [color, setColor] = useState("")
  const [hasPop, setHasPop] = useState(false)

  // 价格信息
  const [priceCategory, setPriceCategory] = useState("")
  const [retailPrice, setRetailPrice] = useState("")
  const [unit, setUnit] = useState("元/条")
  const [companyPrice, setCompanyPrice] = useState("")

  // 其他信息
  const [launchDate, setLaunchDate] = useState("")
  const [keywords, setKeywords] = useState("")
  const [isActive, setIsActive] = useState(true)

  // 预定义选项
  const productTypes = ["烤烟型", "混合型", "雪茄型", "斗烟型"]
  const packageTypes = ["条盒硬盒", "条盒软盒", "听装", "盒装"]
  const priceCategories = ["一类", "二类", "三类", "四类", "五类"]
  const units = ["元/条", "元/盒", "元/包", "元/支"]

  // 初始化表单数据
  useEffect(() => {
    if (product) {
      setName(product.name || "")
      setBrand(product.brand || "")
      setCompany(product.company || "")
      setCategory(product.category || "")
      setProductCode(product.productCode || "")
      setBoxCode(product.boxCode || "")
      setProductType(product.productType || "")
      setPackageType(product.packageType || "")
      setCircumference(product.specifications?.circumference?.toString() || "")
      setLength(product.specifications?.length || "")
      setPackageQuantity(
        product.specifications?.packageQuantity?.toString() || ""
      )
      setTarContent(product.chemicalContent?.tarContent?.toString() || "")
      setNicotineContent(
        product.chemicalContent?.nicotineContent?.toString() || ""
      )
      setCarbonMonoxideContent(
        product.chemicalContent?.carbonMonoxideContent?.toString() || ""
      )
      setColor(product.appearance?.color || "")
      setHasPop(product.features?.hasPop || false)
      setPriceCategory(product.pricing?.priceCategory || "")
      setRetailPrice(product.pricing?.retailPrice?.toString() || "")
      setUnit(product.pricing?.unit || "元/条")
      setCompanyPrice(product.pricing?.companyPrice?.toString() || "")
      setLaunchDate(product.launchDate ? product.launchDate.split("T")[0] : "")
      setKeywords(product.keywords?.join(", ") || "")
      setIsActive(product.isActive ?? true)
    }
  }, [product])

  const handleSubmit = async () => {
    // 构建提交数据
    const formData = {
      templateId: "68b034fc48d57c1f8b494cc5", // 临时使用固定模板ID，实际应该从context获取
      name: name.trim(),
      brand: brand.trim(),
      company: company.trim() || undefined,
      category: category.trim() || undefined,
      productCode: productCode.trim() || undefined,
      boxCode: boxCode.trim() || undefined,
      productType: productType || undefined,
      packageType: packageType || undefined,
      specifications: {
        circumference: circumference ? parseFloat(circumference) : undefined,
        length: length.trim() || undefined,
        packageQuantity: packageQuantity
          ? parseInt(packageQuantity)
          : undefined,
      },
      chemicalContent: {
        tarContent: tarContent ? parseFloat(tarContent) : undefined,
        nicotineContent: nicotineContent
          ? parseFloat(nicotineContent)
          : undefined,
        carbonMonoxideContent: carbonMonoxideContent
          ? parseFloat(carbonMonoxideContent)
          : undefined,
      },
      appearance: {
        color: color || undefined,
      },
      features: {
        hasPop: hasPop,
      },
      pricing: {
        priceCategory: priceCategory || undefined,
        retailPrice: retailPrice ? parseFloat(retailPrice) : undefined,
        unit: unit,
        companyPrice: companyPrice ? parseFloat(companyPrice) : undefined,
      },
      launchDate: launchDate || undefined,
      keywords: keywords
        .split(",")
        .map(k => k.trim())
        .filter(k => k),
      isActive,
    }

    // 清理空的嵌套对象
    Object.keys(formData).forEach(key => {
      const keyName = key as keyof typeof formData
      if (
        typeof formData[keyName] === "object" &&
        formData[keyName] !== null &&
        !Array.isArray(formData[keyName])
      ) {
        const nested = formData[keyName] as Record<string, any>
        const hasValues = Object.values(nested).some(v => v !== undefined)
        if (!hasValues) {
          delete (formData as any)[keyName]
        }
      }
    })

    await onSubmit(formData)
  }

  // 暴露提交函数给父组件
  useEffect(() => {
    if (exposeSubmit) {
      exposeSubmit(handleSubmit)
    }
  }, [exposeSubmit, handleSubmit])

  return (
    <div className="space-y-6">
      {/* 基本信息 */}
      <Card>
        <CardHeader className="flex gap-3">
          <Tag className="h-5 w-5 text-primary" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">基本信息</p>
            <p className="text-sm text-default-500">商品的基础信息</p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="商品名称"
              placeholder="请输入商品名称"
              value={name}
              onValueChange={setName}
              isRequired
              variant="bordered"
            />
            <Input
              label="品牌"
              placeholder="请输入品牌"
              value={brand}
              onValueChange={setBrand}
              isRequired
              variant="bordered"
            />
            <Input
              label="所属企业"
              placeholder="请输入所属企业"
              value={company}
              onValueChange={setCompany}
              variant="bordered"
            />
            <Input
              label="分类"
              placeholder="请输入商品分类"
              value={category}
              onValueChange={setCategory}
              variant="bordered"
            />
          </div>
        </CardBody>
      </Card>

      {/* 编码信息 */}
      <Card>
        <CardHeader className="flex gap-3">
          <Package className="h-5 w-5 text-secondary" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">编码信息</p>
            <p className="text-sm text-default-500">产品的唯一标识码</p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="产品编码"
              placeholder="请输入产品编码"
              value={productCode}
              onValueChange={setProductCode}
              variant="bordered"
            />
            <Input
              label="盒码编码"
              placeholder="请输入盒码编码"
              value={boxCode}
              onValueChange={setBoxCode}
              variant="bordered"
            />
          </div>
        </CardBody>
      </Card>

      {/* 产品规格 */}
      <Card>
        <CardHeader className="flex gap-3">
          <Package className="h-5 w-5 text-warning" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">产品规格</p>
            <p className="text-sm text-default-500">产品的物理规格参数</p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Select
              label="产品类型"
              placeholder="选择产品类型"
              selectedKeys={productType ? [productType] : []}
              onSelectionChange={keys =>
                setProductType(Array.from(keys)[0] as string)
              }
              variant="bordered"
            >
              {productTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </Select>
            <Select
              label="包装类型"
              placeholder="选择包装类型"
              selectedKeys={packageType ? [packageType] : []}
              onSelectionChange={keys =>
                setPackageType(Array.from(keys)[0] as string)
              }
              variant="bordered"
            >
              {packageTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {type}
                </SelectItem>
              ))}
            </Select>
            <Input
              label="烟支周长(mm)"
              placeholder="如: 24.20"
              value={circumference}
              onValueChange={setCircumference}
              type="number"
              step="0.01"
              variant="bordered"
            />
            <Input
              label="烟支长度"
              placeholder="如: 84.0(30+54) mm"
              value={length}
              onValueChange={setLength}
              variant="bordered"
            />
            <Input
              label="包装数量"
              placeholder="如: 200"
              value={packageQuantity}
              onValueChange={setPackageQuantity}
              type="number"
              variant="bordered"
            />
          </div>
        </CardBody>
      </Card>

      {/* 化学成分 */}
      <Card>
        <CardHeader className="flex gap-3">
          <Beaker className="h-5 w-5 text-danger" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">化学成分</p>
            <p className="text-sm text-default-500">产品的化学成分含量</p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Input
              label="焦油含量(mg)"
              placeholder="如: 10"
              value={tarContent}
              onValueChange={setTarContent}
              type="number"
              step="0.1"
              variant="bordered"
            />
            <Input
              label="烟气烟碱量(mg)"
              placeholder="如: 1.0"
              value={nicotineContent}
              onValueChange={setNicotineContent}
              type="number"
              step="0.1"
              variant="bordered"
            />
            <Input
              label="烟气一氧化碳量(mg)"
              placeholder="如: 11"
              value={carbonMonoxideContent}
              onValueChange={setCarbonMonoxideContent}
              type="number"
              step="0.1"
              variant="bordered"
            />
          </div>
        </CardBody>
      </Card>

      {/* 外观特性 */}
      <Card>
        <CardHeader className="flex gap-3">
          <Palette className="h-5 w-5 text-success" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">外观特性</p>
            <p className="text-sm text-default-500">产品的外观和特殊功能</p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="颜色"
              placeholder="请输入颜色，如：红、蓝、金色等"
              value={color}
              onValueChange={setColor}
              variant="bordered"
            />
            <div className="flex items-center gap-3">
              <Switch
                isSelected={hasPop}
                onValueChange={setHasPop}
                color="warning"
              />
              <span className="text-sm">是否爆珠</span>
              {hasPop && (
                <Chip size="sm" color="warning" variant="flat">
                  爆珠
                </Chip>
              )}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* 价格信息 */}
      <Card>
        <CardHeader className="flex gap-3">
          <DollarSign className="h-5 w-5 text-success" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">价格信息</p>
            <p className="text-sm text-default-500">产品的价格相关信息</p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Input
              label="公司价 (重要)"
              placeholder="如: 380"
              value={companyPrice}
              onValueChange={setCompanyPrice}
              type="number"
              step="0.01"
              variant="bordered"
              startContent={<span className="text-default-400">¥</span>}
              isRequired
              description="用于匹配算法价格比较的重要价格"
              color="primary"
            />
            <Input
              label="零售价"
              placeholder="如: 450"
              value={retailPrice}
              onValueChange={setRetailPrice}
              type="number"
              step="0.01"
              variant="bordered"
              startContent={<span className="text-default-400">¥</span>}
              description="市场零售价格，仅用于展示"
            />
            <Select
              label="价格类型"
              placeholder="选择价格类型"
              selectedKeys={priceCategory ? [priceCategory] : []}
              onSelectionChange={keys =>
                setPriceCategory(Array.from(keys)[0] as string)
              }
              variant="bordered"
            >
              {priceCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </Select>
            <Select
              label="单位"
              placeholder="选择单位"
              selectedKeys={[unit]}
              onSelectionChange={keys => setUnit(Array.from(keys)[0] as string)}
              variant="bordered"
            >
              {units.map(unitOption => (
                <SelectItem key={unitOption} value={unitOption}>
                  {unitOption}
                </SelectItem>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>

      {/* 其他信息 */}
      <Card>
        <CardHeader className="flex gap-3">
          <Calendar className="h-5 w-5 text-primary" />
          <div className="flex flex-col">
            <p className="text-md font-semibold">其他信息</p>
            <p className="text-sm text-default-500">
              上市时间、关键词等附加信息
            </p>
          </div>
        </CardHeader>
        <CardBody>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="上市时间"
              type="date"
              value={launchDate}
              onValueChange={setLaunchDate}
              variant="bordered"
            />
            <div className="flex items-center gap-3">
              <Switch
                isSelected={isActive}
                onValueChange={setIsActive}
                color="success"
              />
              <span className="text-sm">启用商品</span>
              <Chip
                size="sm"
                color={isActive ? "success" : "default"}
                variant="flat"
              >
                {isActive ? "启用" : "禁用"}
              </Chip>
            </div>
          </div>
          <div className="mt-4">
            <Textarea
              label="关键词"
              placeholder="多个关键词用逗号分隔，如: 中华,硬盒,烤烟"
              value={keywords}
              onValueChange={setKeywords}
              variant="bordered"
              minRows={2}
            />
          </div>
        </CardBody>
      </Card>

      {/* 操作按钮 - 如果有自定义渲染函数则使用，否则显示默认按钮 */}
      {renderButtons ? (
        renderButtons(handleSubmit)
      ) : (
        <div className="flex justify-end gap-2">
          <Button variant="light" onPress={onCancel}>
            取消
          </Button>
          <Button color="primary" onPress={handleSubmit} isLoading={isLoading}>
            {product ? "更新" : "创建"}
          </Button>
        </div>
      )}
    </div>
  )
}
