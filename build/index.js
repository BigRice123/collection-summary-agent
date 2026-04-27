#!/usr/bin/env node
/**
 * 收藏内容总结助手 - MCP Server
 *
 * 提供以下工具：
 * 1. fetch_zhihu_collections - 获取知乎收藏夹列表
 * 2. fetch_zhihu_collection_contents - 获取指定收藏夹的内容
 * 3. summarize_collections - 总结收藏内容并生成笔记
 * 4. export_notes - 导出笔记到本地文件
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ErrorCode, ListToolsRequestSchema, McpError, } from '@modelcontextprotocol/sdk/types.js';
import { ZhihuClient } from './zhihu.js';
import { Summarizer } from './summarizer.js';
import { NoteExporter } from './exporter.js';
/** 知乎 Cookie（从环境变量获取） */
const ZHIHU_COOKIE = process.env.ZHIHU_COOKIE;
/** LLM API Key（从环境变量获取） */
const LLM_API_KEY = process.env.LLM_API_KEY;
/** LLM API 地址（可选，默认 OpenAI） */
const LLM_API_URL = process.env.LLM_API_URL;
/** LLM 模型名称（可选） */
const LLM_MODEL = process.env.LLM_MODEL;
if (!ZHIHU_COOKIE) {
    throw new Error('ZHIHU_COOKIE 环境变量未设置');
}
if (!LLM_API_KEY) {
    throw new Error('LLM_API_KEY 环境变量未设置');
}
/** 知乎客户端实例 */
const zhihuClient = new ZhihuClient({ cookie: ZHIHU_COOKIE });
/** AI 总结器实例 */
const summarizer = new Summarizer({
    apiKey: LLM_API_KEY,
    apiUrl: LLM_API_URL,
    model: LLM_MODEL,
});
/** 笔记导出器实例 */
const exporter = new NoteExporter();
/** 缓存：收藏夹数据 */
let cachedFolders = null;
class CollectionSummaryServer {
    server;
    constructor() {
        this.server = new Server({
            name: 'collection-summary-agent',
            version: '0.1.0',
        }, {
            capabilities: {
                tools: {},
            },
        });
        this.setupToolHandlers();
        // 错误处理
        this.server.onerror = (error) => console.error('[MCP Error]', error);
        process.on('SIGINT', async () => {
            await this.server.close();
            process.exit(0);
        });
    }
    /**
     * 注册工具处理器
     */
    setupToolHandlers() {
        this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
            tools: [
                {
                    name: 'fetch_zhihu_collections',
                    description: '获取知乎用户的收藏夹列表（不含具体内容）',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            userId: {
                                type: 'string',
                                description: '知乎用户 ID（URL 中的数字 ID 或自定义 ID）',
                            },
                        },
                        required: ['userId'],
                    },
                },
                {
                    name: 'fetch_zhihu_collection_contents',
                    description: '获取指定知乎收藏夹中的所有内容',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            collectionId: {
                                type: 'string',
                                description: '收藏夹 ID',
                            },
                            limit: {
                                type: 'number',
                                description: '获取数量上限（默认 20，最大 200）',
                                minimum: 1,
                                maximum: 200,
                            },
                        },
                        required: ['collectionId'],
                    },
                },
                {
                    name: 'fetch_all_zhihu_collections',
                    description: '一键获取知乎所有收藏夹及其内容（包含详细内容，用于总结）',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            userId: {
                                type: 'string',
                                description: '知乎用户 ID',
                            },
                        },
                        required: ['userId'],
                    },
                },
                {
                    name: 'summarize_collections',
                    description: '总结已获取的收藏内容，生成结构化笔记（需要先调用 fetch_all_zhihu_collections）',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            folderIndex: {
                                type: 'number',
                                description: '指定要总结的收藏夹索引（从 0 开始），不指定则总结所有',
                            },
                        },
                        required: [],
                    },
                },
                {
                    name: 'export_notes',
                    description: '将生成的总结笔记导出到本地文件',
                    inputSchema: {
                        type: 'object',
                        properties: {
                            outputDir: {
                                type: 'string',
                                description: '输出目录（默认：~/Documents/CollectionNotes）',
                            },
                        },
                        required: [],
                    },
                },
            ],
        }));
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            switch (request.params.name) {
                case 'fetch_zhihu_collections':
                    return this.handleFetchCollections(request.params.arguments);
                case 'fetch_zhihu_collection_contents':
                    return this.handleFetchCollectionContents(request.params.arguments);
                case 'fetch_all_zhihu_collections':
                    return this.handleFetchAllCollections(request.params.arguments);
                case 'summarize_collections':
                    return this.handleSummarize(request.params.arguments);
                case 'export_notes':
                    return this.handleExport(request.params.arguments);
                default:
                    throw new McpError(ErrorCode.MethodNotFound, `未知工具: ${request.params.name}`);
            }
        });
    }
    /**
     * 处理：获取收藏夹列表
     */
    async handleFetchCollections(args) {
        const userId = args?.userId;
        if (!userId || typeof userId !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, '请提供 userId 参数');
        }
        try {
            const folders = await zhihuClient.getCollections(userId);
            cachedFolders = folders;
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            count: folders.length,
                            collections: folders.map((f) => ({
                                id: f.id,
                                title: f.title,
                                description: f.description,
                                itemCount: f.itemCount,
                            })),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `获取收藏夹失败: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }
    /**
     * 处理：获取收藏夹内容
     */
    async handleFetchCollectionContents(args) {
        const collectionId = args?.collectionId;
        const limit = args?.limit || 20;
        if (!collectionId || typeof collectionId !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, '请提供 collectionId 参数');
        }
        try {
            const items = await zhihuClient.getCollectionContents(collectionId, limit);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            count: items.length,
                            items: items.map((item) => ({
                                id: item.id,
                                title: item.title,
                                type: item.type,
                                excerpt: item.excerpt.substring(0, 200) + '...',
                                url: item.url,
                                author: item.authorName,
                                collectedAt: item.collectedAt,
                            })),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `获取收藏内容失败: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }
    /**
     * 处理：一键获取所有收藏
     */
    async handleFetchAllCollections(args) {
        const userId = args?.userId;
        if (!userId || typeof userId !== 'string') {
            throw new McpError(ErrorCode.InvalidParams, '请提供 userId 参数');
        }
        try {
            cachedFolders =
                await zhihuClient.getAllCollectionsWithContents(userId);
            const totalItems = cachedFolders.reduce((sum, f) => sum + f.items.length, 0);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            collectionCount: cachedFolders.length,
                            totalItems,
                            summary: cachedFolders.map((f) => ({
                                id: f.id,
                                title: f.title,
                                itemCount: f.items.length,
                                items: f.items.map((item) => ({
                                    title: item.title,
                                    type: item.type,
                                    author: item.authorName,
                                    hasDetail: !!item.content,
                                })),
                            })),
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `获取收藏数据失败: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }
    /**
     * 处理：总结收藏内容
     */
    async handleSummarize(args) {
        if (!cachedFolders || cachedFolders.length === 0) {
            return {
                content: [
                    {
                        type: 'text',
                        text: '暂无缓存数据，请先调用 fetch_all_zhihu_collections 获取收藏内容',
                    },
                ],
                isError: true,
            };
        }
        try {
            let notes;
            if (args?.folderIndex !== undefined) {
                // 总结指定收藏夹
                const index = Number(args.folderIndex);
                if (index < 0 || index >= cachedFolders.length) {
                    throw new McpError(ErrorCode.InvalidParams, `收藏夹索引 ${index} 无效，共有 ${cachedFolders.length} 个收藏夹`);
                }
                const note = await summarizer.summarizeFolder(cachedFolders[index]);
                notes = [note];
            }
            else {
                // 总结所有收藏夹
                notes = await summarizer.summarizeAll(cachedFolders);
            }
            // 缓存笔记
            exporter.cacheNotes(notes);
            return {
                content: [
                    {
                        type: 'text',
                        text: notes
                            .map((n) => n.content)
                            .join('\n\n---\n\n'),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `总结失败: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }
    /**
     * 处理：导出笔记
     */
    async handleExport(args) {
        const outputDir = args?.outputDir;
        try {
            const files = await exporter.exportAll(outputDir);
            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({
                            success: true,
                            message: '笔记导出成功',
                            files,
                        }, null, 2),
                    },
                ],
            };
        }
        catch (error) {
            return {
                content: [
                    {
                        type: 'text',
                        text: `导出失败: ${error.message}`,
                    },
                ],
                isError: true,
            };
        }
    }
    async run() {
        const transport = new StdioServerTransport();
        await this.server.connect(transport);
        console.error('收藏总结助手 MCP server 已启动');
    }
}
const server = new CollectionSummaryServer();
server.run().catch(console.error);
//# sourceMappingURL=index.js.map