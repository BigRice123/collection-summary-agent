/**
 * AI 总结模块
 *
 * 将抓取到的收藏内容发送给 LLM 进行总结，
 * 生成结构化的笔记。
 */
import axios from 'axios';
/**
 * AI 总结器
 */
export class Summarizer {
    config;
    constructor(config) {
        this.config = {
            apiUrl: 'https://api.deepseek.com/v1/chat/completions',
            model: 'deepseek-chat',
            ...config,
        };
    }
    /**
     * 总结单个收藏夹的内容
     */
    async summarizeFolder(folder) {
        // 构建总结用的内容文本
        const contentText = this.buildContentText(folder);
        // 构建 prompt
        const prompt = this.buildSummaryPrompt(folder.title, contentText);
        // 调用 LLM
        const summary = await this.callLLM(prompt);
        return {
            folderName: folder.title,
            generatedAt: new Date().toISOString(),
            totalItems: folder.items.length,
            content: summary,
        };
    }
    /**
     * 总结所有收藏夹
     */
    async summarizeAll(folders) {
        const results = [];
        for (const folder of folders) {
            if (folder.items.length === 0)
                continue;
            const note = await this.summarizeFolder(folder);
            results.push(note);
        }
        return results;
    }
    /**
     * 构建用于总结的内容文本
     */
    buildContentText(folder) {
        return folder.items
            .map((item, index) => {
            // 确保 content 是字符串，避免 substring 报错
            let content = item.content || item.excerpt;
            if (typeof content !== 'string') {
                content = String(content);
            }
            return `
[${index + 1}] 标题：${item.title}
    类型：${this.typeLabel(item.type)}
    作者：${item.authorName}
    链接：${item.url}
     内容：${content.substring(0, 2000)}
`;
        })
            .join('\n---\n');
    }
    /**
     * 构建总结用的 prompt
     */
    buildSummaryPrompt(folderName, contentText) {
        return `你是一个知识管理助手。请帮我总结以下收藏夹的内容。

收藏夹名称：${folderName}

以下是收藏的内容列表（包含标题、类型、作者和内容摘要）：

${contentText}

请按照以下格式生成总结笔记：

## 📁 ${folderName} - 收藏总结

### 📊 概览
- 总收藏数：[数量]
- 内容类型分布：[各类型数量]
- 总结时间：[当前时间]

### 📝 内容分类总结
请将内容按主题分类，每类给出：
- **类别名称**：
  - 核心观点/要点（用简洁的语言概括）
  - 相关文章：[标题](链接)

### 💡 关键洞察
- 从这些收藏中提炼出 3-5 个最有价值的观点或洞察

### 🎯 行动建议
- 基于这些内容，给出可以实际执行的建议

请用中文回答，保持简洁清晰。`;
    }
    /**
     * 调用 LLM API
     */
    async callLLM(prompt) {
        try {
            const response = await axios.post(this.config.apiUrl, {
                model: this.config.model,
                messages: [
                    {
                        role: 'system',
                        content: '你是一个专业的知识管理助手，擅长总结和整理信息。请用中文回答，输出格式为 Markdown。',
                    },
                    {
                        role: 'user',
                        content: prompt,
                    },
                ],
                temperature: 0.7,
                max_tokens: 4000,
            }, {
                headers: {
                    'Authorization': `Bearer ${this.config.apiKey}`,
                    'Content-Type': 'application/json',
                },
                timeout: 60000,
            });
            return response.data.choices[0]?.message?.content || '生成失败';
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                throw new Error(`LLM API 调用失败: ${error.response?.status} - ${error.response?.data?.error?.message || error.message}`);
            }
            throw error;
        }
    }
    /**
     * 类型标签
     */
    typeLabel(type) {
        const labels = {
            answer: '回答',
            article: '文章',
            video: '视频',
        };
        return labels[type] || type;
    }
}
//# sourceMappingURL=summarizer.js.map