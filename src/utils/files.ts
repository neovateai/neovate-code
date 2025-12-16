import path from 'pathe';
import { execFileNoThrow } from './execFileNoThrow';
import { listDirectory } from './list';

export interface FileItem {
  path: string;
  type: 'file' | 'directory';
  name: string;
}

async function getGitStatusItems(cwd: string, query?: string) {
  const gitStatus = await (async () => {
    // won't throw error
    const { stdout } = await execFileNoThrow(
      cwd,
      'git',
      ['status', '--short'],
      undefined,
      undefined,
      false,
    );
    // DO NOT USE TRIM HERE, it will make the result inconsistent
    return stdout;
  })();

  const files = gitStatus
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .filter(
      (line) =>
        !line.startsWith('D') &&
        !line.startsWith('??') &&
        !line.startsWith('R'),
    )
    .map((line) => line.slice(3))
    .filter(
      (path) => !query || path.toLowerCase().includes(query.toLowerCase()),
    );

  return Promise.all(
    files.map(async (file) => {
      const relativePath = path.join(cwd, file);
      const name = path.basename(file);
      const item = await createFileItem(relativePath, name, 'file');
      return item;
    }),
  );
}

export async function getFiles(opts: {
  cwd: string;
  maxSize: number;
  query: string;
}) {
  const { cwd, query, maxSize } = opts;
  let items = await getGitStatusItems(cwd, query);
  if (items.length < maxSize) {
    const remainingSize = maxSize - items.length;
    const result = listDirectory(cwd, cwd, 6000).filter(
      (item) => !query || item.toLowerCase().includes(query.toLowerCase()),
    );
    const remainingItems = result
      .slice(0, remainingSize)
      .map((item) => {
        const isDir = item.endsWith(path.sep);
        const name = path.basename(item) + (isDir ? path.sep : '');
        const type: 'file' | 'directory' = isDir ? 'directory' : 'file';
        return createFileItem(item, name, type);
      })
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }

        return a.path.localeCompare(b.path);
      });
    items = [...items, ...remainingItems];
  }
  return items;
}

function createFileItem(
  relativePath: string,
  name: string,
  type: 'file' | 'directory',
): FileItem {
  const fileItem: FileItem = {
    path: relativePath,
    type,
    name,
  };
  return fileItem;
}
