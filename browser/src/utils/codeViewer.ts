import type { CodeViewerLanguage, DiffStat } from '@/types/codeViewer';

// Simple line-by-line diff algorithm
function computeLineDiff(originalLines: string[], modifiedLines: string[]) {
  const diffBlocks = [];
  let originalIndex = 0;
  let modifiedIndex = 0;

  while (
    originalIndex < originalLines.length ||
    modifiedIndex < modifiedLines.length
  ) {
    // Find the start of a difference
    while (
      originalIndex < originalLines.length &&
      modifiedIndex < modifiedLines.length &&
      originalLines[originalIndex] === modifiedLines[modifiedIndex]
    ) {
      originalIndex++;
      modifiedIndex++;
    }

    if (
      originalIndex >= originalLines.length &&
      modifiedIndex >= modifiedLines.length
    ) {
      break;
    }

    const blockStart = {
      original: originalIndex,
      modified: modifiedIndex,
    };

    // Find the end of the difference
    let originalEnd = originalIndex;
    let modifiedEnd = modifiedIndex;

    // Simple heuristic: advance until we find matching lines or reach the end
    while (
      (originalEnd < originalLines.length ||
        modifiedEnd < modifiedLines.length) &&
      (originalEnd >= originalLines.length ||
        modifiedEnd >= modifiedLines.length ||
        originalLines[originalEnd] !== modifiedLines[modifiedEnd])
    ) {
      if (originalEnd < originalLines.length) originalEnd++;
      if (modifiedEnd < modifiedLines.length) modifiedEnd++;
    }

    diffBlocks.push({
      originalStartLineNumber: blockStart.original + 1,
      originalEndLineNumber: originalEnd,
      modifiedStartLineNumber: blockStart.modified + 1,
      modifiedEndLineNumber: modifiedEnd,
      addLines: modifiedEnd - blockStart.modified,
      removeLines: originalEnd - blockStart.original,
    });

    originalIndex = originalEnd;
    modifiedIndex = modifiedEnd;
  }

  return diffBlocks;
}

export async function diff(
  original: string,
  modified: string,
): Promise<DiffStat> {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');

  const diffBlockStats = computeLineDiff(originalLines, modifiedLines);

  const addLines = diffBlockStats.reduce(
    (sum, block) => sum + block.addLines,
    0,
  );
  const removeLines = diffBlockStats.reduce(
    (sum, block) => sum + block.removeLines,
    0,
  );

  return {
    addLines,
    removeLines,
    diffBlockStats,
    originalLines: originalLines.length,
    modifiedLines: modifiedLines.length,
  };
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
