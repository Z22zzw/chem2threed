// 前端交互逻辑
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input') as HTMLTextAreaElement;
const sendBtn = document.getElementById('btn-send') as HTMLButtonElement;
const uploadBtn = document.getElementById('btn-upload') as HTMLButtonElement;
const fileInput = document.getElementById('file-input') as HTMLInputElement;
const attachmentsEl = document.getElementById('attachments');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const sidePlaceholder = document.getElementById('side-placeholder');
const previewContainer = document.getElementById('preview-container');
const previewFrame = document.getElementById('preview-frame') as HTMLIFrameElement;
const previewLink = document.getElementById('preview-link') as HTMLAnchorElement;
const deployResult = document.getElementById('deploy-result');
const deployUrl = document.getElementById('deploy-url') as HTMLAnchorElement;
const btnCopyUrl = document.getElementById('btn-copy-url') as HTMLButtonElement;
const btnFullscreen = document.getElementById('btn-fullscreen') as HTMLButtonElement;
const btnHistory = document.getElementById('btn-history') as HTMLButtonElement;
const historyModal = document.getElementById('history-modal');
const btnCloseHistory = document.getElementById('btn-close-history');
const historyList = document.getElementById('history-list');

let messages: Array<{ role: string; content: string }> = [];
let attachments: Array<{ type: string; path: string; extractedText?: string; name: string }> = [];
let isProcessing = false;

function setStatus(state: 'idle' | 'busy' | 'error', text: string) {
  statusDot.className = 'status-dot' + (state === 'busy' ? ' busy' : state === 'error' ? ' error' : '');
  statusText.textContent = text;
}

function addMessage(role: 'user' | 'assistant', content: string) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = `
    <div class="msg-avatar">${role === 'user' ? '我' : 'AI'}</div>
    <div class="msg-content"><p>${escapeHtml(content)}</p></div>
  `;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function addToolIndicator(toolName: string, args?: any) {
  const div = document.createElement('div');
  div.className = 'msg assistant';
  const labels: Record<string, string> = {
    parseInput: '正在解析您的需求...',
    clarify: '需要确认一些细节',
    generate: '正在生成3D模型代码...',
    deploy: '正在部署到 EdgeOne...',
  };
  div.innerHTML = `
    <div class="msg-avatar">AI</div>
    <div class="msg-content">
      <div class="tool-indicator"><span class="dot"></span>${labels[toolName] || toolName}</div>
    </div>
  `;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text || isProcessing) return;

  isProcessing = true;
  sendBtn.disabled = true;
  inputEl.value = '';
  inputEl.style.height = 'auto';

  addMessage('user', text);
  messages.push({ role: 'user', content: text });

  // 组装附件
  const attachPayload = attachments.map(a => ({
    type: a.type,
    path: a.path,
    extractedText: a.extractedText,
  }));

  // 清空附件显示
  attachments = [];
  renderAttachments();

  setStatus('busy', '正在思考...');

  // 创建 assistant 消息占位
  const assistantDiv = addMessage('assistant', '');
  const contentP = assistantDiv.querySelector('.msg-content p') as HTMLElement;
  contentP.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span>';

  let fullText = '';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, attachments: attachPayload }),
    });

    if (!response.ok) throw new Error('请求失败: ' + response.status);

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEvent = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          const data = line.slice(5).trim();
          try {
            const parsed = JSON.parse(data);
            handleSSEEvent(currentEvent, parsed, contentP, () => { fullText = ''; });
          } catch {}
        }
      }
    }

    setStatus('idle', '就绪');
  } catch (err: any) {
    contentP.textContent = '出错了：' + err.message;
    setStatus('error', '错误');
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
  }
}

