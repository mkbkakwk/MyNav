# AI_CONTEXT.md — MyNav 项目操作手册

> 本文件由代码库侦察自动生成,供 AI 代理与开发者快速上手。最后更新:2026-06。

## 1. 一句话总结

MyNav 是一个**纯前端、零后端**的个人导航页:高颜值玻璃拟态 UI + 拖拽管理站点分类,并在网页上直接增删改后,把数据同步回**本地源码**(`src/constants.ts`,dev 模式)或**私有 GitHub 仓库**(`nav-data.json`,线上模式),实现"代码公开、数据隐私"的双栖同步。

## 2. 技术栈速查表

| 类别 | 选型 |
|---|---|
| 框架 | React 19 (Hooks, 函数组件) + TypeScript 5.9 |
| 构建 | Vite 7(`base: '/MyNav/'`,GitHub Pages 子路径) |
| 包管理 | pnpm(`pnpm-workspace.yaml` 存在,单包) |
| 样式 | TailwindCSS 4(`@tailwindcss/vite` 插件,`src/index.css`) |
| 图标 | lucide-react + Emoji |
| 拖拽 | @dnd-kit(core / sortable / utilities) |
| 动画 | framer-motion |
| 状态存储 | `localStorage`(运行时) + `src/constants.ts`(源码) + GitHub REST API(云) |
| 部署 | GitHub Actions → GitHub Pages(`.github/workflows/deploy.yml`,push 到 main 触发) |
| 代码规范 | ESLint 9 flat config(react-hooks + react-refresh + typescript-eslint);**无 Prettier、无测试框架** |

## 3. 目录结构与架构图

```
src/
├── main.tsx                 # 入口:createRoot 渲染 <App/>
├── App.tsx        (887行)   # 主页面:分区(Sections)渲染、右键 CRUD 弹窗、跨区拖拽、本地/云保存编排
├── constants.ts   (586行)   # ★ 数据源:导出 SECTIONS / SIDEBAR_ITEMS / SEARCH_CATEGORIES / SEARCH_ENGINES
├── types.ts                # ★ 核心类型:LinkItem / SectionData / SidebarItem / SearchEngine / Category / SyncSettings
├── index.css               # Tailwind 4 入口 + 主题 CSS 变量(light/dark) + 浮动动画
├── components/
│   ├── Header.tsx  (682行) # 顶部:搜索框 + 实时建议(JSONP)、搜索分类/引擎的 CRUD 与拖拽
│   ├── Sidebar.tsx (214行) # 左侧锚点导航
│   ├── Card.tsx    ( 95行) # 站点卡片(右键菜单)
│   ├── Settings.tsx(124行) # GitHub 云同步设置弹窗(存 localStorage)
│   ├── ThemeToggle.tsx     # 明暗切换
│   └── IconPreview.tsx     # Emoji 图标选择器
├── utils/
│   ├── serialization.ts    # ★ 序列化 + 保存编排:本地 Vite 桥 / GitHub API / 远程拉取
│   ├── metadata.ts         # 添加站点时自动抓标题/描述(Microlink API → AllOrigins 兜底,带缓存)
│   ├── favicon.ts          # 多源 favicon URL 生成(Google / FaviconKit / Unavatar)
│   └── scroll.ts
└── hooks/useWindowSize.ts
```

**架构模式**:纯前端 SPA(组件分层)+ "dev-only 后端桥"。无路由库、无状态管理库、无真实后端。

```
浏览器 UI (React 组件)
   │  右键/弹窗/拖拽修改 state
   ▼
App.tsx / Header.tsx state
   │  useEffect 防抖 2s → serializeConstants() 生成 TS 源码字符串
   ▼
utils/serialization.ts  saveToSource()
   ├─ localhost? ──► POST /api/save-constants  (vite.config.ts 中间件,fs 写 src/constants.ts)
   └─ 云同步启用? ─► GET SHA → PUT GitHub API → 私有仓库 nav-data.json (base64, 强制覆盖)
   ▼
启动时反向:localStorage 优先;线上模式 initRemoteData() 从 GitHub 拉取覆盖
```

## 4. 常用命令清单

```bash
pnpm install        # 安装依赖
pnpm dev            # 启动 dev server (http://localhost:5173)
pnpm build          # tsc -b && vite build → dist/
pnpm lint           # ESLint 全量检查
pnpm preview        # 本地预览构建产物
```

- **没有测试套件**(package.json 无 test 脚本),改动验证靠 `pnpm lint` + `pnpm build` + 浏览器手动验证。
- 本地环境变量:无 `.env` 需求;所有配置(GitHub token 等)存于浏览器 `localStorage`。

## 5. 绝对禁区

