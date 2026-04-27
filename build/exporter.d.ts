/**
 * 笔记导出模块
 *
 * 将生成的总结笔记导出为 Markdown 文件
 */
import { SummaryNote } from './summarizer.js';
/**
 * 笔记导出器
 */
export declare class NoteExporter {
    /** 缓存的笔记 */
    private notes;
    /**
     * 缓存笔记
     */
    cacheNotes(notes: SummaryNote[]): void;
    /**
     * 导出所有笔记到本地文件
     * @param outputDir 输出目录（可选，默认 ~/Documents/CollectionNotes）
     * @returns 导出的文件路径列表
     */
    exportAll(outputDir?: string): Promise<string[]>;
    /**
     * 生成总览文件
     */
    private generateOverview;
    /**
     * 清理文件名中的非法字符
     */
    private sanitizeFileName;
}
//# sourceMappingURL=exporter.d.ts.map