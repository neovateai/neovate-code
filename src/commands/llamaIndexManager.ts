import fs from 'fs';
import pathe from 'pathe';
import * as logger from '../utils/logger';

export interface DocMetadata {
  docUrl: string;
  docName: string;
  docId: string;
}

export interface SearchResult {
  text: string;
  metadata: DocMetadata;
  score: number;
}

export class LlamaIndexManager {
  private docsDir: string;
  private metadataPath: string;

  constructor(configDir: string) {
    this.docsDir = pathe.join(configDir, 'docs');
    this.metadataPath = pathe.join(configDir, 'docs', 'metadata.json');

    // 确保目录存在
    if (!fs.existsSync(this.docsDir)) {
      fs.mkdirSync(this.docsDir, { recursive: true });
    }

    // 初始化元数据文件
    if (!fs.existsSync(this.metadataPath)) {
      fs.writeFileSync(this.metadataPath, JSON.stringify([], null, 2));
    }

    logger.logInfo('✅ 文档管理器初始化完成');
  }

  /**
   * 获取文档目录
   */
  getDocsDir(): string {
    return this.docsDir;
  }

  /**
   * 获取所有文档元数据
   */
  getAllDocs(): DocMetadata[] {
    try {
      const data = fs.readFileSync(this.metadataPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      logger.logError({ error: `读取文档元数据失败: ${error}` });
      return [];
    }
  }

  /**
   * 保存文档元数据
   */
  private saveDocs(docs: DocMetadata[]): void {
    try {
      fs.writeFileSync(this.metadataPath, JSON.stringify(docs, null, 2));
    } catch (error) {
      logger.logError({ error: `保存文档元数据失败: ${error}` });
    }
  }

  /**
   * 添加文档
   */
  async addDocument(text: string, metadata: DocMetadata): Promise<void> {
    try {
      logger.logInfo('正在添加文档...');
      const docs = this.getAllDocs();

      // 检查文档是否已存在
      const existingDoc = docs.find((doc) => doc.docId === metadata.docId);
      if (existingDoc) {
        // 如果存在，更新元数据
        Object.assign(existingDoc, metadata);
        logger.logInfo('更新现有文档元数据');
      } else {
        // 否则添加新文档
        docs.push(metadata);
        logger.logInfo('添加新文档元数据');
      }

      // 保存文档内容
      const docPath = pathe.join(this.docsDir, `${metadata.docId}.md`);
      fs.writeFileSync(docPath, text);
      logger.logInfo('保存文档内容完成');

      // 保存元数据
      this.saveDocs(docs);
      logger.logInfo('保存元数据完成');

      logger.logInfo(`✅ 文档 "${metadata.docName}" 已添加到索引`);
    } catch (error) {
      logger.logError({ error: `添加文档失败: ${error}` });
      throw error;
    }
  }

  /**
   * 从索引中删除文档
   */
  async deleteDocument(docId: string): Promise<void> {
    try {
      logger.logInfo(`正在删除文档 ID "${docId}"...`);
      const docs = this.getAllDocs();

      // 查找文档
      const docIndex = docs.findIndex((doc) => doc.docId === docId);

      if (docIndex === -1) {
        logger.logInfo(`文档 ID "${docId}" 不存在或已被删除`);
        return;
      }

      // 删除文档文件
      const docPath = pathe.join(this.docsDir, `${docId}.md`);
      if (fs.existsSync(docPath)) {
        fs.unlinkSync(docPath);
        logger.logInfo('文档文件已删除');
      }

      // 更新元数据
      docs.splice(docIndex, 1);
      this.saveDocs(docs);
      logger.logInfo('元数据已更新');

      logger.logInfo(`✅ 文档 ID "${docId}" 已从索引中删除`);
    } catch (error) {
      logger.logError({ error: `删除文档失败: ${error}` });
      throw error;
    }
  }

  /**
   * 简单的文本搜索
   */
  async queryDocuments(
    query: string,
    topK: number = 5,
  ): Promise<{ results: SearchResult[] }> {
    try {
      logger.logInfo(`正在搜索: "${query}"...`);
      const docs = this.getAllDocs();
      const results: SearchResult[] = [];

      if (docs.length === 0) {
        logger.logInfo('没有可搜索的文档');
        return { results };
      }

      // 对每个文档进行搜索
      for (const metadata of docs) {
        const docPath = pathe.join(this.docsDir, `${metadata.docId}.md`);

        if (!fs.existsSync(docPath)) {
          logger.logInfo(`文档 ${metadata.docName} 的文件不存在，跳过`);
          continue;
        }

        const content = fs.readFileSync(docPath, 'utf-8');

        // 简单的文本匹配
        const queryLower = query.toLowerCase();
        const contentLower = content.toLowerCase();

        if (contentLower.includes(queryLower)) {
          // 找到匹配的上下文
          const index = contentLower.indexOf(queryLower);
          const start = Math.max(0, index - 150);
          const end = Math.min(content.length, index + query.length + 150);
          const text = content.substring(start, end);

          // 计算简单的相关性分数
          // 匹配次数影响分数
          const matchCount = (
            contentLower.match(new RegExp(queryLower, 'g')) || []
          ).length;
          const score = Math.min(
            0.5 +
              matchCount * 0.1 +
              (queryLower.length / contentLower.length) * 0.5,
            1.0,
          );

          results.push({
            text,
            metadata,
            score,
          });

          logger.logInfo(`在文档 ${metadata.docName} 中找到匹配`);
        }
      }

      // 按相关性排序
      results.sort((a, b) => b.score - a.score);

      // 返回前 topK 个结果
      const limitedResults = results.slice(0, topK);
      logger.logInfo(`搜索完成，找到 ${limitedResults.length} 个结果`);

      return { results: limitedResults };
    } catch (error) {
      logger.logError({ error: `查询文档失败: ${error}` });
      return { results: [] };
    }
  }
}
