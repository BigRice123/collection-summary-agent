# 📚 收藏内容总结助手 (Collection Summary Agent)

> 解决「收藏了就不再看了」的问题 — 自动抓取知乎收藏夹内容，通过 AI 生成结构化总结笔记。

## 🎯 解决的问题

大多数人都有这样的经历：在知乎、小红书等平台看到优质内容，点击「收藏」后就不再回看了。收藏夹变成了「数字坟墓」，内容越积越多，却从未被真正消化。

这个项目通过 **MCP (Model Context Protocol) Server** 的形式，自动抓取你的收藏内容，调用 AI 进行总结，生成结构化的笔记，让你真正「消化」收藏的内容。

## ✨ 功能

- **📥 自动抓取** — 获取知乎收藏夹列表及所有收藏内容（支持分页，最多 200 条）
- **🤖 AI 总结** — 调用 DeepSeek / OpenAI API，将收藏内容按主题分类，提炼核心观点
- **📝 导出笔记** — 生成 Markdown 格式的结构化笔记，保存到本地
- **🔌 MCP 集成** — 作为 MCP Server 运行，可与 Cline 等 AI 助手集成

## 🏗️ 项目结构

```
collection-summary-agent/
├── src/
│   ├── index.ts        # MCP Server 主入口（工具注册与处理）
│   ├── zhihu.ts        # 知乎 API 客户端（收藏抓取）
│   ├── summarizer.ts   # AI 总结模块（调用 LLM）
│   └── exporter.ts     # 笔记导出模块
├── scripts/
│   └── get-zhihu-cookie.js  # 获取知乎 Cookie 的辅助脚本
├── build/              # 编译后的 JS 文件
├── package.json
└── tsconfig.json
```

## 🚀 快速开始

### 前置条件

- Node.js >= 18
- 知乎账号（需要 Cookie）
- DeepSeek / OpenAI API Key

### 1. 安装依赖

```bash
cd collection-summary-agent
npm install
```

### 2. 获取知乎 Cookie

1. 在浏览器中登录知乎
2. 打开开发者工具 (F12) → Network 标签
3. 刷新页面，找到任意请求，复制 `Cookie` 请求头
4. 或者运行辅助脚本：
```bash
node scripts/get-zhihu-cookie.js
```

### 3. 配置环境变量

在 MCP 配置文件中注册（如 Cline 的 `cline_mcp_settings.json`）：

```json
{
  "mcpServers": {
    "collection-summary-agent": {
      "command": "node",
      "args": ["/path/to/collection-summary-agent/build/index.js"],
      "env": {
        "ZHIHU_COOKIE": "你的知乎 Cookie",
        "LLM_API_KEY": "sk-你的 API Key",
        "LLM_API_URL": "https://api.deepseek.com/v1/chat/completions",
        "LLM_MODEL": "deepseek-chat"
      },
      "disabled": false,
      "autoApprove": []
    }
  }
}
```

### 4. 构建

```bash
npm run build
```

## 🛠️ 可用工具

| 工具名称 | 说明 | 参数 |
|---------|------|------|
| `fetch_zhihu_collections` | 获取知乎用户的收藏夹列表 | `userId` (必填) |
| `fetch_zhihu_collection_contents` | 获取指定收藏夹的内容 | `collectionId` (必填), `limit` (可选, 默认20, 最大200) |
| `fetch_all_zhihu_collections` | 一键获取所有收藏夹及内容 | `userId` (必填) |
| `summarize_collections` | 总结收藏内容，生成结构化笔记 | `folderIndex` (可选, 指定收藏夹索引) |
| `export_notes` | 将笔记导出到本地文件 | `outputDir` (可选, 默认 ~/Documents/CollectionNotes) |

## 📋 使用流程

```
1. fetch_all_zhihu_collections  →  获取所有收藏内容
2. summarize_collections        →  AI 总结生成笔记
3. export_notes                 →  导出到本地文件
```

## 📄 输出示例

笔记导出到 `~/Documents/CollectionNotes/`，格式如下：

```markdown
## 📁 收藏夹名称 - 收藏总结

### 📊 概览
- 总收藏数：38
- 内容类型分布：回答 30篇，想法 8条
- 总结时间：2024-05-21

### 📝 内容分类总结
#### 1. 类别名称
- **核心观点**：...
- **相关文章**：[标题](链接)

### 💡 关键洞察
1. 洞察一
2. 洞察二

### 🎯 行动建议
1. 建议一
2. 建议二
```

## ⚠️ 当前不足与待改进

### 功能局限
1. **仅支持知乎** — 目前只实现了知乎收藏的抓取，小红书、B站等平台尚未支持
2. **串行总结较慢** — 多个收藏夹的总结是串行调用 API 的，收藏夹多时耗时较长（每个约 30-60 秒）
3. **无增量更新** — 每次都是全量抓取和总结，没有增量更新机制
4. **无 Web UI** — 目前只有 MCP 接口和命令行调用，没有可视化界面

### 技术债务
1. **错误处理不完善** — 部分边界情况（如网络超时、API 限流）的处理可以更优雅
2. **无缓存机制** — 抓取的内容没有本地缓存，重复总结会重复请求知乎 API
3. **Cookie 过期** — 知乎 Cookie 有过期时间，需要定期更新
4. **内容去重** — 没有对收藏内容进行去重处理

### 未来规划
- [ ] 支持小红书收藏抓取
- [ ] 支持 B站收藏抓取
- [ ] 并行总结多个收藏夹
- [ ] 增量更新（只总结新增内容）
- [ ] 本地内容缓存
- [ ] Web 管理界面
- [ ] 定时自动总结
- [ ] 邮件/推送通知

## 📦 技术栈

- **运行时**: Node.js
- **语言**: TypeScript
- **框架**: MCP SDK (@modelcontextprotocol/sdk)
- **AI**: DeepSeek API / OpenAI API
- **HTTP**: Axios

## 📝 License

MIT
