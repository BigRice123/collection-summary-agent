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
   * 知乎 API: /members/{user_id}/collections
   */
  async getCollections(userId: string): Promise<ZhihuCollectionFolder[]> {
    try {
      const response = await this.client.get(
        `/members/${userId}/collections`,
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
        itemCount: col.content_count || 0,
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
   * 知乎 API: /collections/{collection_id}/contents
   */
  async getCollectionContents(
    collectionId: string,
    limit: number = 20
  ): Promise<ZhihuCollectionItem[]> {
    try {
      const response = await this.client.get(
        `/collections/${collectionId}/contents`,
        {
          params: {
            limit,
            offset: 0,
          },
        }
      );

      const contents = response.data.data || [];
      return contents.map((item: any) => {
        const target = item.target || {};
        const type = item.type || 'answer';

        return {
          id: String(target.id || ''),
          title: target.title || target.question?.title || '无标题',
          type: this.mapContentType(type),
          excerpt: target.excerpt || target.content || '',
          url: this.buildContentUrl(target, type),
          authorName: target.author?.name || '未知作者',
          authorUrl: target.author?.url || '',
          collectedAt: item.created_time
            ? new Date(item.created_time * 1000).toISOString()
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
      return this.stripHtml(content);
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

    // 2. 逐个获取收藏夹内容
    for (const folder of folders) {
      const items = await this.getCollectionContents(folder.id);
      folder.items = items;

      // 3. 获取每个内容的详细内容（限制前 10 个，避免请求过多）
      const detailPromises = items.slice(0, 10).map((item) =>
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
