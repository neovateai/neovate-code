interface CodeViewerBaseTabItem {
  id: string;
  title: string;
  language?: CodeViewerLanguage;
  path?: string;
}

export type CodeNormalViewerMode = 'new' | 'deleted';

export interface CodeNormalViewerTabItem extends CodeViewerBaseTabItem {
  code: string;
  viewType: 'normal';
  mode?: CodeNormalViewerMode;
}

export interface CodeDiffViewerTabItem extends CodeViewerBaseTabItem {
  originalCode: string;
  modifiedCode: string;
  diffStat?: DiffStat;
  viewType: 'diff';
  hideDiffActions?: boolean;
}

export type CodeViewerTabItem = CodeNormalViewerTabItem | CodeDiffViewerTabItem;

export type CodeViewerEditStatus = 'accept' | 'reject';

export interface DiffBlockStat {
  originalStartLineNumber: number;
  originalEndLineNumber: number;
  modifiedStartLineNumber: number;
  modifiedEndLineNumber: number;
  addLines: number;
  removeLines: number;
}

export interface DiffStat {
  /** 修改前行数 */
  originalLines: number;
  /** 修改后行数 */
  modifiedLines: number;
  /** 新增的行数 */
  addLines: number;
  /** 减少的行数 */
  removeLines: number;
  diffBlockStats: DiffBlockStat[];
}

export interface CodeNormalViewerMetaInfo {
  lineCount: number;
  charCount: number;
}

export type CodeViewerLanguage =
  | 'abap'
  | 'apex'
  | 'azcli'
  | 'bat'
  | 'bicep'
  | 'c'
  | 'cameligo'
  | 'clojure'
  | 'coffeescript'
  | 'cpp'
  | 'csharp'
  | 'csp'
  | 'css'
  | 'dart'
  | 'dockerfile'
  | 'ecl'
  | 'elixir'
  | 'flow9'
  | 'freemarker2'
  | 'fsharp'
  | 'go'
  | 'graphql'
  | 'handlebars'
  | 'hcl'
  | 'html'
  | 'ini'
  | 'java'
  | 'javascript'
  | 'json'
  | 'julia'
  | 'kotlin'
  | 'less'
  | 'lexon'
  | 'liquid'
  | 'lua'
  | 'm3'
  | 'markdown'
  | 'mips'
  | 'msdax'
  | 'mysql'
  | 'objective-c'
  | 'pascal'
  | 'pascaligo'
  | 'perl'
  | 'pgsql'
  | 'php'
  | 'pla'
  | 'postiats'
  | 'powerquery'
  | 'powershell'
  | 'proto'
  | 'pug'
  | 'python'
  | 'qsharp'
  | 'r'
  | 'razor'
  | 'redis'
  | 'redshift'
  | 'restructuredtext'
  | 'ruby'
  | 'rust'
  | 'sb'
  | 'scala'
  | 'scheme'
  | 'scss'
  | 'shell'
  | 'sol'
  | 'aes'
  | 'sparql'
  | 'sql'
  | 'st'
  | 'swift'
  | 'systemverilog'
  | 'tcl'
  | 'twig'
  | 'typescript'
  | 'vb'
  | 'verilog'
  | 'xml'
  | 'yaml';
