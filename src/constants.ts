import type { SectionData, SidebarItem, SearchEngine } from './types';

export const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    "id": "fav",
    "title": "常用站点",
    "icon": "⭐",
    "href": "#fav"
  },
  {
    "id": "digital",
    "title": "数字素养",
    "icon": "🎓",
    "href": "#digital"
  },
  {
    "id": "office",
    "title": "高效办公",
    "icon": "⚡",
    "href": "#office"
  },
  {
    "id": "ai",
    "title": "AI 智能",
    "icon": "🧠",
    "href": "#ai"
  },
  {
    "id": "pdf",
    "title": "PDF 工具",
    "icon": "📄",
    "href": "#pdf"
  },
  {
    "id": "tools",
    "title": "在线工具",
    "icon": "🛠️",
    "href": "#tools"
  },
  {
    "id": "image",
    "title": "图像处理",
    "icon": "🖼️",
    "href": "#image"
  },
  {
    "id": "media",
    "title": "新媒体运营",
    "icon": "📢",
    "href": "#media"
  },
  {
    "id": "video",
    "title": "视频创作",
    "icon": "🎬",
    "href": "#video"
  },
  {
    "id": "design",
    "title": "设计资源",
    "icon": "🎨",
    "href": "#design"
  }
];

export const SEARCH_CATEGORIES: Record<string, SearchEngine[]> = {
  "常用": [
    {
      "name": "谷歌",
      "color": "bg-red-500",
      "url": "https://www.google.com/search?q={q}",
      "suggestionSource": "google"
    },
    {
      "name": "Yandex",
      "url": "https://ya.ru/search?text={q}",
      "color": "bg-indigo-600",
      "suggestionSource": "none"
    },
    {
      "name": "百度",
      "color": "bg-blue-500",
      "url": "https://www.baidu.com/s?wd={q}",
      "suggestionSource": "baidu"
    },
    {
      "name": "必应",
      "color": "bg-teal-500",
      "url": "https://www.bing.com/search?q={q}",
      "suggestionSource": "bing"
    },
    {
      "name": "GitHub",
      "color": "bg-slate-800",
      "url": "https://github.com/search?q={q}",
      "suggestionSource": "none"
    }
  ],
  "学术": [
    {
      "name": "谷歌学术",
      "color": "bg-indigo-600",
      "url": "https://scholar.google.com/scholar?q={q}",
      "suggestionSource": "google"
    },
    {
      "name": "百度学术",
      "color": "bg-blue-600",
      "url": "https://xueshu.baidu.com/s?wd={q}",
      "suggestionSource": "baidu"
    },
    {
      "name": "Semantic",
      "color": "bg-emerald-600",
      "url": "https://www.semanticscholar.org/search?q={q}",
      "suggestionSource": "google"
    },
    {
      "name": "AMiner",
      "color": "bg-purple-600",
      "url": "https://www.aminer.cn/search/pub?q={q}",
      "suggestionSource": "none"
    },
    {
      "name": "DeepSeek",
      "color": "bg-cyan-600",
      "url": "https://www.deepseek.com/search?q={q}",
      "suggestionSource": "none"
    }
  ],
  "文献": [
    {
      "name": "知网",
      "color": "bg-blue-700",
      "url": "https://scholar.cnki.net/result?q={q}",
      "suggestionSource": "baidu"
    },
    {
      "name": "万方",
      "color": "bg-orange-600",
      "url": "https://s.wanfangdata.com.cn/paper?q={q}",
      "suggestionSource": "baidu"
    },
    {
      "name": "维普",
      "color": "bg-red-600",
      "url": "http://qikan.cqvip.com/Qikan/Search/Index?key={q}",
      "suggestionSource": "baidu"
    },
    {
      "name": "PubMed",
      "color": "bg-sky-600",
      "url": "https://pubmed.ncbi.nlm.nih.gov/?term={q}",
      "suggestionSource": "google"
    }
  ],
  "文档": [
    {
      "name": "百度文库",
      "color": "bg-blue-500",
      "url": "https://wenku.baidu.com/search?word={q}",
      "suggestionSource": "baidu"
    },
    {
      "name": "道客巴巴",
      "color": "bg-green-600",
      "url": "https://www.doc88.com/tag/{q}",
      "suggestionSource": "baidu"
    },
    {
      "name": "豆丁",
      "color": "bg-indigo-500",
      "url": "https://www.docin.com/search.do?nkey={q}",
      "suggestionSource": "baidu"
    }
  ],
  "生活": [
    {
      "name": "哔哩哔哩",
      "color": "bg-pink-500",
      "url": "https://search.bilibili.com/all?keyword={q}",
      "suggestionSource": "baidu"
    },
    {
      "name": "知乎",
      "color": "bg-blue-500",
      "url": "https://www.zhihu.com/search?type=content&q={q}",
      "suggestionSource": "baidu"
    },
    {
      "name": "豆瓣",
      "color": "bg-green-600",
      "url": "https://www.douban.com/search?q={q}",
      "suggestionSource": "baidu"
    },
    {
      "name": "微博",
      "color": "bg-red-500",
      "url": "https://s.weibo.com/weibo?q={q}",
      "suggestionSource": "baidu"
    },
    {
      "name": "小红书",
      "color": "bg-red-400",
      "url": "https://www.xiaohongshu.com/search_result?keyword={q}",
      "suggestionSource": "none"
    }
  ]
};

