import * as vscode from 'vscode';

class MemFS implements vscode.FileSystemProvider {
  private files = new Map<string, Uint8Array>();
  private emitter = new vscode.EventEmitter<vscode.FileChangeEvent[]>();
  onDidChangeFile = this.emitter.event;

  stat(uri: vscode.Uri): vscode.FileStat {
    if (this.files.has(uri.path)) {
      return {
        type: vscode.FileType.File,
        ctime: Date.now(),
        mtime: Date.now(),
        size: this.files.get(uri.path)!.length,
      };
    }
    throw vscode.FileSystemError.FileNotFound(uri);
  }

  readFile(uri: vscode.Uri): Uint8Array {
    const data = this.files.get(uri.path);
    if (data) {
      return data;
    }
    throw vscode.FileSystemError.FileNotFound(uri);
  }

  writeFile(
    uri: vscode.Uri,
    content: Uint8Array,
    options: { create: boolean; overwrite: boolean },
  ): void {
    this.files.set(uri.path, content);
    this.emitter.fire([{ type: vscode.FileChangeType.Changed, uri }]);
  }

  watch(
    uri: vscode.Uri,
    options: { recursive: boolean; excludes: string[] },
  ): vscode.Disposable {
    return new vscode.Disposable(() => {});
  }
  readDirectory(uri: vscode.Uri): [string, vscode.FileType][] {
    throw vscode.FileSystemError.FileNotFound(uri);
  }
  createDirectory(uri: vscode.Uri): void {
    throw vscode.FileSystemError.Unavailable();
  }
  delete(uri: vscode.Uri, options: { recursive: boolean }): void {
    throw vscode.FileSystemError.Unavailable();
  }
  rename(
    oldUri: vscode.Uri,
    newUri: vscode.Uri,
    options: { overwrite: boolean },
  ): void {
    throw vscode.FileSystemError.Unavailable();
  }
}

export const memFs = new MemFS();

export async function openDiff(params: any) {
  console.log('[Tools] openDiff called with params:', params);
  const { old_file_path, new_file_path, new_file_contents, tab_name } = params;

  if (!old_file_path || !new_file_path || !new_file_contents || !tab_name) {
    console.error('[Tools] openDiff missing parameters:', {
      old_file_path,
      new_file_path,
      new_file_contents,
      tab_name,
    });
    throw new Error('Missing parameters for openDiff');
  }

  console.log('[Tools] openDiff creating URIs...');
  const leftUri = vscode.Uri.file(old_file_path);
  const rightUri = vscode.Uri.parse(`memfs:/${new_file_path}`);
  console.log('[Tools] openDiff URIs created:', {
    leftUri: leftUri.toString(),
    rightUri: rightUri.toString(),
  });

  console.log('[Tools] openDiff writing file to memfs...');
  memFs.writeFile(rightUri, Buffer.from(new_file_contents, 'utf8'), {
    create: true,
    overwrite: true,
  });
  console.log('[Tools] openDiff file written to memfs successfully');

  console.log('[Tools] openDiff executing vscode.diff command...');
  await vscode.commands.executeCommand(
    'vscode.diff',
    leftUri,
    rightUri,
    tab_name,
  );
  console.log('[Tools] openDiff command executed successfully');

  const result = { success: true, message: `Diff opened for ${tab_name}` };
  console.log('[Tools] openDiff returning result:', result);
  return result;
}

export async function openFile(params: any) {
  console.log('[Tools] openFile called with params:', params);
  const { filePath } = params;

  if (!filePath) {
    console.error('[Tools] openFile missing filePath parameter');
    throw new Error('Missing filePath');
  }

  console.log('[Tools] openFile opening document:', filePath);
  const doc = await vscode.workspace.openTextDocument(
    vscode.Uri.file(filePath),
  );
  console.log('[Tools] openFile document opened, showing in editor...');

  await vscode.window.showTextDocument(doc);
  console.log('[Tools] openFile document shown in editor successfully');

  const result = { success: true, filePath };
  console.log('[Tools] openFile returning result:', result);
  return result;
}

export function getDiagnostics() {
  console.log('[Tools] getDiagnostics called');
  const diagnosticsByFile = vscode.languages.getDiagnostics();
  console.log(
    '[Tools] getDiagnostics found diagnostics for',
    diagnosticsByFile.length,
    'files',
  );

  const result = diagnosticsByFile.map(([uri, diagnostics]) => {
    console.log(
      '[Tools] getDiagnostics processing file:',
      uri.toString(),
      'with',
      diagnostics.length,
      'diagnostics',
    );
    return {
      uri: uri.toString(),
      diagnostics: diagnostics.map((d) => ({
        message: d.message,
        severity: vscode.DiagnosticSeverity[d.severity],
        range: d.range,
      })),
    };
  });

  console.log(
    '[Tools] getDiagnostics returning result with',
    result.length,
    'files',
  );
  return { diagnostics: result };
}

