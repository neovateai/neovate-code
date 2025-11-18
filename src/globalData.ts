import fs from 'fs';
import path from 'pathe';

interface GlobalDataSchema {
  projects: Record<
    string,
    {
      history: string[];
      lastAccessed?: number;
    }
  >;
}

export class GlobalData {
  private globalDataPath: string;

  constructor({ globalDataPath }: { globalDataPath: string }) {
    this.globalDataPath = globalDataPath;
  }

  private readData(): GlobalDataSchema {
    if (!fs.existsSync(this.globalDataPath)) {
      return { projects: {} };
    }
    try {
      const content = fs.readFileSync(this.globalDataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return { projects: {} };
    }
  }

  private writeData(data: GlobalDataSchema): void {
    const dir = path.dirname(this.globalDataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(
      this.globalDataPath,
      JSON.stringify(data, null, 2),
      'utf-8',
    );
  }

  getProjectHistory({ cwd }: { cwd: string }): string[] {
    const data = this.readData();
    return data.projects[cwd]?.history || [];
  }

  addProjectHistory({ cwd, history }: { cwd: string; history: string }): void {
    const data = this.readData();

    if (!data.projects[cwd]) {
      data.projects[cwd] = { history: [] };
    }

    data.projects[cwd].history.push(history);
    this.writeData(data);
  }

  getProjectLastAccessed({ cwd }: { cwd: string }): number | null {
    const data = this.readData();
    return data.projects[cwd]?.lastAccessed || null;
  }

  updateProjectLastAccessed({ cwd }: { cwd: string }): void {
    const data = this.readData();

    if (!data.projects[cwd]) {
      data.projects[cwd] = { history: [] };
    }

    data.projects[cwd].lastAccessed = Date.now();
    this.writeData(data);
  }
}
