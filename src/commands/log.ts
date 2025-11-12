import { exec } from 'child_process';
import fs from 'fs';
import { render, Box, Text } from 'ink';
import path from 'pathe';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { Context } from '../context';
import PaginatedGroupSelectInput from '../ui/PaginatedGroupSelectInput';

type SessionInfo = ReturnType<Context['paths']['getAllSessions']>[number];

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate(),
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

type AnyJson = Record<string, any>;

type NormalizedMessage = {
  type: 'message';
  uuid: string;
  parentUuid: string | null;
  role: string;
  content: any;
  timestamp?: string;
  uiContent?: string;
};

type RequestLogEntry =
  | ({ type: 'metadata'; timestamp: string; requestId: string } & AnyJson)
  | ({ type: 'chunk'; timestamp: string; requestId: string } & AnyJson);

function readJsonlFile(filePath: string): AnyJson[] {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n').filter(Boolean);
  const items: AnyJson[] = [];
  for (let i = 0; i < lines.length; i++) {
    try {
      items.push(JSON.parse(lines[i]!));
    } catch (e: any) {
      // skip invalid line
    }
  }
  return items;
}

function loadAllSessionMessages(logPath: string): NormalizedMessage[] {
  const items = readJsonlFile(logPath);
  return items.filter((i) => i && i.type === 'message') as NormalizedMessage[];
}

function loadAllRequestLogs(
  requestsDir: string,
  messages: NormalizedMessage[],
): {
  requestId: string;
  filePath: string;
  entries: RequestLogEntry[];
}[] {
  if (!fs.existsSync(requestsDir)) return [];
  const assistantUuids = new Set(
    messages
      .filter((m) => m.role === 'assistant')
      .map((m) => m.uuid)
      .filter(Boolean),
  );
  if (assistantUuids.size === 0) return [];

  const files = fs
    .readdirSync(requestsDir)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => path.join(requestsDir, f));

  const results: {
    requestId: string;
    filePath: string;
    entries: RequestLogEntry[];
  }[] = [];

  for (const file of files) {
    const requestId = path.basename(file, '.jsonl');
    if (!assistantUuids.has(requestId)) continue;
    const entries = readJsonlFile(file) as RequestLogEntry[];
    results.push({
      requestId,
      filePath: file,
      entries,
    });
  }

  return results;
}

function pretty(obj: any) {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

type RenderableItem =
  | { type: 'message'; message: NormalizedMessage; indent: false }
  | {
      type: 'tool-call';
      indent: true;
      id: string;
      name: string;
      input: Record<string, any>;
    }
  | {
      type: 'tool-result';
      indent: true;
      id: string;
      name: string;
      result: any;
      isError: boolean;
    };

function buildRenderableItems(messages: NormalizedMessage[]): RenderableItem[] {
  const items: RenderableItem[] = [];
  const toolResultsMap = new Map<
    string,
    { name: string; result: any; isError: boolean }
  >();

  for (const msg of messages) {
    if (msg.role === 'user' || msg.role === 'tool') {
      if (Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part.type === 'tool_result') {
            const isError =
              part.result &&
              typeof part.result === 'object' &&
              part.result.type === 'error';
            toolResultsMap.set(part.id, {
              name: part.name,
              result: part.result,
              isError,
            });
          } else if (part.type === 'tool-result') {
            const isError =
              part.result &&
              typeof part.result === 'object' &&
              part.result.type === 'error';
            toolResultsMap.set(part.toolCallId, {
              name: part.toolName,
              result: part.result,
              isError,
            });
          }
        }
      }
    }
  }

  for (const msg of messages) {
    items.push({ type: 'message', message: msg, indent: false });

    if (msg.role === 'assistant' && Array.isArray(msg.content)) {
      const toolUses = msg.content.filter(
        (
          part,
        ): part is {
          type: 'tool_use';
          id: string;
          name: string;
          input: Record<string, any>;
        } => part.type === 'tool_use',
      );

      for (const toolUse of toolUses) {
        items.push({
          type: 'tool-call',
          indent: true,
          id: toolUse.id,
          name: toolUse.name,
          input: toolUse.input,
        });

        const resultData = toolResultsMap.get(toolUse.id);
        if (resultData) {
          items.push({
            type: 'tool-result',
            indent: true,
            id: toolUse.id,
            name: resultData.name,
            result: resultData.result,
            isError: resultData.isError,
          });
        }
      }
    }
  }

  return items;
}

