// 前端交互逻辑 - 纯 JavaScript，无 TypeScript 注解
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

let messages = [];
let attachments = [];
let isProcessing = false;
let lastHtmlContent = '';

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
    parseInput: '正在解析您的需求...',
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
  messages.push({ role: 'user', content: text });

  // 组装附件
  const attachPayload = attachments.map(function(a) {
    return { type: a.type, path: a.path, extractedText: a.extractedText };
  });

  // 清空附件显示
  attachments = [];
  renderAttachments();

  setStatus('busy', '正在思考...');

  // 创建 assistant 消息占位
  const assistantDiv = addMessage('assistant', '');
  const contentP = assistantDiv.querySelector('.msg-content p');
  contentP.innerHTML = '<span class="typing-indicator"><span></span><span></span><span></span></span>';

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: messages, attachments: attachPayload }),
    });

    if (!response.ok) throw new Error('请求失败: ' + response.status);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const result = await reader.read();
      if (result.done) break;
      buffer += decoder.decode(result.value, { stream: true });

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
          } catch (e) {}
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
      var typing = contentP.querySelector('.typing-indicator');
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
      if (data.tool === 'generate' && data.result && data.result.success) {
        showPreview(data.result.previewUrl);
      }
      if (data.tool === 'deploy' && data.result && data.result.success) {
        showDeployResult(data.result.url);
      }
      break;

    case 'done':
      if (data.url) {
        showDeployResult(data.url);
      }
      var lastAssistant = messagesEl.querySelector('.msg.assistant:last-of-type .msg-content p');
      if (lastAssistant && lastAssistant.textContent) {
        messages.push({ role: 'assistant', content: lastAssistant.textContent });
      }
      break;

    case 'error':
      var errTyping = contentP.querySelector('.typing-indicator');
      if (errTyping) errTyping.remove();
      contentP.textContent += '\n[错误] ' + data.message;
      setStatus('error', data.message);
      break;
  }
}

function showPreview(url) {
  sidePlaceholder.style.display = 'none';
  previewContainer.style.display = 'flex';
  deployResult.style.display = 'none';
  var fullUrl = url.startsWith('http') ? url : window.location.origin + url;
  previewFrame.src = fullUrl;
  previewLink.href = fullUrl;
}

function showDeployResult(url) {
  deployResult.style.display = 'block';
  deployUrl.href = url;
  deployUrl.textContent = url;
}

function renderAttachments() {
  attachmentsEl.innerHTML = '';
  attachments.forEach(function(a, i) {
    var chip = document.createElement('div');
    chip.className = 'attachment-chip';
    chip.innerHTML = escapeHtml(a.name) + ' <span class="remove" data-idx="' + i + '">&times;</span>';
    attachmentsEl.appendChild(chip);
  });
  var removes = attachmentsEl.querySelectorAll('.remove');
  removes.forEach(function(el) {
    el.addEventListener('click', function(e) {
      var idx = parseInt(e.target.getAttribute('data-idx'));
      attachments.splice(idx, 1);
      renderAttachments();
    });
  });
}

uploadBtn.addEventListener('click', function() { fileInput.click(); });

fileInput.addEventListener('change', async function() {
  var files = fileInput.files || [];
  for (var f = 0; f < files.length; f++) {
    var file = files[f];
    var formData = new FormData();
    formData.append('file', file);
    try {
      var res = await fetch('/api/upload', { method: 'POST', body: formData });
      var data = await res.json();
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
    } catch (err) {
      alert('上传失败: ' + err.message);
    }
  }
  renderAttachments();
  fileInput.value = '';
});

sendBtn.addEventListener('click', sendMessage);
inputEl.addEventListener('keydown', function(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

inputEl.addEventListener('input', function() {
  inputEl.style.height = 'auto';
  inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
});

btnCopyUrl.addEventListener('click', function() {
  navigator.clipboard.writeText(deployUrl.href);
  btnCopyUrl.textContent = '已复制';
  setTimeout(function() { btnCopyUrl.textContent = '复制链接'; }, 2000);
});

btnFullscreen.addEventListener('click', function() {
  if (previewFrame.requestFullscreen) previewFrame.requestFullscreen();
});

btnHistory.addEventListener('click', async function() {
  historyModal.style.display = 'flex';
  historyList.innerHTML = '<p>加载中...</p>';
  try {
    var res = await fetch('/api/history');
    var data = await res.json();
    if (!data.history || data.history.length === 0) {
      historyList.innerHTML = '<p style="color:#6e6e73">暂无历史记录</p>';
      return;
    }
    historyList.innerHTML = '';
    data.history.forEach(function(item) {
      var div = document.createElement('div');
      div.className = 'history-item';
      div.innerHTML = '<div class="title">' + escapeHtml(item.title) + '</div>' +
        '<div class="meta">' + new Date(item.timestamp).toLocaleString('zh-CN') + ' · ' + item.template +
        (item.outputUrl ? ' · <a href="' + item.outputUrl + '" target="_blank">查看</a>' : '') + '</div>';
      if (item.outputUrl) {
        div.addEventListener('click', function() { window.open(item.outputUrl, '_blank'); });
      }
      historyList.appendChild(div);
    });
  } catch (err) {
    historyList.innerHTML = '<p>加载失败</p>';
  }
});

btnCloseHistory.addEventListener('click', function() { historyModal.style.display = 'none'; });
historyModal.addEventListener('click', function(e) {
  if (e.target === historyModal) historyModal.style.display = 'none';
});
