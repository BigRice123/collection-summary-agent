/**
 * 知乎收藏内容抓取模块
 * 
 * 通过知乎 API 获取用户的收藏夹内容和收藏的答案/文章
 * 
 * 注意：知乎的 API 可能需要登录态（Cookie），
 * 用户需要提供自己的知乎 Cookie 才能访问收藏内容。
 */

import axios, { AxiosInstance } from 'axios';

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
  /** 是否公开 */
  isPublic: boolean;
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
export class ZhihuClient {
  private client: AxiosInstance;
  private cookie: string;

  constructor(config: ZhihuClientConfig) {
    this.cookie = config.cookie;
    this.client = axios.create({
      baseURL: 'https://www.zhihu.com/api/v4',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Cookie': this.cookie,
        'Referer': 'https://www.zhihu.com/',
        'x-requested-with': 'fetch',
      },
      timeout: 15000,
    });
  }

  /**
   * 获取用户的收藏夹列表
   * 知乎 API: /members/{user_id}/favlists
   */
  async getCollections(userId: string): Promise<ZhihuCollectionFolder[]> {
    try {
      const response = await this.client.get(
        `/members/${userId}/favlists`,
        {
          params: {
            limit: 20,
            offset: 0,
          },
        }
      );

      const collections = response.data.data || [];
      return collections.map((col: any) => ({
        id: String(col.id),
        title: col.title || '未命名收藏夹',
        description: col.description || '',
        isPublic: col.is_public !== false,
        itemCount: col.item_count || 0,
        items: [],
      }));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `获取收藏夹列表失败: ${error.response?.status} - ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 获取收藏夹中的内容列表
   * 知乎 API: /collections/{collection_id}/items
   */
  async getCollectionContents(
    collectionId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ZhihuCollectionItem[]> {
    try {
      const response = await this.client.get(
        `/collections/${collectionId}/items`,
        {
          params: {
            limit,
            offset,
          },
        }
      );

      const contents = response.data.data || [];
      return contents.map((item: any) => {
        // 知乎 API 返回的数据在 content 字段中
        const content = item.content || {};
        const type = content.type || 'answer';

        return {
          id: String(content.id || ''),
          title: content.title || content.question?.title || '无标题',
          type: this.mapContentType(type),
          excerpt: content.excerpt || '',
          // 从 HTML 内容中提取纯文本作为摘要
          content: content.content || '',
          url: content.url || '',
          authorName: content.author?.name || '未知作者',
          authorUrl: content.author?.url || '',
          collectedAt: content.created_time
            ? new Date(content.created_time * 1000).toISOString()
            : '',
        };
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          `获取收藏内容失败: ${error.response?.status} - ${error.response?.data?.message || error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * 获取收藏内容的详细内容（用于 AI 总结）
   * 对于回答：获取回答的详细内容
   * 对于文章：获取文章的详细内容
   */
  async getContentDetail(item: ZhihuCollectionItem): Promise<string> {
    try {
      let content = '';

      if (item.type === 'answer') {
        // 获取回答详情
        const response = await this.client.get(
          `/answers/${item.id}`,
          {
            params: { include: 'content' },
          }
        );
        content = response.data.content || '';
      } else if (item.type === 'article') {
        // 获取文章详情
        const response = await this.client.get(
          `/articles/${item.id}`,
          {
            params: { include: 'content' },
          }
        );
        content = response.data.content || '';
      }

      // 去除 HTML 标签，提取纯文本
      const stripped = this.stripHtml(content);
      return typeof stripped === 'string' ? stripped : String(stripped);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(`获取内容详情失败 (${item.id}): ${error.message}`);
        return item.excerpt; // 降级返回摘要
      }
      throw error;
    }
  }

  /**
   * 一键获取所有收藏夹及其内容
   */
  async getAllCollectionsWithContents(
    userId: string
  ): Promise<ZhihuCollectionFolder[]> {
    // 1. 获取所有收藏夹
    const folders = await this.getCollections(userId);

    // 2. 逐个获取收藏夹内容（获取全部，通过分页）
    for (const folder of folders) {
      const allItems: ZhihuCollectionItem[] = [];
      let offset = 0;
      const pageSize = 20;
      let hasMore = true;

      while (hasMore) {
        const items = await this.getCollectionContents(folder.id, pageSize, offset);
        allItems.push(...items);
        offset += pageSize;
        // 如果返回的数量小于 pageSize，说明没有更多了
        if (items.length < pageSize) {
          hasMore = false;
        }
        // 最多获取 200 条
        if (allItems.length >= 200) {
          hasMore = false;
        }
      }

      folder.items = allItems;

      // 3. 获取每个内容的详细内容（限制前 30 个，避免请求过多导致超时）
      const detailPromises = allItems.slice(0, 30).map((item) =>
        this.getContentDetail(item).then((content) => {
          item.content = content;
        })
      );
      await Promise.all(detailPromises);
    }

    return folders;
  }

  /**
   * 映射内容类型
   */
  private mapContentType(type: string): 'answer' | 'article' | 'video' {
    switch (type) {
      case 'answer':
        return 'answer';
      case 'article':
        return 'article';
      case 'zvideo':
        return 'video';
      default:
        return 'answer';
    }
  }

  /**
   * 构建内容链接
   */
  private buildContentUrl(target: any, type: string): string {
    if (type === 'answer') {
      const questionId = target.question?.id || '';
      return `https://www.zhihu.com/question/${questionId}/answer/${target.id}`;
    } else if (type === 'article') {
      return `https://zhuanlan.zhihu.com/p/${target.id}`;
    }
    return '';
  }

  /**
   * 去除 HTML 标签
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&/g, '&')
      .replace(/</g, '<')
      .replace(/>/g, '>')
      .replace(/"/g, '"')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