function buildHtml(opts: {
  sessionId: string;
  sessionLogPath: string;
  messages: NormalizedMessage[];
  requestLogs: ReturnType<typeof loadAllRequestLogs>;
}) {
  const { sessionId, sessionLogPath, messages, requestLogs } = opts;
  const title = `Session ${sessionId}`;

  const assistantMap: Record<string, string | null> = {};
  for (const m of messages) {
    if (m.role === 'assistant') {
      assistantMap[m.uuid] = m.uuid;
    }
  }

  const requestData: Record<string, { filePath: string; entries: AnyJson[] }> =
    {};
  for (const r of requestLogs) {
    requestData[r.requestId] = { filePath: r.filePath, entries: r.entries };
  }

  const messagesMap: Record<string, AnyJson> = {};
  for (const m of messages) {
    messagesMap[m.uuid] = m as AnyJson;
  }

  const renderableItems = buildRenderableItems(messages);

  const messagesHtml = renderableItems
    .map((item) => {
      if (item.type === 'message') {
        const m = item.message;
        const isRoot = m.parentUuid === null;
        const contentText =
          typeof m.content === 'string'
            ? m.content
            : Array.isArray(m.content)
              ? m.content
                  .filter((p: any) => p && typeof p.text === 'string')
                  .map((p: any) => p.text)
                  .join('')
              : JSON.stringify(m.content);
        const role = escapeHtml(m.role);
        const ts = m.timestamp ? formatDate(new Date(m.timestamp)) : '';
        const cls = `msg ${role} ${isRoot ? 'root' : ''}`;
        const dataAttrs =
          m.role === 'assistant' && assistantMap[m.uuid]
            ? `data-msg-uuid="${m.uuid}" data-request-id="${assistantMap[m.uuid]}"`
            : `data-msg-uuid="${m.uuid}"`;
        return `<div class="${cls}" ${dataAttrs}>
  <div class="meta">${role}${ts ? ` · ${escapeHtml(ts)}` : ''}${
    isRoot ? ' · root' : ''
  }</div>
  <div class="content">${escapeHtml(contentText || '')}</div>
</div>`;
      } else if (item.type === 'tool-call') {
        const inputStr = escapeHtml(pretty(item.input));
        return `<div class="msg tool-call indented">
  <div class="meta">🔧 Tool Call: ${escapeHtml(item.name)}</div>
  <div class="content"><pre>${inputStr}</pre></div>
</div>`;
      } else if (item.type === 'tool-result') {
        const resultContent =
          item.result && typeof item.result === 'object'
            ? item.result.content || item.result
            : item.result;
        const resultStr = escapeHtml(
          typeof resultContent === 'string'
            ? resultContent
            : pretty(resultContent),
        );
        const statusLabel = item.isError ? '✗' : '✓';
        return `<div class="msg tool-result indented ${item.isError ? 'error' : 'success'}">
  <div class="meta">${statusLabel} Tool Result: ${escapeHtml(item.name)}</div>
  <div class="content"><pre>${resultStr}</pre></div>
</div>`;
      }
      return '';
    })
    .join('\n');

  const style = `
    body { font-family: -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif; margin: 0; }
    .layout { display: grid; grid-template-columns: 1fr 1fr; height: 100vh; }
    header { padding: 12px 16px; border-bottom: 1px solid #eee; font-weight: 600; }
    .left { border-right: 1px solid #eee; overflow: auto; padding: 16px; }
    .right { overflow: auto; padding: 16px; }
    .msg { border: 1px solid #eee; border-radius: 6px; padding: 10px; margin-bottom: 10px; cursor: default; }
    .msg .meta { color: #666; font-size: 12px; margin-bottom: 6px; font-weight: 600; }
    .msg.user { background: #fafafa; }
    .msg.assistant { background: #f6fbff; cursor: pointer; }
    .msg.tool { background: #fff7f0; display: none; }
    .msg.root { outline: 1px dashed #ccc; }
    .msg.indented { margin-left: 32px; }
    .msg.tool-call { background: #fffbf0; border-left: 3px solid #f59e0b; }
    .msg.tool-result { background: #f0fdf4; border-left: 3px solid #10b981; }
    .msg.tool-result.error { background: #fef2f2; border-left: 3px solid #ef4444; }
    .msg.tool-call pre, .msg.tool-result pre { margin: 0; white-space: pre-wrap; word-break: break-word; font-size: 12px; }
    .details code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    .details pre { background: #fafafa; border: 1px solid #eee; padding: 8px; border-radius: 6px; overflow: auto; }
    .muted { color: #777; }
  `;

  const script = `
    const requestData = JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(requestData))}"));
    const messagesMap = JSON.parse(decodeURIComponent("${encodeURIComponent(JSON.stringify(messagesMap))}"));

    const right = document.getElementById('right');
    const state = { lastSelected: null };
    function renderDetails(requestId) {
      const d = requestId ? requestData[requestId] : null;
      const entries = d ? d.entries : [];
      const meta = entries.find(e => e.type === 'metadata') || null;
      const chunks = entries.filter(e => e.type === 'chunk');
      const pretty = (obj) => {
        try { return JSON.stringify(obj, null, 2); } catch { return String(obj); }
      };
      const html = ${JSON.stringify(
        `<div class="details">
          <div><b>Message JSON:</b></div>
          <pre><code>__MESSAGE__</code></pre>
          <hr/>
          <div><b>Request ID:</b> __REQUEST_ID__</div>
          <div class="muted">File: __FILE_PATH__</div>
          <hr/>
          <div><b>Model:</b> __MODEL__</div>
          <div><b>Tools:</b> __TOOLS__</div>
          <hr/>
          <div><b>Request:</b></div>
          <pre><code>__REQ__</code></pre>
          <div><b>Response:</b></div>
          <pre><code>__RES__</code></pre>
          <div><b>Error:</b></div>
          <pre><code>__ERR__</code></pre>
          <div><b>Chunks:</b></div>
          <pre><code>__CHUNKS__</code></pre>
        </div>`,
      )};
      const modelToString = (m) => {
        try {
          if (!m) return 'N/A';
          const provider = typeof m.provider === 'string' ? m.provider : (m.provider && m.provider.id) ? m.provider.id : '';
          const modelId = m.id || (m.model && m.model.id) || '';
          if (provider && modelId) return provider + ':' + modelId;
          return provider || modelId || 'N/A';
        } catch { return 'N/A'; }
      };
      const model = modelToString(meta && meta.model);
      const tools = meta && meta.tools ? meta.tools.map(t => t.name).join(', ') : 'N/A';
      const req = meta && meta.request ? meta.request : null;
      const res = meta && meta.response ? meta.response : null;
      const err = meta && meta.error ? meta.error : null;
      const finalHtml = html
        .replace('__MESSAGE__', pretty(state.lastMessage || null))
        .replace('__REQUEST_ID__', d ? String(requestId) : 'N/A')
        .replace('__FILE_PATH__', d ? String(d.filePath) : 'N/A')
        .replace('__MODEL__', String(model))
        .replace('__TOOLS__', String(tools))
        .replace('__REQ__', pretty(req))
        .replace('__RES__', pretty(res))
        .replace('__ERR__', pretty(err))
        .replace('__CHUNKS__', pretty(chunks));
      right.innerHTML = finalHtml;
    }
    document.getElementById('left').addEventListener('click', (e) => {
      let el = e.target;
      while (el && !el.classList?.contains('msg')) {
        el = el.parentElement;
      }
      if (!el) return;
      if (!el.classList.contains('assistant')) return;
      const reqId = el.getAttribute('data-request-id');
      const msgId = el.getAttribute('data-msg-uuid');
      state.lastSelected = reqId || null;
      state.lastMessage = msgId ? messagesMap[msgId] : null;
      renderDetails(state.lastSelected);
    });
    // Initial details placeholder
    right.innerHTML = '<div class="muted">Select an assistant message to see request details.</div>';
  `;

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${style}</style>
  </head>
  <body>
    <header>${escapeHtml(title)} · ${escapeHtml(sessionLogPath)}</header>
    <div class="layout">
      <div id="left" class="left">${messagesHtml}</div>
      <div id="right" class="right"></div>
    </div>
    <script>${script}</script>
  </body>
</html>`;
}

async function generateHtmlForSession(context: Context, sessionId: string) {
  const sessionLogPath = context.paths.getSessionLogPath(sessionId);
  const messages = loadAllSessionMessages(sessionLogPath);
  const requestsDir = path.join(path.dirname(sessionLogPath), 'requests');
  const requestLogs = loadAllRequestLogs(requestsDir, messages);

  const html = buildHtml({
    sessionId,
    sessionLogPath,
    messages,
    requestLogs,
  });

  const outDir = path.join(process.cwd(), '.log-outputs');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }
  const outPath = path.join(outDir, `session-${sessionId}.html`);
  fs.writeFileSync(outPath, html, 'utf-8');
  return outPath;
}

const LogUI: React.FC<{ context: Context }> = ({ context }) => {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [outputPath, setOutputPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const all = context.paths.getAllSessions();
      setSessions(all);
    } catch (e: any) {
      setError(e?.message || 'Failed to load sessions');
    }
  }, [context]);

  const groups = useMemo(() => {
    const items = sessions.map((s) => {
      const label = `${s.sessionId} · ${s.messageCount} msgs · ${formatDate(s.modified)}${
        s.summary ? ' · ' + s.summary : ''
      }`;
      return {
        name: label,
        modelId: s.sessionId,
        value: s.sessionId,
      };
    });
    return [
      {
        provider: 'Sessions',
        providerId: 'sessions',
        models: items,
      },
    ];
  }, [sessions]);

  const onSelect = useCallback(
    async (item: { value: string }) => {
      setSelected(item.value);
      try {
        const out = await generateHtmlForSession(context, item.value);
        setOutputPath(out);
        try {
          exec(`open ${JSON.stringify(out)}`);
        } catch (e) {
          // ignore open failures; user can open manually
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to generate HTML');
      }
    },
    [context],
  );

  if (error) {
    return React.createElement(
      Box,
      { flexDirection: 'column' as any },
      React.createElement(Text, { color: 'red' as any }, error),
    );
  }

  if (outputPath) {
    return React.createElement(
      Box,
      { flexDirection: 'column' as any },
      React.createElement(Text, null, 'HTML generated:'),
      React.createElement(Text, { color: 'green' as any }, outputPath),
      React.createElement(
        Text,
        { dimColor: true as any },
        'Open this file in your browser to view session logs.',
      ),
    );
  }

  return React.createElement(
    Box,
    { flexDirection: 'column' as any },
    React.createElement(Text, null, 'Select a session to view logs:'),
    React.createElement(PaginatedGroupSelectInput as any, {
      groups: groups as any,
      itemsPerPage: 10,
      enableSearch: true,
      onSelect,
    }),
    selected
      ? React.createElement(
          Box,
          { marginTop: 1 as any },
          React.createElement(
            Text,
            { dimColor: true as any },
            `Generating HTML for session ${selected}...`,
          ),
        )
      : null,
  );
};

export async function runLog(context: Context) {
  render(React.createElement(LogUI, { context }), {
    patchConsole: true,
    exitOnCtrlC: true,
  });
}