function handleSSEEvent(event: string, data: any, contentP: HTMLElement, resetText: () => void) {
  switch (event) {
    case 'text':
      // 移除 typing indicator
      const typing = contentP.querySelector('.typing-indicator');
      if (typing) typing.remove();
      contentP.textContent += data.content;
      messagesEl.scrollTop = messagesEl.scrollHeight;
      break;

    case 'tool_call':
      addToolIndicator(data.tool, data.args);
      if (data.tool === 'generate') setStatus('busy', '生成3D模型中...');
      if (data.tool === 'deploy') setStatus('busy', '部署中...');
      if (data.tool === 'parseInput') setStatus('busy', '解析需求中...');
      break;

    case 'tool_result':
      if (data.tool === 'generate' && data.result?.success) {
        showPreview(data.result.previewUrl);
      }
      if (data.tool === 'deploy' && data.result?.success) {
        showDeployResult(data.result.url);
      }
      break;

    case 'done':
      if (data.url) {
        showDeployResult(data.url);
      }
      // 保存到 messages
      const lastAssistant = messagesEl.querySelector('.msg.assistant:last-of-type .msg-content p') as HTMLElement;
      if (lastAssistant && lastAssistant.textContent) {
        messages.push({ role: 'assistant', content: lastAssistant.textContent });
      }
      break;

    case 'error':
      const errTyping = contentP.querySelector('.typing-indicator');
      if (errTyping) errTyping.remove();
      contentP.textContent += '\n[错误] ' + data.message;
      setStatus('error', data.message);
      break;
  }
}

function showPreview(url: string) {
  sidePlaceholder.style.display = 'none';
  previewContainer.style.display = 'flex';
  deployResult.style.display = 'none';
  const fullUrl = url.startsWith('http') ? url : window.location.origin + url;
  previewFrame.src = fullUrl;
  previewLink.href = fullUrl;
}

function showDeployResult(url: string) {
  deployResult.style.display = 'block';
  deployUrl.href = url;
  deployUrl.textContent = url;
}

function renderAttachments() {
  attachmentsEl.innerHTML = '';
  attachments.forEach((a, i) => {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    chip.innerHTML = `${escapeHtml(a.name)} <span class="remove" data-idx="${i}">&times;</span>`;
    attachmentsEl.appendChild(chip);
  });
  attachmentsEl.querySelectorAll('.remove').forEach(el => {
    el.addEventListener('click', (e) => {
      const idx = parseInt((e.target as HTMLElement).getAttribute('data-idx')!);
      attachments.splice(idx, 1);
      renderAttachments();
    });
  });
}

uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
  for (const file of Array.from(fileInput.files || [])) {
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
        continue;
      }
      attachments.push({
        type: file.type.startsWith('image/') ? 'image' : 'file',
        path: data.path,
        extractedText: data.extractedText,
        name: file.name,
      });
    } catch (err: any) {
      alert('上传失败: ' + err.message);
    }
  }
  renderAttachments();
  fileInput.value = '';
});

sendBtn.addEventListener('click', sendMessage);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

inputEl.addEventListener('input', () => {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
});

btnCopyUrl.addEventListener('click', () => {
  navigator.clipboard.writeText(deployUrl.href);
  btnCopyUrl.textContent = '已复制';
  setTimeout(() => { btnCopyUrl.textContent = '复制链接'; }, 2000);
});

btnFullscreen.addEventListener('click', () => {
  if (previewFrame.requestFullscreen) previewFrame.requestFullscreen();
});

btnHistory.addEventListener('click', async () => {
  historyModal.style.display = 'flex';
  historyList.innerHTML = '<p>加载中...</p>';
  try {
    const res = await fetch('/api/history');
    const data = await res.json();
    if (!data.history || data.history.length === 0) {
      historyList.innerHTML = '<p style="color:#6e6e73">暂无历史记录</p>';
      return;
    }
    historyList.innerHTML = '';
    data.history.forEach((item: any) => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = `
        <div class="title">${escapeHtml(item.title)}</div>
        <div class="meta">${new Date(item.timestamp).toLocaleString('zh-CN')} · ${item.template}${item.outputUrl ? ' · <a href="' + item.outputUrl + '" target="_blank">查看</a>' : ''}</div>
      `;
      if (item.outputUrl) {
        div.addEventListener('click', () => {
          window.open(item.outputUrl, '_blank');
        });
      }
      historyList.appendChild(div);
    });
  } catch (err) {
    historyList.innerHTML = '<p>加载失败</p>';
  }
});

btnCloseHistory.addEventListener('click', () => {
  historyModal.style.display = 'none';
});

historyModal.addEventListener('click', (e) => {
  if (e.target === historyModal) historyModal.style.display = 'none';
});
