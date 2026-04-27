/**
 * 笔记导出模块
 * 
 * 将生成的总结笔记导出为 Markdown 文件
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SummaryNote } from './summarizer.js';

/**
 * 笔记导出器
 */
export class NoteExporter {
  /** 缓存的笔记 */
  private notes: SummaryNote[] = [];

  /**
   * 缓存笔记
   */
  cacheNotes(notes: SummaryNote[]): void {
    this.notes = notes;
  }

  /**
   * 导出所有笔记到本地文件
   * @param outputDir 输出目录（可选，默认 ~/Documents/CollectionNotes）
   * @returns 导出的文件路径列表
   */
  async exportAll(outputDir?: string): Promise<string[]> {
    if (this.notes.length === 0) {
      throw new Error('没有可导出的笔记，请先调用 summarize_collections');
    }

    const dir = outputDir || path.join(os.homedir(), 'Documents', 'CollectionNotes');
    
    // 确保目录存在
    fs.mkdirSync(dir, { recursive: true });

    const files: string[] = [];

    // 生成总览文件
    const overviewPath = path.join(dir, 'README.md');
    const overviewContent = this.generateOverview();
    fs.writeFileSync(overviewPath, overviewContent, 'utf-8');
    files.push(overviewPath);

    // 每个收藏夹生成一个笔记文件
    for (const note of this.notes) {
      const fileName = this.sanitizeFileName(note.folderName) + '.md';
      const filePath = path.join(dir, fileName);
      
      const content = `# ${note.folderName} - 收藏总结\n\n${note.content}`;
      fs.writeFileSync(filePath, content, 'utf-8');
      files.push(filePath);
    }

    return files;
  }

  /**
   * 生成总览文件
   */
  private generateOverview(): string {
    const lines: string[] = [
      '# 📚 收藏内容总结总览\n',
      `> 生成时间：${new Date().toLocaleString('zh-CN')}\n`,
      '## 📋 目录\n',
    ];

    for (const note of this.notes) {
      const fileName = this.sanitizeFileName(note.folderName) + '.md';
      lines.push(`- [${note.folderName}](${fileName}) - 共 ${note.totalItems} 项`);
    }

    lines.push(
      '\n---\n',
      '\n> 💡 本笔记由 Collection Summary Agent 自动生成\n'
    );

    return lines.join('\n');
  }

  /**
   * 清理文件名中的非法字符
   */
  private sanitizeFileName(name: string): string {
    return name
      .replace(/[<>:"/\\|?*]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100);
  }
}
