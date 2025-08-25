import { getGitStatus } from '../../utils/git';
import { type SourceOptions } from '../dataSource';

export interface GitData {
  branch: string;
  mainBranch: string;
  status: string;
  log: string;
  author: string;
  authorLog: string;
  isRepo: boolean;
}

export function createGitSource(cwd: string): SourceOptions<GitData> {
  return {
    fetcher: async () => {
      const status = await getGitStatus({ cwd });

      if (!status) {
        return {
          branch: '',
          mainBranch: '',
          status: '',
          log: '',
          author: '',
          authorLog: '',
          isRepo: false,
        };
      }

      return {
        branch: status.branch,
        mainBranch: status.mainBranch,
        status: status.status,
        log: status.log,
        author: status.author,
        authorLog: status.authorLog,
        isRepo: true,
      };
    },
    ttl: 5000, // 5 seconds cache
  };
}
