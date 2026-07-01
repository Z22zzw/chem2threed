// 前端交互逻辑 - Makers 兼容版
const messagesEl = document.getElementById('messages');
const inputEl = document.getElementById('input');
const sendBtn = document.getElementById('btn-send');
const uploadBtn = document.getElementById('btn-upload');
const fileInput = document.getElementById('file-input');
const attachmentsEl = document.getElementById('attachments');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const sidePlaceholder = document.getElementById('side-placeholder');
const previewContainer = document.getElementById('preview-container');
const previewFrame = document.getElementById('preview-frame');
const previewLink = document.getElementById('preview-link');
const deployResult = document.getElementById('deploy-result');
const deployUrl = document.getElementById('deploy-url');
const btnCopyUrl = document.getElementById('btn-copy-url');
const btnFullscreen = document.getElementById('btn-fullscreen');
const btnHistory = document.getElementById('btn-history');
const historyModal = document.getElementById('history-modal');
const btnCloseHistory = document.getElementById('btn-close-history');
const historyList = document.getElementById('history-list');

let conversationId = localStorage.getItem('chemscene-cid') || ('cid-' + Date.now() + '-' + Math.random().toString(36).slice(2,8));
localStorage.setItem('chemscene-cid', conversationId);

let attachments = [];
let isProcessing = false;

function setStatus(state, text) {
  statusDot.className = 'status-dot' + (state === 'busy' ? ' busy' : state === 'error' ? ' error' : '');
  statusText.textContent = text;
}

function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = 'msg ' + role;
  div.innerHTML = '<div class="msg-avatar">' + (role === 'user' ? '我' : 'AI') + '</div>' +
    '<div class="msg-content"><p>' + escapeHtml(content) + '</p></div>';
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
  return div;
}

function addToolIndicator(toolName) {
  const div = document.createElement('div');
  div.className = 'msg assistant';
  const labels = {
    parse_input: '正在解析您的需求...',
    clarify: '需要确认一些细节',
    generate: '正在生成3D模型代码...',
    deploy: '正在部署到 EdgeOne...',
  };
  div.innerHTML = '<div class="msg-avatar">AI</div><div class="msg-content">' +
    '<div class="tool-indicator"><span class="dot"></span>' + (labels[toolName] || toolName) + '</div></div>';
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

  // 组装附件
  const attachPayload = attachments.map(a => ({
    type: a.type,
    extractedText: a.extractedText,
  }));
  attachments = [];
  renderAttachments();

  setStatus('busy', '正在思考...');

  const assistantDiv = addMessage('assistant', '');
  const contentP = assistantDiv.querySelector('.msg-content p');
  contentP.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span>';

  let fullText = '';
  let lastHtmlContent = '';

  try {
    const response = await fetch('/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'makers-conversation-id': conversationId,
      },
      body: JSON.stringify({
        message: text,
        conversation_id: conversationId,
        attachments: attachPayload,
      }),
    });

    if (!response.ok) throw new Error('请求失败: ' + response.status);

    const reader = response.body.getReader();
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
            handleSSEEvent(currentEvent, parsed, contentP);
          } catch {}
        }
      }
    }

    setStatus('idle', '就绪');
  } catch (err) {
    contentP.textContent = '出错了：' + err.message;
    setStatus('error', '错误');
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
  }
}

function handleSSEEvent(event, data, contentP) {
  switch (event) {
    case 'text':
      const typing = contentP.querySelector('.typing-indicator');
      if (typing) typing.remove();
      contentP.textContent += data.content;
      messagesEl.scrollTop = messagesEl.scrollHeight;
      break;

    case 'tool_call':
      addToolIndicator(data.tool);
      if (data.tool === 'generate') setStatus('busy', '生成3D模型中...');
      if (data.tool === 'deploy') setStatus('busy', '部署中...');
      if (data.tool === 'parse_input') setStatus('busy', '解析需求中...');
      break;

    case 'tool_result':
      if (data.tool === 'generate' && data.result && data.result.success) {
        lastHtmlContent = data.result.htmlContent || '';
        showPreview(lastHtmlContent);
      }
      if (data.tool === 'deploy' && data.result && data.result.success) {
        showDeployResult(data.result.url);
      }
      break;

    case 'done':
      break;

    case 'error':
      const errTyping = contentP.querySelector('.typing-indicator');
      if (errTyping) errTyping.remove();
      contentP.textContent += '\n[错误] ' + (data.message || '');
      setStatus('error', data.message || '错误');
      break;
  }
}

let lastHtmlContent = '';

function showPreview(htmlContent) {
  sidePlaceholder.style.display = 'none';
  previewContainer.style.display = 'flex';
  deployResult.style.display = 'none';
  previewFrame.srcdoc = htmlContent;
}

function showDeployResult(url) {
  deployResult.style.display = 'block';
  deployUrl.href = url;
  deployUrl.textContent = url;
}

function renderAttachments() {
  attachmentsEl.innerHTML = '';
  attachments.forEach((a, i) => {
    const chip = document.createElement('div');
    chip.className = 'attachment-chip';
    chip.innerHTML = escapeHtml(a.name) + ' <span class="remove" data-idx="' + i + '">&times;</span>';
    attachmentsEl.appendChild(chip);
  });
  attachmentsEl.querySelectorAll('.remove').forEach(el => {
    el.addEventListener('click', (e) => {
      const idx = parseInt(e.target.getAttribute('data-idx'));
      attachments.splice(idx, 1);
      renderAttachments();
    });
  });
}

uploadBtn.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', async () => {
  for (const file of Array.from(fileInput.files || [])) {
    // 前端直接读取文件内容
    try {
      let extractedText = '';
      if (file.type.startsWith('text/') || file.name.match(/\.(txt|md|json|csv)$/i)) {
        extractedText = await file.text();
      } else {
        extractedText = '[' + file.name + ' 文件已上传，请在对话中描述内容]';
      }
      attachments.push({
        type: file.type.startsWith('image/') ? 'image' : 'file',
        extractedText: extractedText.slice(0, 8000),
        name: file.name,
      });
    } catch (err) {
      alert('读取文件失败: ' + err.message);
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
    const res = await fetch('/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'makers-conversation-id': conversationId,
      },
      body: JSON.stringify({ conversation_id: conversationId }),
    });
    const data = await res.json();
    if (!data.messages || data.messages.length === 0) {
      historyList.innerHTML = '<p style="color:#6e6e73">暂无历史记录</p>';
      return;
    }
    historyList.innerHTML = '';
    data.messages.forEach((item) => {
      const div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = '<div class="title">' + escapeHtml(item.role === 'user' ? '用户' : 'AI') + '</div>' +
        '<div class="meta">' + escapeHtml(item.content.slice(0, 100)) + '</div>';
      historyList.appendChild(div);
    });
  } catch {
    historyList.innerHTML = '<p>加载失败</p>';
  }
});

btnCloseHistory.addEventListener('click', () => { historyModal.style.display = 'none'; });
historyModal.addEventListener('click', (e) => {
  if (e.target === historyModal) historyModal.style.display = 'none';
});
