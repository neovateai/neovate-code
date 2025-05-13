import * as cheerio from 'cheerio';
import { createHash } from 'crypto';
import fs from 'fs';
import http from 'http';
import https from 'https';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import pathe from 'pathe';
import { URL } from 'url';
import { Context } from '../types';
import * as logger from '../utils/logger';
import { DocMetadata, LlamaIndexManager } from './llamaIndexManager';

// 添加 logSuccess 函数
function logSuccess(opts: { message: string }) {
  logger.logInfo(`✅ ${opts.message}`);
}

// 文档索引结构
interface DocIndex {
  url: string;
  name: string;
  addedAt: string;
  indexed: boolean;
  filePath?: string;
}

// 创建或获取 LlamaIndex 管理器实例
let indexManager: LlamaIndexManager | null = null;

function getIndexManager(configDir: string): LlamaIndexManager {
  if (!indexManager) {
    indexManager = new LlamaIndexManager(configDir);
  }
  return indexManager;
}

async function fetchContent(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Takumi/1.0)',
      },
    };

    const protocol = url.startsWith('https') ? https : http;
    const req = protocol.get(url, options, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`请求失败: ${res.statusCode}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

/**
 * 使用cheerio提取HTML中的主要内容
 */
function extractMainContent(html: string): string {
  const $ = cheerio.load(html);

  // 移除非内容元素
  $('script, style, nav, footer, header, aside, iframe, noscript').remove();

  // 尝试找到主要内容区域
  let mainContent = $('main, article, .content, .documentation, .doc-content');

  // 如果没有找到明确的内容容器，则使用body
  if (mainContent.length === 0) {
    mainContent = $('body');
  }

  return mainContent.html() || '';
}

/**
 * 将HTML转换为Markdown文本
 */
function htmlToMarkdown(html: string): string {
  const nhm = new NodeHtmlMarkdown();
  return nhm.translate(html);
}

/**
 * 创建文档目录结构
 */
function ensureDocDirs(configDir: string): {
  docsDir: string;
  indexPath: string;
} {
  const docsDir = pathe.join(configDir, 'docs');
  const indexPath = pathe.join(docsDir, 'metadata.json');

  if (!fs.existsSync(docsDir)) {
    fs.mkdirSync(docsDir, { recursive: true });
  }

  return { docsDir, indexPath };
}

/**
 * 从URL中提取文档名称
 */
function getDocNameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    // 尝试从路径中提取更具体的名称
    const pathSegments = urlObj.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      // 使用最后一个非空路径段
      const lastSegment = pathSegments[pathSegments.length - 1];
      if (lastSegment && lastSegment !== '/') {
        return lastSegment.replace(/\.html$/, '');
      }
    }

    // 如果路径不可用，使用hostname的第一部分
    return urlObj.hostname.replace('www.', '').split('.')[0];
  } catch (e) {
    // 如果URL解析失败，使用URL的一部分作为名称
    const hash = createHash('md5').update(url).digest('hex').slice(0, 8);
    return `doc-${hash}`;
  }
}

/**
 * 处理文档
 */
async function processDocument(
  url: string,
  configDir: string,
  customName?: string,
): Promise<void> {
  const manager = getIndexManager(configDir);
  const docName = customName || getDocNameFromUrl(url);
  const docId = createHash('md5').update(url).digest('hex').slice(0, 8);

  // 抓取并处理文档
  logger.logAction({ message: `正在抓取: ${url}` });
  try {
    // 抓取HTML
    const html = await fetchContent(url);
    logger.logInfo(
      `获取到HTML内容，大小: ${(html.length / 1024).toFixed(2)} KB`,
    );

    // 提取主要内容
    const mainContent = extractMainContent(html);
    logger.logInfo(
      `提取到主要内容，大小: ${(mainContent.length / 1024).toFixed(2)} KB`,
    );

    // 转换为Markdown
    const markdown = htmlToMarkdown(mainContent);
    logger.logInfo(
      `转换为Markdown，大小: ${(markdown.length / 1024).toFixed(2)} KB`,
    );

    // 添加到索引
    logger.logAction({ message: `正在索引文档...` });

    const metadata: DocMetadata = {
      docUrl: url,
      docName: docName,
      docId: docId,
    };

    await manager.addDocument(markdown, metadata);

    logSuccess({ message: `文档 "${docName}" 已成功索引` });
  } catch (error) {
    logger.logError({ error: `处理文档失败: ${error}` });
  }
}

/**
 * 查询文档
 */
async function queryDocuments(
  query: string,
  configDir: string,
  context: Context,
): Promise<void> {
  const manager = getIndexManager(configDir);

  logger.logAction({ message: `正在搜索: "${query}"` });

  try {
    // 执行查询
    const { results } = await manager.queryDocuments(query, 5);

    if (results.length === 0) {
      logger.logError({ error: '没有找到匹配的文档。' });
      return;
    }

    // 源过滤
    const sourceFilter = context.argv.source || context.argv.s;
    let filteredResults = results;

    if (sourceFilter) {
      const sources = Array.isArray(sourceFilter)
        ? sourceFilter
        : [sourceFilter];
      filteredResults = results.filter((result) =>
        sources.some(
          (source) =>
            result.metadata.docName
              .toLowerCase()
              .includes(source.toLowerCase()) ||
            result.metadata.docUrl.toLowerCase().includes(source.toLowerCase()),
        ),
      );

      if (filteredResults.length === 0) {
        logger.logError({
          error: `没有找到匹配源 "${sources.join(', ')}" 的文档。`,
        });
        return;
      }

      logger.logInfo(`已过滤为 ${filteredResults.length} 个结果，来自指定源。`);
    }

    // 显示结果
    logger.logInfo(`找到 ${filteredResults.length} 个相关文档片段:`);

    filteredResults.forEach((result, index) => {
      logger.logInfo(
        `\n[${index + 1}] 文档: ${result.metadata.docName} (相关度: ${(result.score * 100).toFixed(1)}%)`,
      );
      logger.logInfo(`来源: ${result.metadata.docUrl}`);
      logger.logInfo(
        `内容片段:\n${result.text.substring(0, 200)}${result.text.length > 200 ? '...' : ''}`,
      );
    });
  } catch (error) {
    logger.logError({ error: `搜索失败: ${error}` });
  }
}

/**
 * 列出所有文档
 */
function listDocs(configDir: string): void {
  const manager = getIndexManager(configDir);
  const docs = manager.getAllDocs();

  if (docs.length === 0) {
    logger.logInfo(
      '没有找到已索引的文档。使用 "takumi doc add <url>" 来添加文档。',
    );
    return;
  }

  logger.logInfo(`已索引的文档 (${docs.length}):`);
  docs.forEach((doc, index) => {
    logger.logInfo(`[${index + 1}] ${doc.docName}`);
    logger.logInfo(`    URL: ${doc.docUrl}`);
    logger.logInfo(`    ID: ${doc.docId}`);
    logger.logInfo('');
  });
}

/**
 * 删除文档
 */
async function deleteDocument(docId: string, configDir: string): Promise<void> {
  const manager = getIndexManager(configDir);
  const docs = manager.getAllDocs();

  // 查找文档
  const doc = docs.find(
    (d) =>
      d.docName.toLowerCase() === docId.toLowerCase() ||
      d.docUrl.toLowerCase().includes(docId.toLowerCase()) ||
      d.docId.toLowerCase().includes(docId.toLowerCase()),
  );

  if (!doc) {
    logger.logError({ error: `没有找到名称或URL包含 "${docId}" 的文档。` });
    return;
  }

  // 从索引中删除文档
  try {
    await manager.deleteDocument(doc.docId);
    logSuccess({ message: `文档 "${doc.docName}" 已删除` });
  } catch (error) {
    logger.logError({ error: `从索引中删除文档失败: ${error}` });
  }
}

/**
 * 重命名文档
 */
async function renameDocument(
  oldName: string,
  newName: string | undefined,
  configDir: string,
): Promise<void> {
  if (!newName) {
    logger.logError({
      error:
        '请提供新的文档名称，例如: takumi doc rename "old-name" "new-name"',
    });
    return;
  }

  const manager = getIndexManager(configDir);
  const docs = manager.getAllDocs();

  // 查找文档
  const doc = docs.find(
    (d) =>
      d.docName.toLowerCase() === oldName.toLowerCase() ||
      d.docUrl.toLowerCase().includes(oldName.toLowerCase()) ||
      d.docId.toLowerCase().includes(oldName.toLowerCase()),
  );

  if (!doc) {
    logger.logError({ error: `没有找到名称或URL包含 "${oldName}" 的文档。` });
    return;
  }

  const oldDocName = doc.docName;

  // 更新文档名称
  try {
    // 读取文档内容
    const docPath = pathe.join(manager.getDocsDir(), `${doc.docId}.md`);
    if (fs.existsSync(docPath)) {
      const markdown = fs.readFileSync(docPath, 'utf-8');

      // 删除旧文档
      await manager.deleteDocument(doc.docId);

      // 添加新文档
      const metadata: DocMetadata = {
        docUrl: doc.docUrl,
        docName: newName,
        docId: doc.docId,
      };

      await manager.addDocument(markdown, metadata);

      logSuccess({ message: `文档 "${oldDocName}" 已重命名为 "${newName}"` });
    } else {
      logger.logError({ error: `找不到文档文件: ${docPath}` });
    }
  } catch (error) {
    logger.logError({ error: `重命名文档失败: ${error}` });
  }
}

export default async function doc(context: Context): Promise<void> {
  const { argv, paths } = context;
  const configDir = paths.configDir;

  // 处理查询模式
  if (argv.q || argv.query) {
    const query = argv.q || argv.query;
    if (typeof query !== 'string' || !query.trim()) {
      logger.logError({
        error: '请提供查询内容，例如: takumi doc -q "如何使用React hooks"',
      });
      return;
    }

    await queryDocuments(query, configDir, context);
    return;
  }

  // 处理删除模式
  if (argv.d || argv.delete) {
    const docId = argv.d || argv.delete;
    if (typeof docId !== 'string' || !docId.trim()) {
      logger.logError({
        error: '请提供要删除的文档ID或名称，例如: takumi doc -d "react-hooks"',
      });
      return;
    }

    await deleteDocument(docId, configDir);
    return;
  }

  // 处理重命名模式
  if (argv.r || argv.rename) {
    const oldName = argv.r || argv.rename;
    const newName = argv.n || argv.name;

    if (typeof oldName !== 'string' || !oldName.trim()) {
      logger.logError({
        error:
          '请提供要重命名的文档ID或名称，例如: takumi doc -r "old-name" -n "new-name"',
      });
      return;
    }

    await renameDocument(oldName, newName, configDir);
    return;
  }

  // 检查是否是直接添加URL模式
  const url = argv._[1] as string;
  if (url && url.startsWith('http')) {
    try {
      new URL(url);
      const customName = argv.n || argv.name;
      await processDocument(
        url,
        configDir,
        typeof customName === 'string' ? customName : undefined,
      );
      return;
    } catch (error) {
      logger.logError({ error: `无效的URL格式: ${url}` });
      return;
    }
  }

  const command = argv._[1] as string;

  switch (command) {
    case 'add':
      const addUrl = argv._[2] as string;
      const name = argv._[3] as string;
      if (!addUrl) {
        logger.logError({ error: '请提供文档URL' });
        return;
      }
      try {
        new URL(addUrl);
        await processDocument(addUrl, configDir, name);
      } catch (error) {
        logger.logError({ error: `无效的URL格式: ${addUrl}` });
      }
      break;

    case 'remove':
    case 'rm':
      const rmQuery = argv._[2] as string;
      if (!rmQuery) {
        logger.logError({ error: '请提供要删除的文档名称或URL' });
        return;
      }
      await deleteDocument(rmQuery, configDir);
      break;

    case 'rename':
      const renameQuery = argv._[2] as string;
      const newName = argv._[3] as string;
      if (!renameQuery) {
        logger.logError({ error: '请提供要重命名的文档' });
        return;
      }
      await renameDocument(renameQuery, newName, configDir);
      break;

    case 'list':
    case 'ls':
      listDocs(configDir);
      break;

    case 'search':
    case 'query':
      const searchQuery = argv._[2] as string;
      if (!searchQuery) {
        logger.logError({ error: '请提供搜索查询' });
        return;
      }
      await queryDocuments(searchQuery, configDir, context);
      break;

    default:
      logger.logInfo(`
文档管理命令:
  takumi doc add <url> [name]    - 添加文档
  takumi doc remove <query>      - 删除文档
  takumi doc rename <query> <name> - 重命名文档
  takumi doc list                - 列出所有文档
  takumi doc search <query>      - 搜索文档
      `);
  }
}