1. **`constants.ts` 会被整体覆写**:UI 上的任何修改(本地模式)都会经 `serializeConstants()` 把整个文件**原样覆盖**。手改 `constants.ts` 是合法的初始化手段,但下一次网页保存即被冲掉;若修改 `serializeConstants()` 生成器,必须保证输出仍是合法 TS 且保留导出名 `SECTIONS` / `SIDEBAR_ITEMS` / `SEARCH_CATEGORIES` / `SEARCH_ENGINES`(Header.tsx 依赖 `SEARCH_CATEGORIES['常用']`)。
2. **GitHub Token 是明文敏感数据**:存于 `localStorage`(`nav_sync_settings`),会随 `fetch` 的 Authorization 头发往 api.github.com。**禁止**把真实 token 写入代码、日志、commit message 或任何仓库文件。
3. **`/api/save-constants` 仅 dev 有效**:它是 `vite.config.ts` 里的中间件,生产构建不存在。线上保存必须走 GitHub 云同步,`saveToSource` 用 `location.hostname` 判断分支,不要移除该判断。
4. **改类型必须联动三处**:`types.ts`(定义) ↔ `utils/serialization.ts`(序列化) ↔ `constants.ts`(模板数据)。三者不一致会静默丢数据(例如 localStorage 旧结构合并逻辑在 App.tsx:75-100)。
5. **`base: '/MyNav/'` 勿随意改**:GitHub Pages 子路径部署依赖它;改了会 404。
6. **localStorage key 前缀约定 `nav_`**:`nav_sections_v1` / `nav_search_categories_v2` / `nav_sync_settings`。Header 与 App 通过自定义事件 `nav_search_updated`、`nav_search_remote_synced` 通信,改存储结构要同步改事件广播。
7. **拖拽逻辑分散且脆弱**:分区块排序只在 `handleDragEnd` 做、卡片跨区在 `handleDragOver`(App.tsx:268-390),两处硬编码交互规则,改动前先读完整两函数。
8. **无版本兼容测试**:`App.tsx:63-100` 有一段 localStorage 旧数据与 constants.ts 合并的"考古"逻辑(含 '纳诺 AI'→'秘塔 AI' 这类一次性迁移),不要随手删除,除非确认无老用户数据。
9. **云上传受 `syncAuthorized` 门闩保护**:任何修改 UI 后自动 PUT GitHub 的路径都必须经过授权(`App.tsx` 两处保存点守卫)。新增保存/同步代码路径时,禁止绕过门闩直接调 `saveToSource` 的云分支——否则会重现"首次配置覆盖远程数据"的 bug。本地模式(写 constants.ts)不受门闩影响。

## 6. 如何开始修改代码(路径模板)

> 注意:本项目**没有传统后端 API**。"增加接口"= 改 React 组件逻辑,或(仅 dev 生效)扩展 vite.config.ts 中间件。

| 需求 | 要改的文件 |
|---|---|
| 增加一个站点/分类字段(如标签 tag) | `src/types.ts` → `src/utils/serialization.ts` → `src/constants.ts` → 编辑弹窗在 `src/App.tsx`(卡片)/ `src/components/Header.tsx`(分类/引擎) |
| 增加"增删改查"入口(按钮/右键菜单) | `src/App.tsx`(`onRightClick`、弹窗 JSX)或 `src/components/Header.tsx` |
| 增加一个 dev-only 后端接口(如 `/api/export`) | `vite.config.ts` 的 `sourceSyncPlugin` 中间件 + `src/utils/` 新增调用函数 |
| 修改搜索建议来源 | `src/components/Header.tsx` 的 `fetchSuggestions`(baidu/google/bing/360 JSONP) |
| 修改保存/同步策略 | `src/utils/serialization.ts` 的 `saveToSource` / `fetchRemoteData` |
| 修改样式/主题 | `src/index.css`(CSS 变量)+ 组件内 Tailwind 类(`dark:` 前缀) |
| 修改部署流程 | `.github/workflows/deploy.yml` |

## 7. 关键实现细节备忘

- **云同步授权门闩(重要)**:`syncAuthorized` state 是云上传的唯一放行条件。授权时机:① 挂载时远程拉取成功或 404(老用户无感);② 设置弹窗首次开启同步时用户显式选择"立即拉取"或"保留本地数据";③ 常驻按钮"从 GitHub 拉取数据"成功。**拉取失败(网络/401)绝不授权**,防止本地数据静默覆盖远程。
- **`fetchRemoteData` 三态返回**(`RemoteDataResult`):`ok+data`(拉取成功,远程为准)/ `ok+notFound`(404,确认远程为空,可播种)/ `ok=false+error`(失败,禁止上传)。改同步逻辑时不得把 404 与失败混淆。
- 云同步 commit message 固定为 `update(nav): robust cloud sync update`,每次 PUT 前强制重新 GET SHA 防止 409。
- **搜索建议**用 JSONP(动态 script 标签,Header.tsx 内有 `fetchJsonp`),生产环境需各引擎 CORS 兼容;360 与 bing 共用 `sug.so.360.cn`。
- **元数据抓取**:`api.microlink.io` 为主,`api.allorigins.win` 兜底,内存缓存 `metadataCache`。
- **favicon** 三源回退:Google → FaviconKit → Unavatar。
- 站点编辑弹窗的图标可输入 Emoji 或用 `IconPreview` 选择。
