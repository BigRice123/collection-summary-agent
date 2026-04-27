/**
 * 知乎收藏内容抓取模块
 *
 * 通过知乎 API 获取用户的收藏夹内容和收藏的答案/文章
 *
 * 注意：知乎的 API 可能需要登录态（Cookie），
 * 用户需要提供自己的知乎 Cookie 才能访问收藏内容。
 */
/** 知乎收藏项 */
export interface ZhihuCollectionItem {
    /** 内容 ID */
    id: string;
    /** 标题 */
    title: string;
    /** 内容类型：answer（回答）| article（文章）| video（视频） */
    type: 'answer' | 'article' | 'video';
    /** 内容摘要 */
    excerpt: string;
    /** 内容链接 */
    url: string;
    /** 作者名称 */
    authorName: string;
    /** 作者主页链接 */
    authorUrl: string;
    /** 收藏时间 */
    collectedAt: string;
    /** 内容原始内容（用于总结） */
    content?: string;
}
/** 知乎收藏夹 */
export interface ZhihuCollectionFolder {
    /** 收藏夹 ID */
    id: string;
    /** 收藏夹名称 */
    title: string;
    /** 收藏夹描述 */
    description: string;
    /** 收藏数量 */
    itemCount: number;
    /** 收藏项列表 */
    items: ZhihuCollectionItem[];
}
/** 知乎客户端配置 */
export interface ZhihuClientConfig {
    /** 知乎 Cookie（必需，用于登录态） */
    cookie: string;
}
/**
 * 知乎 API 客户端
 */
export declare class ZhihuClient {
    private client;
    private cookie;
    constructor(config: ZhihuClientConfig);
    /**
     * 获取用户的收藏夹列表
     * 知乎 API: /members/{user_id}/collections
     */
    getCollections(userId: string): Promise<ZhihuCollectionFolder[]>;
    /**
     * 获取收藏夹中的内容列表
     * 知乎 API: /collections/{collection_id}/contents
     */
    getCollectionContents(collectionId: string, limit?: number): Promise<ZhihuCollectionItem[]>;
    /**
     * 获取收藏内容的详细内容（用于 AI 总结）
     * 对于回答：获取回答的详细内容
     * 对于文章：获取文章的详细内容
     */
    getContentDetail(item: ZhihuCollectionItem): Promise<string>;
    /**
     * 一键获取所有收藏夹及其内容
     */
    getAllCollectionsWithContents(userId: string): Promise<ZhihuCollectionFolder[]>;
    /**
     * 映射内容类型
     */
    private mapContentType;
    /**
     * 构建内容链接
     */
    private buildContentUrl;
    /**
     * 去除 HTML 标签
     */
    private stripHtml;
}
//# sourceMappingURL=zhihu.d.ts.map