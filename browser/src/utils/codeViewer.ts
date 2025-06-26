import * as monaco from 'monaco-editor';
import type { CodeViewerLanguage, DiffStat } from '@/types/codeViewer';

async function computeDiff(original: string, modified: string) {
  const element = document.createElement('div');

  const editor = monaco.editor.createDiffEditor(element);

  const originalModel = monaco.editor.createModel(original);
  const modifiedModel = monaco.editor.createModel(modified);

  editor.setModel({
    original: originalModel,
    modified: modifiedModel,
  });

  const diffReady = new Promise<{
    changes: monaco.editor.ILineChange[];
    lines: { original: number; modified: number };
  }>((resolve) => {
    const disposable = editor.onDidUpdateDiff(() => {
      disposable.dispose(); // 确保只触发一次
      const changes = editor.getLineChanges() || [];
      const lines = {
        original: originalModel.getLineCount(),
        modified: modifiedModel.getLineCount(),
      };

      editor.dispose();
      originalModel.dispose();
      modifiedModel.dispose();
      resolve({ changes, lines });
    });
  });

  return diffReady;
}

export async function diff(
  original: string,
  modified: string,
): Promise<DiffStat> {
  const rawDiff = await computeDiff(original, modified);

  const diffResult: DiffStat = {
    addLines: 0,
    removeLines: 0,
    diffBlockStats: [],
    originalLines: rawDiff.lines.original,
    modifiedLines: rawDiff.lines.modified,
  };

  for (const rawDiffItem of rawDiff.changes) {
    const {
      modifiedEndLineNumber,
      modifiedStartLineNumber,
      originalEndLineNumber,
      originalStartLineNumber,
    } = rawDiffItem;

    diffResult.addLines +=
      modifiedEndLineNumber > 0
        ? modifiedEndLineNumber - modifiedStartLineNumber + 1
        : 0;

    diffResult.removeLines +=
      originalEndLineNumber > 0
        ? originalEndLineNumber - originalStartLineNumber + 1
        : 0;

    diffResult.diffBlockStats.push({
      modifiedEndLineNumber,
      modifiedStartLineNumber,
      originalEndLineNumber,
      originalStartLineNumber,
      addLines:
        modifiedEndLineNumber > 0
          ? modifiedEndLineNumber - modifiedStartLineNumber + 1
          : 0,
      removeLines:
        originalEndLineNumber > 0
          ? originalEndLineNumber - originalStartLineNumber + 1
          : 0,
    });
  }

  return diffResult;
}

const extToLanguage: Record<string, CodeViewerLanguage> = {
  abap: 'abap',
  apex: 'apex',
  azcli: 'azcli',
  bat: 'bat',
  bicep: 'bicep',
  c: 'c',
  caml: 'cameligo',
  clj: 'clojure',
  coffee: 'coffeescript',
  cson: 'coffeescript',
  cpp: 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  h: 'cpp',
  hpp: 'cpp',
  cs: 'csharp',
  csp: 'csp',
  css: 'css',
  dart: 'dart',
  dockerfile: 'dockerfile',
  docker: 'dockerfile',
  ecl: 'ecl',
  ex: 'elixir',
  exs: 'elixir',
  f9: 'flow9',
  ftl: 'freemarker2',
  fs: 'fsharp',
  go: 'go',
  gql: 'graphql',
  graphql: 'graphql',
  hbs: 'handlebars',
  handlebars: 'handlebars',
  hcl: 'hcl',
  html: 'html',
  ini: 'ini',
  java: 'java',
  js: 'javascript',
  jsx: 'javascript',
  json: 'json',
  jl: 'julia',
  kt: 'kotlin',
  kts: 'kotlin',
  less: 'less',
  lexon: 'lexon',
  liquid: 'liquid',
  lua: 'lua',
  m3: 'm3',
  md: 'markdown',
  markdown: 'markdown',
  mips: 'mips',
  dax: 'msdax',
  sql: 'sql',
  mysql: 'mysql',
  m: 'objective-c',
  mm: 'objective-c',
  pas: 'pascal',
  p: 'pascal',
  pascaligo: 'pascaligo',
  pl: 'perl',
  pgsql: 'pgsql',
  php: 'php',
  pla: 'pla',
  ats: 'postiats',
  pq: 'powerquery',
  ps1: 'powershell',
  proto: 'proto',
  pug: 'pug',
  py: 'python',
  qsharp: 'qsharp',
  r: 'r',
  razor: 'razor',
  redis: 'redis',
  redshift: 'redshift',
  rst: 'restructuredtext',
  rb: 'ruby',
  rs: 'rust',
  sb: 'sb',
  scala: 'scala',
  scm: 'scheme',
  scss: 'scss',
  sh: 'shell',
  bash: 'shell',
  zsh: 'shell',
  sol: 'sol',
  aes: 'aes',
  sparql: 'sparql',
  st: 'st',
  swift: 'swift',
  sv: 'systemverilog',
  v: 'verilog',
  tcl: 'tcl',
  twig: 'twig',
  ts: 'typescript',
  tsx: 'typescript',
  vb: 'vb',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
};

export function inferFileType(path?: string): CodeViewerLanguage | undefined {
  if (!path) {
    return;
  }
  const suffix = path.split('.').pop()?.toLowerCase();
  if (!suffix) {
    return;
  }
  // special
  if (['cjs', 'mjs'].includes(suffix)) {
    return 'javascript';
  }

  if (['cts', 'mts'].includes(suffix)) {
    return 'typescript';
  }

  return extToLanguage[suffix];
}
