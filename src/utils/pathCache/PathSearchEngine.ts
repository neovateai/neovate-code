import { listDirectory } from '../list';
import type { PathSearchOptions, PathSearchResult } from './types';
import { CACHE_CONFIG } from './types';

export class PathSearchEngine {
  private productName: string;

  constructor(productName: string) {
    this.productName = productName;
  }

  async scan(options: PathSearchOptions): Promise<PathSearchResult> {
    const { cwd, maxFiles = 6000, signal } = options;

    if (signal?.aborted) {
      throw new Error('Scan aborted');
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Scan timeout'));
      }, CACHE_CONFIG.SCAN_TIMEOUT);

      try {
        const paths = listDirectory(cwd, cwd, this.productName, maxFiles);
        clearTimeout(timeoutId);

        resolve({
          paths,
          fromCache: false,
          truncated: paths.length >= maxFiles,
        });
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
}
