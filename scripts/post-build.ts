import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const DIST_DIR = 'dist';
const FILES_TO_PATCH = ['cli.mjs', 'index.mjs'];
const SEARCH_STRING = '"react-devtools-core"';
const REPLACE_STRING = '"fs"';

function log(message: string) {
  console.log(`[post-build] ${message}`);
}

function patchFile(filePath: string): boolean {
  try {
    // 检查文件是否存在
    if (!existsSync(filePath)) {
      log(`❌ 文件不存在: ${filePath}`);
      return false;
    }

    // 读取文件内容
    const content = readFileSync(filePath, 'utf-8');

    // 检查是否已经 patch 过
    if (!content.includes(SEARCH_STRING)) {
      if (content.includes(REPLACE_STRING)) {
        log(`⚠️  文件已 patch 过: ${filePath}`);
      } else {
        log(`⚠️  文件中未找到目标字符串: ${filePath}`);
      }
      return false;
    }

    // 执行替换
    const newContent = content.replace(SEARCH_STRING, REPLACE_STRING);

    // 检查是否有变化
    if (content === newContent) {
      log(`⚠️  文件内容未发生变化: ${filePath}`);
      return false;
    }

    // 写回文件
    writeFileSync(filePath, newContent, 'utf-8');
    log(`✅ 成功 patch 文件: ${filePath}`);
    return true;
  } catch (error) {
    log(`❌ 处理文件时出错 ${filePath}: ${error}`);
    return false;
  }
}

function main() {
  log('开始执行 post-build patch...');

  let successCount = 0;
  let totalCount = 0;

  for (const fileName of FILES_TO_PATCH) {
    const filePath = join(DIST_DIR, fileName);
    totalCount++;

    if (patchFile(filePath)) {
      successCount++;
    }
  }

  log(`完成! 成功处理 ${successCount}/${totalCount} 个文件`);

  if (successCount === 0) {
    log('⚠️  没有文件被修改');
    process.exit(0);
  }
}

main();
