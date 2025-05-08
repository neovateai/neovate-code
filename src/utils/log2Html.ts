export function log2Html(logData: any): string {
  const renderMarkdown = (text: string) => {
    return text
      .replace(/\n/g, '<br>')
      .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>');
  };

  const processJsonValue = (value: any): any => {
    if (typeof value === 'string') {
      return renderMarkdown(value);
    } else if (Array.isArray(value)) {
      return value.map((item) => processJsonValue(item));
    } else if (value && typeof value === 'object') {
      const processed: any = {};
      for (const [key, val] of Object.entries(value)) {
        processed[key] = processJsonValue(val);
      }
      return processed;
    }
    return value;
  };

  const formatContent = (content: string) => {
    try {
      const jsonObj = JSON.parse(content);
      const processedJson = processJsonValue(jsonObj);
      return `<pre class="json-content">${JSON.stringify(processedJson, null, 2)}</pre>`;
    } catch {
      return renderMarkdown(content);
    }
  };

  const getModelDisplay = (model: any) => {
    if (typeof model === 'object' && model !== null) {
      return model.modelId;
    }
    return model;
  };

  const formatDuration = (ms: number) => {
    const seconds = (ms / 1000).toFixed(2);
    return `${seconds}s`;
  };

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Log Viewer</title>
  <style>
    :root {
      --primary-color: #2563eb;
      --secondary-color: #3b82f6;
      --background-color: #f8fafc;
      --card-background: #ffffff;
      --text-color: #1e293b;
      --border-color: #e2e8f0;
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      padding: 2rem;
      background: var(--background-color);
      color: var(--text-color);
    }
    
    .container { max-width: 1200px; margin: 0 auto; }
    
    .section {
      background: var(--card-background);
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    
    .section-title {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 1rem;
      color: var(--primary-color);
    }
    
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }
    
    .card {
      background: var(--card-background);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1rem;
    }
    
    .card-title {
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    
    .chat-container {
      margin-top: 1rem;
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    
    .message {
      padding: 0.75rem;
      margin-bottom: 0.5rem;
      border-radius: 8px;
      max-width: 80%;
      position: relative;
    }
    
    .user-message {
      background: var(--primary-color);
      color: white;
      margin-left: auto;
      border-bottom-right-radius: 2px;
    }
    
    .assistant-message {
      background: var(--secondary-color);
      color: white;
      border-bottom-left-radius: 2px;
    }

    .message-header {
      font-size: 0.75rem;
      margin-bottom: 0.25rem;
      opacity: 0.8;
    }

    .message-content {
      word-break: break-word;
      white-space: pre-wrap;
      line-height: 1.5;
    }

    .message-content p { margin: 0.5em 0; }

    .message-content code {
      background: rgba(0, 0, 0, 0.1);
      padding: 0.2em 0.4em;
      border-radius: 3px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.9em;
    }

    .message-content pre {
      background: rgba(0, 0, 0, 0.1);
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
      margin: 0.5em 0;
    }

    .message-content pre code {
      background: none;
      padding: 0;
    }

    .message-content ul, .message-content ol {
      margin: 0.5em 0;
      padding-left: 1.5em;
    }

    .message-content li { margin: 0.25em 0; }

    .message-content blockquote {
      border-left: 3px solid rgba(255, 255, 255, 0.3);
      margin: 0.5em 0;
      padding-left: 1em;
      color: rgba(255, 255, 255, 0.9);
    }

    .message-content table {
      border-collapse: collapse;
      margin: 0.5em 0;
      width: 100%;
    }

    .message-content th, .message-content td {
      border: 1px solid rgba(255, 255, 255, 0.2);
      padding: 0.5em;
      text-align: left;
    }

    .message-content th { background: rgba(255, 255, 255, 0.1); }

    .message-content a {
      color: #fff;
      text-decoration: underline;
    }

    .message-content img {
      max-width: 100%;
      border-radius: 4px;
    }

    .message-content hr {
      border: none;
      border-top: 1px solid rgba(255, 255, 255, 0.2);
      margin: 1em 0;
    }

    .json-content {
      background: rgba(0, 0, 0, 0.1);
      padding: 1em;
      border-radius: 6px;
      overflow-x: auto;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 0.9em;
      white-space: pre;
    }

    .tools-list {
      display: flex;
      flex-wrap: wrap;
      gap: 0.5rem;
      margin-top: 0.5rem;
      max-height: 0;
      overflow: hidden;
      transition: max-height 0.3s ease-out;
    }

    .tools-list.expanded { max-height: 500px; }

    .tool-tag {
      background: #e2e8f0;
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.75rem;
    }

    .tools-toggle {
      color: var(--primary-color);
      cursor: pointer;
      font-size: 0.875rem;
      margin-top: 0.5rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .tools-toggle:hover { text-decoration: underline; }

    .tools-toggle::after {
      content: '▼';
      font-size: 0.75rem;
      transition: transform 0.3s ease;
    }

    .tools-toggle.collapsed::after { transform: rotate(-90deg); }

    .timestamp {
      font-size: 0.875rem;
      color: #64748b;
      margin-bottom: 0.5rem;
    }

    .duration {
      font-size: 0.875rem;
      color: #64748b;
      margin-top: 0.5rem;
    }
  </style>
  <script>
    function toggleTools(element) {
      const toolsList = element.nextElementSibling;
      const isExpanded = toolsList.classList.toggle('expanded');
      element.classList.toggle('collapsed', !isExpanded);
    }
  </script>
</head>
<body>
  <div class="container">
    <div class="section">
      <h2 class="section-title">Session</h2>
      <div class="grid">
        <div class="card">
          <div class="card-title">Start Time</div>
          <div>${new Date(logData.session.startTime).toLocaleString()}</div>
        </div>
        <div class="card">
          <div class="card-title">Model</div>
          <div>${getModelDisplay(logData.session.resolvedConfig.model)}</div>
        </div>
        <div class="card">
          <div class="card-title">SmallModel</div>
          <div>${getModelDisplay(logData.session.resolvedConfig.smallModel)}</div>
        </div>
        <div class="card">
          <div class="card-title">Language</div>
          <div>${logData.session.resolvedConfig.language}</div>
        </div>
        <div class="card">
          <div class="card-title">ProductName</div>
          <div>${logData.session.resolvedConfig.productName}</div>
        </div>
        <div class="card">
          <div class="card-title">MCP Servers</div>
          <div>${Object.keys(logData.session.resolvedConfig.mcpConfig.mcpServers).join('、')}</div>
        </div>
      </div>
    </div>
    
    <div class="section">
      <h2 class="section-title">Queries</h2>
      ${Object.entries(logData.queries)
        .map(
          ([id, query]: [string, any]) => `
        <div class="card" style="margin-bottom: 1.5rem;">
          <div class="timestamp">Start: ${new Date(query.startTime).toLocaleString()}</div>
          <div class="chat-container">
            ${query.items
              .map((item: any) => {
                if (item.type === 'message' && item.data.role === 'user') {
                  return `
                  <div class="message user-message">
                    <div class="message-header">User</div>
                    <div class="message-content">${formatContent(item.data.content)}</div>
                  </div>`;
                } else if (
                  item.type === 'message' &&
                  item.data.role === 'assistant'
                ) {
                  return `
                  <div class="message assistant-message">
                    <div class="message-header">Assistant</div>
                    <div class="message-content">${formatContent(item.data.content)}</div>
                  </div>`;
                } else if (item.type === 'finalResponse') {
                  return `
                  <div class="message assistant-message">
                    <div class="message-header">Assistant</div>
                    <div class="message-content">${formatContent(item.data)}</div>
                  </div>`;
                }
                return '';
              })
              .join('')}
          </div>
          <div class="tools-toggle" onclick="toggleTools(this)">Tools</div>
          <div class="tools-list">
            ${query.tools
              .map(
                (tool: string) => `
              <span class="tool-tag">${tool}</span>
            `,
              )
              .join('')}
          </div>
          <div class="duration">Duration: ${formatDuration(query.duration)}</div>
        </div>
      `,
        )
        .join('')}
    </div>
  </div>
</body>
</html>`;
}