// Flatten for backwards compatibility if needed
export const SEARCH_ENGINES: SearchEngine[] = SEARCH_CATEGORIES['常用'] || [];

export const SECTIONS: SectionData[] = [
  {
    "id": "fav",
    "title": "常用站点",
    "icon": "⭐",
    "items": [
      {
        "id": "1",
        "title": "数据搜索",
        "description": "虫部落聚合搜索，网罗全网资源",
        "icon": "🔍",
        "url": "https://search.chongbuluo.com/"
      },
      {
        "id": "7",
        "title": "财经新闻",
        "description": "最新市场动态",
        "icon": "💰",
        "url": "https://wallstreetcn.com/"
      },
      {
        "id": "2",
        "title": "豆包 AI",
        "description": "写作、摘要、数据",
        "icon": "🤖",
        "url": "https://www.doubao.com/"
      },
      {
        "id": "3",
        "title": "秘塔 AI",
        "description": "AI 资源搜索",
        "icon": "🧠",
        "url": "https://metaso.cn/"
      },
      {
        "id": "4",
        "title": "深度求索",
        "description": "深度 AI 办公工具",
        "icon": "🐳",
        "url": "https://www.deepseek.com/"
      },
      {
        "id": "5",
        "title": "Windows 装机",
        "description": "生产力工具",
        "icon": "🪟",
        "url": "https://hellowindows.cn/"
      },
      {
        "id": "6",
        "title": "实习指南",
        "description": "职场技巧与窍门",
        "icon": "🎓",
        "url": "https://www.nowcoder.com/"
      },
      {
        "id": "8",
        "title": "LPR 查询",
        "description": "贷款市场报价利率",
        "icon": "📊",
        "url": "https://www.lkdf.xyz/"
      }
    ]
  },
  {
    "id": "digital",
    "title": "数字素养",
    "icon": "🎓",
    "items": [
      {
        "id": "d1",
        "title": "全民数字素养",
        "description": "提升数字技能提升数字技能提升数字技能提升数字技能提升数字技能",
        "icon": "📱",
        "url": "http://chinadata.cn/"
      },
      {
        "id": "d2",
        "title": "网络安全",
        "description": "安全意识与防护",
        "icon": "🛡️",
        "url": "https://www.freebuf.com/"
      },
      {
        "id": "d3",
        "title": "数据分析",
        "description": "数据驱动决策",
        "icon": "📈",
        "url": "https://docs.pingcap.com/zh/tidb/stable"
      },
      {
        "id": "d4",
        "title": "编程入门",
        "description": "基础编程知识",
        "icon": "💻",
        "url": "https://www.freecodecamp.org/chinese/"
      }
    ]
  },
  {
    "id": "office",
    "title": "高效办公",
    "icon": "⚡",
    "items": [
      {
        "id": "9",
        "title": "我来",
        "description": "多合一工作空间",
        "icon": "🧊",
        "url": "https://www.wolai.com/"
      },
      {
        "id": "10",
        "title": "浮墨笔记",
        "description": "随时记录想法",
        "icon": "✒️",
        "url": "https://flomoapp.com/"
      },
      {
        "id": "11",
        "title": "看板工具",
        "description": "可视化项目管理",
        "icon": "📋",
        "url": "https://trello.com/"
      },
      {
        "id": "12",
        "title": "息流",
        "description": "新一代生产力工具",
        "icon": "🌊",
        "url": "https://flowus.cn/"
      },
      {
        "id": "13",
        "title": "OneNote",
        "description": "微软笔记应用",
        "icon": "📒",
        "url": "https://www.onenote.com/"
      }
    ]
  },
  {
    "id": "ai",
    "title": "AI 智能",
    "icon": "🧠",
    "items": [
      {
        "id": "14",
        "title": "WPS AI",
        "description": "智能文档助手",
        "icon": "📝",
        "url": "https://ai.wps.cn/"
      },
      {
        "id": "15",
        "title": "万知",
        "description": "阅读与创作 AI",
        "icon": "📚",
        "url": "https://www.wanzhi.com/"
      },
      {
        "id": "16",
        "title": "通义千问",
        "description": "学习助手",
        "icon": "🗣️",
        "url": "https://tongyi.aliyun.com/"
      },
      {
        "id": "17",
        "title": "百度文库 AI",
        "description": "智能文库助手",
        "icon": "🏫",
        "url": "https://wenku.baidu.com/ai/"
      },
      {
        "id": "18",
        "title": "橙篇",
        "description": "整理与深度编辑",
        "icon": "📑",
        "url": "https://cp.baidu.com/"
      },
      {
        "id": "19",
        "title": "度加创作",
        "description": "百度 AIGC 平台",
        "icon": "🎨",
        "url": "https://aigc.baidu.com/"
      }
    ]
  },
  {
    "id": "pdf",
    "title": "PDF 工具",
    "icon": "📄",
    "items": [
      {
        "id": "p1",
        "title": "iLovePDF",
        "description": "PDF处理全家桶",
        "icon": "❤️",
        "url": "https://www.ilovepdf.com/zh-cn"
      },
      {
        "id": "p2",
        "title": "Smallpdf",
        "description": "轻松转换PDF",
        "icon": "🔄",
        "url": "https://smallpdf.com/zh-cn"
      },
      {
        "id": "p3",
        "title": "PDF 补丁丁",
        "description": "专业PDF修改",
        "icon": "🛠️",
        "url": "https://github.com/wmjordan/PDFPatcher"
      }
    ]
  },
  {
    "id": "tools",
    "title": "在线工具",
    "icon": "🛠️",
    "items": [
      {
        "id": "t1",
        "title": "Convertio",
        "description": "文件格式转换",
        "icon": "🔄",
        "url": "https://convertio.co/zh/"
      },
      {
        "id": "t2",
        "title": "ProcessOn",
        "description": "在线作图工具",
        "icon": "📊",
        "url": "https://www.processon.com/"
      },
      {
        "id": "t3",
        "title": "TinyPNG",
        "description": "图片压缩神器",
        "icon": "🐼",
        "url": "https://tinypng.com/"
      },
      {
        "id": "t4",
        "title": "草料二维码",
        "description": "二维码生成器",
        "icon": "🔳",
        "url": "https://cli.im/"
      }
    ]
  },
  {
    "id": "image",
    "title": "图像处理",
    "icon": "🖼️",
    "items": [
      {
        "id": "i1",
        "title": "Photopea",
        "description": "在线PS",
        "icon": "🎨",
        "url": "https://www.photopea.com/"
      },
      {
        "id": "i2",
        "title": "Remove.bg",
        "description": "智能抠图",
        "icon": "✂️",
        "url": "https://www.remove.bg/zh"
      },
      {
        "id": "i3",
        "title": "Waifu2x",
        "description": "图片无损放大",
        "icon": "🔍",
        "url": "https://waifu2x.udp.jp/"
      }
    ]
  },
  {
    "id": "media",
    "title": "新媒体运营",
    "icon": "📢",
    "items": [
      {
        "id": "m1",
        "title": "新榜",
        "description": "内容产业服务",
        "icon": "📊",
        "url": "https://www.newrank.cn/"
      },
      {
        "id": "m2",
        "title": "易撰",
        "description": "新媒体写作助手",
        "icon": "✍️",
        "url": "https://www.yizhuan5.com/"
      },
      {
        "id": "m3",
        "title": "壹伴",
        "description": "公众号效率工具",
        "icon": "🧩",
        "url": "https://yiban.io/"
      }
    ]
  },
  {
    "id": "video",
    "title": "视频创作",
    "icon": "🎬",
    "items": [
      {
        "id": "v1",
        "title": "剪映",
        "description": "全能视频剪辑",
        "icon": "✂️",
        "url": "https://www.capcut.cn/"
      },
      {
        "id": "v2",
        "title": "Arctime",
        "description": "自动化字幕软件",
        "icon": "📝",
        "url": "https://arctime.org/"
      },
      {
        "id": "v3",
        "title": "Bilibili",
        "description": "中国领先的视频创作分享社区",
        "icon": "📺",
        "url": "https://www.bilibili.com/"
      }
    ]
  },
  {
    "id": "design",
    "title": "设计资源",
    "icon": "🎨",
    "items": [
      {
        "id": "ds1",
        "title": "Dribbble",
        "description": "设计师灵感社区",
        "icon": "🏀",
        "url": "https://dribbble.com/"
      },
      {
        "id": "ds2",
        "title": "Behance",
        "description": "创意作品展示",
        "icon": "🟦",
        "url": "https://www.behance.net/"
      },
      {
        "id": "ds3",
        "title": "Flower",
        "description": "免费素材下载",
        "icon": "🌸",
        "url": "https://huaban.com/"
      },
      {
        "id": "ds4",
        "title": "Iconfont",
        "description": "矢量图标库",
        "icon": "💎",
        "url": "https://www.iconfont.cn/"
      }
    ]
  }
];