export function getOpenEditors() {
  console.log('[Tools] getOpenEditors called');
  const visibleEditors = vscode.window.visibleTextEditors;
  console.log(
    '[Tools] getOpenEditors found',
    visibleEditors.length,
    'visible editors',
  );

  const editors = visibleEditors.map((editor) => {
    const result = {
      filePath: editor.document.uri.fsPath,
      isActive: editor === vscode.window.activeTextEditor,
    };
    console.log('[Tools] getOpenEditors processing editor:', result);
    return result;
  });

  console.log('[Tools] getOpenEditors returning', editors.length, 'editors');
  return { editors };
}

export function getWorkspaceFolders() {
  console.log('[Tools] getWorkspaceFolders called');
  const workspaceFolders = vscode.workspace.workspaceFolders || [];
  console.log(
    '[Tools] getWorkspaceFolders found',
    workspaceFolders.length,
    'workspace folders',
  );

  const folders = workspaceFolders.map((folder) => {
    const result = {
      name: folder.name,
      uri: folder.uri.toString(),
    };
    console.log('[Tools] getWorkspaceFolders processing folder:', result);
    return result;
  });

  console.log(
    '[Tools] getWorkspaceFolders returning',
    folders.length,
    'folders',
  );
  return { folders };
}

export function getCurrentSelection() {
  console.log('[Tools] getCurrentSelection called');
  const editor = vscode.window.activeTextEditor;

  if (!editor) {
    console.log('[Tools] getCurrentSelection no active text editor');
    return { error: 'No active text editor' };
  }

  const { selection, document } = editor;
  console.log('[Tools] getCurrentSelection active editor found:', {
    filePath: document.uri.fsPath,
    selectionStart: selection.start,
    selectionEnd: selection.end,
    isEmpty: selection.isEmpty,
  });

  const result = {
    filePath: document.uri.fsPath,
    text: document.getText(selection),
    selection,
  };

  console.log('[Tools] getCurrentSelection returning:', {
    filePath: result.filePath,
    textLength: result.text.length,
    selection: result.selection,
  });

  return result;
}

let lastSelection: any = null;
vscode.window.onDidChangeTextEditorSelection((e) => {
  const { selection, document } = e.textEditor;
  lastSelection = {
    filePath: document.uri.fsPath,
    text: document.getText(selection),
    selection,
  };
  console.log('[Tools] Selection changed:', {
    filePath: lastSelection.filePath,
    textLength: lastSelection.text.length,
    selection: lastSelection.selection,
  });
});

export function getLatestSelection() {
  console.log('[Tools] getLatestSelection called');

  if (!lastSelection) {
    console.log('[Tools] getLatestSelection no selection available');
    return { error: 'No selection has been made yet.' };
  }

  console.log('[Tools] getLatestSelection returning cached selection:', {
    filePath: lastSelection.filePath,
    textLength: lastSelection.text.length,
    selection: lastSelection.selection,
  });

  return lastSelection;
}

export async function closeTab(params: any) {
  console.log('[Tools] closeTab called with params:', params);
  const { tab_name } = params;

  if (!tab_name) {
    console.error('[Tools] closeTab missing tab_name parameter');
    throw new Error('Missing tab_name');
  }

  console.log('[Tools] closeTab searching for tab:', tab_name);
  const allTabGroups = vscode.window.tabGroups.all;
  console.log('[Tools] closeTab found', allTabGroups.length, 'tab groups');

  for (const tabGroup of allTabGroups) {
    console.log(
      '[Tools] closeTab checking tab group with',
      tabGroup.tabs.length,
      'tabs',
    );
    for (const tab of tabGroup.tabs) {
      console.log('[Tools] closeTab checking tab:', tab.label);
      if (tab.label === tab_name) {
        console.log('[Tools] closeTab found matching tab, closing...');
        await vscode.window.tabGroups.close(tab);
        const result = { success: true, message: `Closed tab: ${tab_name}` };
        console.log('[Tools] closeTab successfully closed tab:', result);
        return result;
      }
    }
  }

  const result = { success: false, message: `Tab not found: ${tab_name}` };
  console.log('[Tools] closeTab tab not found:', result);
  return result;
}

export async function closeAllDiffTabs() {
  console.log('[Tools] closeAllDiffTabs called');
  let count = 0;
  const allTabGroups = vscode.window.tabGroups.all;
  console.log(
    '[Tools] closeAllDiffTabs found',
    allTabGroups.length,
    'tab groups',
  );

  for (const tabGroup of allTabGroups) {
    console.log(
      '[Tools] closeAllDiffTabs checking tab group with',
      tabGroup.tabs.length,
      'tabs',
    );
    for (const tab of tabGroup.tabs) {
      console.log(
        '[Tools] closeAllDiffTabs checking tab:',
        tab.label,
        'input type:',
        tab.input?.constructor.name,
      );
      if (tab.input instanceof vscode.TabInputTextDiff) {
        console.log(
          '[Tools] closeAllDiffTabs found diff tab, closing:',
          tab.label,
        );
        await vscode.window.tabGroups.close(tab);
        count++;
      }
    }
  }

  const result = { success: true, closedCount: count };
  console.log('[Tools] closeAllDiffTabs closed', count, 'diff tabs:', result);
  return result;
}
