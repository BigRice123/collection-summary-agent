/**
 * AI 总结模块
 *
 * 将抓取到的收藏内容发送给 LLM 进行总结，
 * 生成结构化的笔记。
 */
import { ZhihuCollectionFolder } from './zhihu.js';
/** 总结配置 */
export interface SummarizerConfig {
    /** LLM API Key（如 OpenAI、DeepSeek 等） */
    apiKey: string;
    /** LLM API 地址 */
    apiUrl?: string;
    /** 使用的模型名称 */
    model?: string;
}
/** 生成的笔记 */
export interface SummaryNote {
    /** 收藏夹名称 */
    folderName: string;
    /** 总结生成时间 */
    generatedAt: string;
    /** 总收藏数 */
    totalItems: number;
    /** 总结内容（Markdown 格式） */
    content: string;
}
/**
 * AI 总结器
 */
export declare class Summarizer {
    private config;
    constructor(config: SummarizerConfig);
    /**
     * 总结单个收藏夹的内容
     */
    summarizeFolder(folder: ZhihuCollectionFolder): Promise<SummaryNote>;
    /**
     * 总结所有收藏夹
     */
    summarizeAll(folders: ZhihuCollectionFolder[]): Promise<SummaryNote[]>;
    /**
     * 构建用于总结的内容文本
     */
    private buildContentText;
    /**
     * 构建总结用的 prompt
     */
    private buildSummaryPrompt;
    /**
     * 调用 LLM API
     */
    private callLLM;
    /**
     * 类型标签
     */
    private typeLabel;
}
//# sourceMappingURL=summarizer.d.ts.map