/**
 * 用户使用指南
 */

export const USER_GUIDE = {
  title: "智能商品匹配系统 - 使用指南",

  overview: {
    title: "系统概述",
    description:
      "智能商品匹配系统帮助您高效管理商品数据，支持批量上传、智能匹配和价格管理。",
  },

  quickStart: {
    title: "快速开始",
    steps: [
      {
        title: "1. 准备商品数据",
        description: "准备包含商品信息的Excel或CSV文件",
        details: [
          "支持文件格式：.xlsx, .xls, .csv",
          "文件大小限制：最大10MB",
          "建议使用提供的模板格式",
        ],
      },
      {
        title: "2. 上传商品数据",
        description: "通过商品管理页面上传您的商品文件",
        details: [
          "点击商品管理 → 导入按钮",
          "选择或拖拽文件到上传区域",
          "系统会自动验证和导入数据",
        ],
      },
      {
        title: "3. 查看导入结果",
        description: "检查导入的商品数据和统计信息",
        details: [
          "在仪表盘查看总体统计",
          "在商品管理页面查看详细列表",
          "处理任何导入错误或重复项",
        ],
      },
    ],
  },

  fileFormat: {
    title: "文件格式说明",
    description: "为了确保数据正确导入，请按照以下格式准备您的数据文件：",

    requiredColumns: {
      title: "必填列",
      columns: [
        {
          name: "商品名",
          english: "name",
          description: "商品的完整名称",
          example: "红旗香(硬新版河)",
        },
        {
          name: "品牌",
          english: "brand",
          description: "商品品牌",
          example: "红旗香",
        },
      ],
    },

    optionalColumns: {
      title: "可选列",
      columns: [
        {
          name: "盒码",
          english: "barcode",
          description: "商品盒码（主要条码）",
          example: "6901028161947",
        },
        {
          name: "条码",
          english: "secondaryBarcode",
          description: "商品条码（次要条码）",
          example: "6901028161954",
        },
        {
          name: "公司价",
          english: "price",
          description: "公司价格（数字）",
          example: "44.50",
        },
        {
          name: "关键词",
          english: "keywords",
          description: "搜索关键词",
          example: "硬新版河",
        },
        {
          name: "分类",
          english: "category",
          description: "商品分类",
          example: "香烟",
        },
        {
          name: "批发价",
          english: "wholesalePrice",
          description: "批发价格（数字）",
          example: "42.00",
        },
        {
          name: "库存",
          english: "stock",
          description: "库存数量",
          example: "100",
        },
        {
          name: "描述",
          english: "description",
          description: "商品描述",
          example: "硬盒装香烟",
        },
        {
          name: "单位",
          english: "unit",
          description: "计量单位",
          example: "盒",
        },
      ],
    },

    tips: [
      "第一行必须是列标题",
      "支持中文和英文列名",
      "价格字段必须是数字格式",
      "关键词可以用逗号分隔多个",
      "空白单元格会被忽略",
    ],
  },

  features: {
    title: "主要功能",
    list: [
      {
        title: "商品管理",
        description: "批量导入、查看、编辑和删除商品信息",
        icon: "Package",
      },
      {
        title: "智能匹配",
        description: "自动匹配相似商品，提高数据质量",
        icon: "RefreshCw",
      },
      {
        title: "价格管理",
        description: "监控价格变动，管理零售价和批发价",
        icon: "TrendingUp",
      },
      {
        title: "审核中心",
        description: "审核匹配结果，确保数据准确性",
        icon: "ClipboardCheck",
      },
      {
        title: "数据报表",
        description: "查看统计信息和业务分析报告",
        icon: "BarChart3",
      },
    ],
  },

  troubleshooting: {
    title: "常见问题",
    items: [
      {
        question: "上传文件失败怎么办？",
        answer:
          "请检查文件格式是否正确，文件大小是否超过10MB，以及网络连接是否正常。",
      },
      {
        question: "为什么有些商品导入失败？",
        answer:
          "常见原因：缺少必填字段（商品名称、品牌），价格格式不正确，或者商品已存在。",
      },
      {
        question: "如何处理重复商品？",
        answer:
          "系统会自动检测重复商品（基于名称+品牌），重复项不会被导入。您可以修改数据后重新上传。",
      },
      {
        question: "支持的文件大小限制是多少？",
        answer: "单个文件最大支持10MB，建议将大文件分批上传。",
      },
    ],
  },

  contact: {
    title: "技术支持",
    description: "如果您在使用过程中遇到问题，请联系技术支持团队：",
    email: "support@smartmatch.com",
    phone: "400-123-4567",
  },
}

export default USER_GUIDE
