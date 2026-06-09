/**
 * 栖思 demo 2.0 — 对话模块（v2）
 * 核心：发送/接收、信任标记、对话结束流程（关键词检测+并行评价+合并气泡）
 */
var Chat = (function() {
  'use strict';

  // ===== 状态 =====
  var chatHistory = [];     // [{role, content}]
  var currentMode = 'deep'; // light | deep
  var turnCount = 0;        // 用户消息轮次
  var lastMeta = {};        // 最近一次AI回复的meta
  var isProcessing = false; // 是否正在等待AI回复
  var _isEnding = false;    // 是否正在执行结束流程
  var _pendingImages = []; // 待发送的图片数组 [{base64, mimeType, dataUrl}]
  var _pendingDoc = null;  // 待发送的文档 {text, fileName}
  var _MAX_IMAGES = 20;

  // ===== DOM 引用（在init中赋值）=====
  var els = {};

  // ===== 初始化 =====
  function init() {
    console.log('[Chat] init start');
    try {
    els.emptyState = document.getElementById('emptyState');
    els.chatArea = document.getElementById('chatArea');
    els.chatMessages = document.getElementById('chatMessages');
    els.inputField = document.getElementById('inputField');
    els.sendBtn = document.getElementById('sendBtn');
    els.thinking = document.getElementById('thinkingIndicator');
    els.modeTabs = document.querySelectorAll('.mode-tab');
    // 绑定事件（必须在 _restoreChat 之前，防止恢复失败导致无法输入）
    els.inputField.addEventListener('input', _onInput);
    els.inputField.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
    els.sendBtn.addEventListener('click', sendMessage);

    // 恢复聊天状态
    var saved = Storage.ChatState.load();
    if (saved && saved.history && saved.history.length > 0) {
      chatHistory = saved.history;
      currentMode = saved.mode || 'deep';
      turnCount = saved.turnCount || 0;
      lastMeta = saved.lastMeta || {};
      try { _restoreChat(); } catch(e) { console.error('[Chat] restore error:', e); }
    }

    // 图片上传：文件选择（支持多选）
    var imgInput = document.getElementById('imgFileInput');
    if (imgInput) {
      imgInput.addEventListener('change', function(e) {
        if (e.target.files && e.target.files.length) {
          _handleImageFiles(e.target.files);
        }
        imgInput.value = '';
      });
    }

    // 图片上传：Ctrl+V 粘贴（支持多张）
    document.addEventListener('paste', function(e) {
      var items = e.clipboardData && e.clipboardData.items;
      if (!items) return;
      var hasImage = false;
      for (var i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') >= 0) {
          if (!hasImage) { e.preventDefault(); hasImage = true; }
          var file = items[i].getAsFile();
          if (file) _handleImageFile(file);
        }
      }
    });

    _updateModeUI();
    } catch(e) { console.error('[Chat] init ERROR:', e); }
  }

  // ===== 文件处理 =====
  function _isDocFile(file) {
    var name = file.name.toLowerCase();
    return name.endsWith('.md') || name.endsWith('.markdown') ||
           name.endsWith('.doc') || name.endsWith('.docx') || name.endsWith('.pdf');
  }

  function _handleImageFile(file) {
    if (!file.type.startsWith('image/')) return;
    if (_pendingImages.length >= _MAX_IMAGES) {
      if (typeof App !== 'undefined' && App._showToast) App._showToast('最多只能添加 ' + _MAX_IMAGES + ' 张图片');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      if (typeof App !== 'undefined' && App._showToast) App._showToast('图片不能超过 10MB');
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      var dataUrl = e.target.result;
      var base64 = dataUrl.split(',')[1];
      _pendingImages.push({ base64: base64, mimeType: file.type, dataUrl: dataUrl });
      _renderImagePreviews();
      _onInput();
    };
    reader.readAsDataURL(file);
  }

  function _handleImageFiles(files) {
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (_isDocFile(f)) {
        _handleDocFile(f);
      } else if (f.type.startsWith('image/')) {
        _handleImageFile(f);
      }
    }
  }

  // ===== 文档处理 =====
  function _handleDocFile(file) {
    var name = file.name.toLowerCase();
    if (name.endsWith('.md') || name.endsWith('.markdown')) {
      _parseMarkdown(file);
    } else if (name.endsWith('.pdf')) {
      _parsePDF(file);
    } else if (name.endsWith('.doc') || name.endsWith('.docx')) {
      _parseWord(file);
    }
  }

  function _showDocParsing(fileName) {
    var bar = document.createElement('div');
    bar.className = 'doc-parsing-bar';
    bar.id = 'docParsingBar';
    bar.innerHTML =
      '<span class="doc-icon">📄</span>' +
      '<span class="doc-name">' + _esc(fileName) + '</span>' +
      '<span class="doc-status">' +
        '<span>解析中</span>' +
        '<span class="parsing-dots"><span></span><span></span><span></span></span>' +
      '</span>';
    var inputBox = document.getElementById('chatInputBox');
    if (inputBox) inputBox.parentNode.insertBefore(bar, inputBox);
    return bar;
  }

  function _updateDocParsing(state, msg) {
    var bar = document.getElementById('docParsingBar');
    if (!bar) return;
    var status = bar.querySelector('.doc-status');
    if (!status) return;
    if (state === 'done') {
      status.innerHTML = '<span class="doc-done">✓ 解析完成</span>' +
        '<button class="doc-cancel-btn" onclick="Chat.cancelDoc()">✕</button>';
    } else if (state === 'error') {
      status.innerHTML = '<span class="doc-error">✕ ' + (msg || '解析失败') + '</span>';
      setTimeout(function() { if (bar.parentNode) bar.parentNode.removeChild(bar); }, 3000);
    }
  }

  function _clearDocParsing() {
    var bar = document.getElementById('docParsingBar');
    if (bar && bar.parentNode) bar.parentNode.removeChild(bar);
  }

  function cancelDoc() {
    _pendingDoc = null;
    _clearDocParsing();
    els.inputField.placeholder = '和我聊聊你今天学到了什么...';
    _onInput();
  }

  // Markdown 解析
  function _parseMarkdown(file) {
    var bar = _showDocParsing(file.name);
    var reader = new FileReader();
    reader.onload = function(e) {
      var text = e.target.result;
      _updateDocParsing('done');
      _sendDocAsMessage(text, file.name);
    };
    reader.onerror = function() { _updateDocParsing('error', '读取失败'); };
    reader.readAsText(file);
  }

  // PDF 解析（使用 pdf.js CDN）
  function _parsePDF(file) {
    var bar = _showDocParsing(file.name);
    _loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js', function() {
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      var reader = new FileReader();
      reader.onload = function(e) {
        window.pdfjsLib.getDocument({ data: e.target.result }).promise.then(function(pdf) {
          var pages = [];
          for (var i = 1; i <= pdf.numPages; i++) {
            pages.push(pdf.getPage(i).then(function(page) {
              return page.getTextContent().then(function(tc) {
                return tc.items.map(function(item) { return item.str; }).join(' ');
              });
            }));
          }
          Promise.all(pages).then(function(texts) {
            _updateDocParsing('done');
            _sendDocAsMessage(texts.join('\n\n'), file.name);
          });
        }).catch(function() { _updateDocParsing('error', 'PDF 解析失败'); });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // Word 解析（使用 mammoth.js CDN）
  function _parseWord(file) {
    var bar = _showDocParsing(file.name);
    _loadScript('https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.6.0/mammoth.browser.min.js', function() {
      var reader = new FileReader();
      reader.onload = function(e) {
        window.mammoth.extractRawText({ arrayBuffer: e.target.result }).then(function(result) {
          _updateDocParsing('done');
          _sendDocAsMessage(result.value, file.name);
        }).catch(function() { _updateDocParsing('error', 'Word 解析失败'); });
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // 动态加载脚本
  function _loadScript(url, cb) {
    var existing = document.querySelector('script[src="' + url + '"]');
    if (existing) { cb(); return; }
    var s = document.createElement('script');
    s.src = url;
    s.onload = cb;
    s.onerror = function() { _updateDocParsing('error', '依赖加载失败'); };
    document.head.appendChild(s);
  }

  // 文档解析完成后暂存，等用户手动发送
  function _sendDocAsMessage(text, fileName) {
    if (text.length > 12000) text = text.substring(0, 12000) + '\n\n[文档过长，已截取前12000字]';
    _pendingDoc = { text: text, fileName: fileName };
    // 在输入框显示提示
    els.inputField.placeholder = '📄 ' + fileName + ' 已就绪，输入问题后发送...';
    _onInput();
  }

  function _renderImagePreviews() {
    var area = document.getElementById('imgPreviewArea');
    var grid = document.getElementById('imgPreviewGrid');
    if (!area || !grid) return;

    if (_pendingImages.length === 0) {
      area.style.display = 'none';
      return;
    }
    area.style.display = '';
    grid.innerHTML = '';
    _pendingImages.forEach(function(img, idx) {
      var item = document.createElement('div');
      item.className = 'img-preview-item';
      var imgEl = document.createElement('img');
      imgEl.src = img.dataUrl;
      item.appendChild(imgEl);
      var removeBtn = document.createElement('button');
      removeBtn.className = 'img-remove';
      removeBtn.textContent = '✕';
      removeBtn.onclick = function() { removeImageAt(idx); };
      item.appendChild(removeBtn);
      grid.appendChild(item);
    });
  }

  function removeImageAt(idx) {
    _pendingImages.splice(idx, 1);
    _renderImagePreviews();
    _onInput();
  }

  function removeImage() {
    _pendingImages = [];
    _renderImagePreviews();
    _onInput();
  }

  // ===== 发送消息 =====
  function sendMessage() {
    console.log('[Chat] sendMessage, inputField:', !!els.inputField);
    var text = els.inputField.value.trim();
    var hasImages = _pendingImages.length > 0;
    var hasDoc = !!_pendingDoc;
    if ((!text && !hasImages && !hasDoc) || isProcessing) return;

    isProcessing = true;
    turnCount++;

    // 添加用户气泡
    if (hasImages) {
      var imgUrls = _pendingImages.map(function(img) { return img.dataUrl; });
      _addBubble('user', text || '[图片' + _pendingImages.length + '张]', null, null, false, imgUrls);
    } else if (hasDoc) {
      _addBubble('user', (text || '请帮我梳理这份文档') + '\n📄 ' + _pendingDoc.fileName);
    } else {
      _addBubble('user', text);
    }

    // 构建发送内容
    if (hasImages) {
      var content = [];
      _pendingImages.forEach(function(img) {
        content.push({ type: 'image_url', image_url: { url: 'data:' + img.mimeType + ';base64,' + img.base64 } });
      });
      content.push({ type: 'text', text: text || '请识别这些图片中的内容，整理为结构化笔记。' });
      chatHistory.push({ role: 'user', content: content });
    } else if (hasDoc) {
      var docPrompt = '我上传了一份文档「' + _pendingDoc.fileName + '」，请帮我梳理其中的内容，整理为结构化笔记。\n\n---\n' + _pendingDoc.text;
      if (text) docPrompt = text + '\n\n---\n以下是文档内容：\n' + _pendingDoc.text;
      chatHistory.push({ role: 'user', content: docPrompt });
    } else {
      chatHistory.push({ role: 'user', content: text });
    }

    // 清空输入、图片和文档
    els.inputField.value = '';
    els.inputField.placeholder = '和我聊聊你今天学到了什么...';
    _pendingDoc = null;
    _clearDocParsing();
    removeImage();
    _onInput();

    // 埋点
    Storage.Analytics.track('chat_send', {
      mode: currentMode,
      turn: turnCount,
      length: text.length,
    });

    // 记录今日活跃
    Storage.Streak.recordToday();

    // ===== 图片消息：直接调用 image 模式 =====
    if (hasImages) {
      _showThinking(true);
      _callAPI(text || '请识别这张图片中的内容，整理为结构化笔记。', 'image').then(function(data) {
        _showThinking(false);
        if (data.error) {
          _addBubble('ai', '图片识别遇到了一点问题 😅 请再试一次。');
          isProcessing = false;
          return;
        }
        _processResponse(data);
        isProcessing = false;
        _saveState();
      }).catch(function() {
        _showThinking(false);
        _addBubble('ai', '网络好像不太稳定，请稍后再试 🌐');
        isProcessing = false;
      });
      return;
    }

    // ===== 关键词检测：是否触发对话结束 =====
    var isEnd = Evaluate.detectEndKeyword(text);
    console.log('[Chat] 关键词检测:', isEnd, 'turnCount:', turnCount, 'text:', text);
    if (isEnd) {
      if (turnCount >= 3) {
        console.log('[Chat] 触发对话结束流程');
        _showThinking(true);
        _callAPI(text).then(function(data) {
          _showThinking(false);
          if (data.error) {
            _addBubble('ai', '抱歉，我遇到了一点问题 😅 请再试一次。');
            isProcessing = false;
            return;
          }
          _processResponse(data);
          isProcessing = false;
          _saveState();
          console.log('[Chat] AI回复完成，开始执行结束流程');
          _endConversationFlow();
        }).catch(function(err) {
          _showThinking(false);
          _addBubble('ai', '网络好像不太稳定，请稍后再试 🌐');
          isProcessing = false;
          console.error('[Chat] 结束流程API错误:', err);
        });
        return;
      } else {
        // 对话太短，不触发结束
        _addBubble('ai', '🌿 再聊几轮吧，对话太短还长不出叶子');
        isProcessing = false;
        _saveState();
        return;
      }
    }

    // ===== 正常对话流程 =====
    _showThinking(true);

    _callAPI(text).then(function(data) {
      _showThinking(false);

      if (data.error) {
        _addBubble('ai', '抱歉，我遇到了一点问题 😅 请再试一次。');
        isProcessing = false;
        return;
      }

      _processResponse(data);
      isProcessing = false;

    }).catch(function(err) {
      console.error('[Chat] API catch error:', err);
      _showThinking(false);
      _addBubble('ai', '网络好像不太稳定，请稍后再试 🌐');
      isProcessing = false;
    });

    _saveState();
  }

  // ===== 调用后端API =====
  async function _callAPI(userText, modeOverride) {
    var recentHistory = chatHistory.slice(-20);
    var messages = recentHistory.map(function(m) {
      return { role: m.role, content: m.content };
    });
    var profile = Storage.Profile.load();

    var response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages,
        mode: modeOverride || currentMode,
        userProfile: profile,
      }),
    });

    if (!response.ok) {
      var err = await response.text();
      return { error: err };
    }

    return await response.json();
  }

  // ===== 处理AI回复 =====
  function _processResponse(data) {
    var reply = data.reply || '';
    var meta = data.meta || {};
    lastMeta = meta;

    // 解析追问选项
    var options = [];
    var cleanReply = reply.replace(/\[OPTION:(.*?)\]/g, function(m, opt) {
      options.push(opt.trim());
      return '';
    }).trim();

    // 信任标记检测
    var trustInfo = Trust.detect(cleanReply);
    var renderedReply = Trust.render(cleanReply, trustInfo);
    var trustBadge = Trust.getBadge(trustInfo);

    var finalHTML = renderedReply;
    if (trustBadge) finalHTML = trustBadge + finalHTML;

    // 添加AI气泡
    var localLevel = Evaluate.detectLevel(chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].content : '');
    var displayLevel = Math.max(meta.level || 1, localLevel);
    _addBubble('ai', finalHTML, options, displayLevel, true);

    // 保存到历史
    chatHistory.push({ role: 'assistant', content: reply });

    // 埋点
    if (trustInfo.hasC01) Storage.Analytics.track('trust_c01', { topic: meta.topic });
    if (trustInfo.hasC03) Storage.Analytics.track('trust_c03', { topic: meta.topic });

    // 每5轮对话结束埋点
    if (turnCount > 0 && turnCount % 5 === 0) {
      Storage.Analytics.track('chat_checkpoint', {
        turn: turnCount,
        lastLevel: meta.level,
        lastEmotion: meta.emotion,
      });
    }

    _saveState();

    // 启动对话结束计时器（30秒后自动提取卡片，兜底机制）
    _startEndTimer();
  }

  // ===== 对话结束流程（关键词触发）=====
  async function _endConversationFlow() {
    if (_isEnding) { console.log('[Chat] _isEnding=true，跳过'); return; }
    _isEnding = true;

    console.log('[Chat] === 开始 _endConversationFlow ===');

    // 取消30秒自动提取计时器
    if (_endTimer) { clearTimeout(_endTimer); _endTimer = null; }

    // 埋点
    Storage.Analytics.track('chat_end', {
      turn: turnCount,
      mode: currentMode,
      trigger: 'keyword',
    });

    var profile = Storage.Profile.load();

    // 并行请求：卡片提取 + 评价（各自独立，一个失败不影响另一个）
    var cardsResult = { cards: [] };
    var evalResult = null;

    try {
      console.log('[Chat] 发起并行请求: 卡片提取 + 评价');
      var results = await Promise.allSettled([
        _extractCardsAPI(),
        Evaluate.runEndEvaluation(chatHistory, profile)
      ]);

      console.log('[Chat] 并行请求完成:', results[0].status, results[1].status);

      // 卡片结果
      if (results[0].status === 'fulfilled') {
        cardsResult = results[0].value;
      } else {
        console.warn('[Chat] 卡片提取失败:', results[0].reason);
      }

      // 评价结果
      if (results[1].status === 'fulfilled') {
        evalResult = results[1].value;
      } else {
        console.warn('[Chat] 评价失败:', results[1].reason);
      }

      console.log('[Chat] cards:', cardsResult.cards.length, 'eval:', evalResult ? evalResult.score : 'null');

      // 存储卡片（同时存入回响和右侧面板）
      var cards = cardsResult.cards || [];
      cards.forEach(function(card) {
        card.id = 'card-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        card.createdAt = new Date().toISOString();
        Storage.Echoes.add(card);
        Storage.RecentCards.add(card);
      });

      // 埋点
      Storage.Analytics.track('card_generate', { count: cards.length, turn: turnCount });

      // 渲染合并气泡（卡片+评价结果）
      _renderMergeBubble(cards, evalResult);

      // 通知外部UI更新（卡片和评价都完成后才刷新）
      document.dispatchEvent(new CustomEvent('cards:generated', { detail: { cards: cards } }));

      // 评价事件（在卡片保存之后触发，确保右侧面板能读到最新数据）
      if (evalResult) {
        document.dispatchEvent(new CustomEvent('evaluate:done', {
          detail: { evaluation: evalResult }
        }));
      }

    } catch (err) {
      console.error('[Chat] 结束流程异常:', err);
      _addBubble('ai', '遇到了一点问题，请稍后再试 😅');
    } finally {
      _isEnding = false;
    }
  }

  // ===== 卡片提取API调用（不包含UI提示）=====
  async function _extractCardsAPI() {
    if (chatHistory.length < 2) return { cards: [] };

    var conversationText = chatHistory.map(function(m) {
      return (m.role === 'user' ? '用户' : 'AI') + '：' + m.content;
    }).join('\n');

    var messages = [{ role: 'user', content: '请从以下对话中提取知识卡片：\n\n' + conversationText }];

    try {
      var response = await fetch('/api/chat?t=' + Date.now(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
        body: JSON.stringify({ messages: messages, mode: 'extract' }),
      });

      if (!response.ok) return { cards: [] };
      var data = await response.json();
      return { cards: data.cards || [] };
    } catch (err) {
      console.error('[Chat] 卡片提取异常:', err);
      return { cards: [] };
    }
  }

  // ===== 渲染合并气泡（卡片结果 + 评价结果）=====
  function _renderMergeBubble(cards, evalResult) {
    var html = '<div class="merge-bubble">';

    // 卡片结果
    html += '<div class="merge-cards">';
    if (cards.length > 0) {
      html += '🌱 新长了 ' + cards.length + ' 片叶子';
    } else {
      html += '🍂 这次的对话养料还不够，再聊几轮？';
    }
    html += '</div>';

    // 评价结果
    if (evalResult && evalResult.score !== undefined) {
      html += '<div class="merge-divider"></div>';

      // 综合评价
      var scoreNarrative = Evaluate.getNarrative(evalResult.score);
      html += '<div class="merge-summary">🌳 综合 ' + evalResult.score + ' · ' + _esc(scoreNarrative) + '</div>';

      // 4维度条
      html += '<div class="merge-scores">';
      var dims = [
        { key: 'depth',     label: '深度' },
        { key: 'purity',    label: '纯度' },
        { key: 'accuracy',  label: '准确' },
        { key: 'coherence', label: '连贯' },
      ];
      var scores = evalResult.scores || {};
      dims.forEach(function(d) {
        var val = scores[d.key] || 0;
        var pct = Math.min(100, Math.max(0, val));
        html += '<div class="merge-score-row">' +
          '<span class="merge-score-label">' + d.label + '</span>' +
          '<div class="merge-score-bar"><div class="merge-score-fill" style="width:' + pct + '%"></div></div>' +
          '<span class="merge-score-val">' + val + '</span>' +
        '</div>';
      });
      html += '</div>';

      // 针对性建议
      if (evalResult.suggestion) {
        html += '<div class="merge-suggestion">💡 ' + _esc(evalResult.suggestion) + '</div>';
      }
    }

    html += '</div>';

    _addBubble('ai', html, null, null, true);
  }

  // ===== 添加气泡 =====
  function _addBubble(type, text, options, cogLevel, isHTML, imageUrls) {
    if (els.emptyState) els.emptyState.classList.add('hidden');
    if (els.chatArea) els.chatArea.classList.add('active');

    var row = document.createElement('div');
    row.className = 'bubble-row ' + type;

    // 头像
    var avatar = document.createElement('div');
    avatar.className = 'bubble-avatar ' + (type === 'ai' ? 'ai-avatar' : 'user-avatar');
    if (type === 'ai') {
      avatar.textContent = '🌳';
    } else {
      var profile = Storage.Profile.load();
      var treeEmoji = { '银杏':'🌿', '红枫':'🍁', '松柏':'🌲', '竹':'🎋', '樱花':'🌸', '橡树':'🌳', '胡杨':'🏜️' };
      avatar.textContent = treeEmoji[profile.treeSpecies] || '🐻';
    }
    row.appendChild(avatar);

    // 气泡容器
    var bubbleWrap = document.createElement('div');
    bubbleWrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;min-width:0;';

    // 图片（支持多张）
    if (imageUrls && imageUrls.length) {
      var imgGrid = document.createElement('div');
      imgGrid.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px;margin-bottom:4px;';
      imageUrls.forEach(function(url) {
        var imgEl = document.createElement('img');
        imgEl.src = url;
        imgEl.style.cssText = 'width:80px;height:80px;object-fit:cover;border-radius:8px;cursor:pointer;border:1px solid var(--border-light);';
        imgEl.onclick = function() { window.open(url, '_blank'); };
        imgGrid.appendChild(imgEl);
      });
      bubbleWrap.appendChild(imgGrid);
    }

    var bubble = document.createElement('div');
    bubble.className = 'bubble';

    if (isHTML) {
      bubble.innerHTML = text;
    } else {
      bubble.textContent = text;
    }

    // 认知等级标记
    if (cogLevel && type === 'ai') {
      var levelSpan = document.createElement('span');
      levelSpan.className = 'cog-level cog-level-' + cogLevel;
      levelSpan.textContent = 'L' + cogLevel;
      bubble.appendChild(levelSpan);
    }

    bubbleWrap.appendChild(bubble);
    row.appendChild(bubbleWrap);

    // 追问选项
    if (options && options.length > 0) {
      var group = document.createElement('div');
      group.className = 'option-group';
      options.forEach(function(opt) {
        var btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt;
        btn.addEventListener('click', function() { _selectOption(btn, opt); });
        group.appendChild(btn);
      });
      bubbleWrap.appendChild(group);
    }

    els.chatMessages.appendChild(row);

    requestAnimationFrame(function() {
      els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
    });
  }

  // ===== 选择追问选项 =====
  function _selectOption(btn, text) {
    btn.parentElement.querySelectorAll('.option-btn').forEach(function(b) {
      b.style.pointerEvents = 'none';
      b.style.opacity = '0.5';
    });
    btn.style.opacity = '1';
    btn.style.background = 'var(--primary)';
    btn.style.color = '#fff';
    btn.style.borderColor = 'var(--primary)';
    els.inputField.value = text;
    sendMessage();
  }

  // ===== 切换模式 =====
  function switchMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;
    Storage.Analytics.track('mode_switch', { to: mode });
    _updateModeUI();
    _saveState();
  }

  function _updateModeUI() {
    els.modeTabs.forEach(function(tab) {
      tab.classList.toggle('active', tab.dataset.mode === currentMode);
    });
  }


  // ===== 恢复聊天 =====
  function _restoreChat() {
    if (chatHistory.length === 0) return;
    if (els.emptyState) els.emptyState.classList.add('hidden');
    if (els.chatArea) els.chatArea.classList.add('active');

    chatHistory.forEach(function(msg) {
      if (msg.role === 'user') {
        _addBubble('user', msg.content);
      } else {
        var trustInfo = Trust.detect(msg.content);
        var rendered = Trust.render(msg.content, trustInfo);
        var badge = Trust.getBadge(trustInfo);
        _addBubble('ai', badge + rendered, null, null, true);
      }
    });
  }

  // ===== 思考状态 =====
  function _showThinking(show) {
    if (els.thinking) els.thinking.classList.toggle('visible', show);
    if (show && els.chatMessages) {
      requestAnimationFrame(function() {
        els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
      });
    }
  }

  // ===== 输入处理 =====
  function _onInput() {
    var hasText = els.inputField.value.trim().length > 0;
    els.sendBtn.disabled = !hasText && _pendingImages.length === 0 && !_pendingDoc;
  }

  // ===== 保存状态 =====
  function _saveState() {
    Storage.ChatState.save({
      history: chatHistory,
      mode: currentMode,
      turnCount: turnCount,
      lastMeta: lastMeta,
    });
  }

  // ===== 清空聊天 =====
  function clearChat() {
    chatHistory = [];
    turnCount = 0;
    lastMeta = {};
    isProcessing = false;
    _isEnding = false;

    if (els.chatMessages) els.chatMessages.innerHTML = '';
    if (els.emptyState) els.emptyState.classList.remove('hidden');
    if (els.chatArea) els.chatArea.classList.remove('active');
    _showThinking(false);

    Storage.ChatState.clear();
    Storage.Evaluate.clear();
    Storage.RecentCards.clear();
    Storage.Analytics.track('chat_clear', {});

    // 通知UI刷新（评价分数重置为0）
    document.dispatchEvent(new CustomEvent('evaluate:done', { detail: {} }));
  }

  // ===== 开启新话题（不清空聊天记录）=====
  function startNewTopic() {
    // 从文案池随机选一条过渡消息
    var transitions = [
      '好的，之前的对话先留着。今天想聊什么新方向？🌱',
      '换个角度看看？你最近学了什么新东西？🌿',
      '之前的思考已经记下来了。来，新的开始 🌳',
      '让我们开启一条新的枝干吧 🌿 今天想探索什么？',
      '你的知识之树又到了长新枝的时候 🍃 想聊点什么？',
      '之前的对话是你的养料，现在来种一颗新的种子 🌱',
    ];
    var msg = transitions[Math.floor(Math.random() * transitions.length)];

    // AI发送过渡消息
    _addBubble('ai', msg, null, null, false);
    chatHistory.push({ role: 'assistant', content: msg });

    // 切换到深度模式
    currentMode = 'deep';
    _updateModeUI();
    _saveState();

    Storage.Analytics.track('new_topic', { turn: turnCount });
  }

  // ===== 30秒自动提取卡片（兜底机制，不含评价）=====
  var _endTimer = null;
  var _isExtracting = false;

  function _startEndTimer() {
    if (_endTimer) clearTimeout(_endTimer);
    _endTimer = setTimeout(function() {
      if (turnCount >= 2 && !_isEnding) {
        Storage.Analytics.track('chat_end', {
          turn: turnCount,
          mode: currentMode,
          trigger: 'timeout',
        });
        extractCards();
      }
    }, 30 * 1000);
  }

  // ===== 卡片提取（30秒超时触发，带UI提示）=====
  async function extractCards() {
    if (_isExtracting) return { cards: [] };
    if (chatHistory.length < 2) {
      _addBubble('ai', '和我一起多思考一下，才有新的叶片哦! 🌿', null, null, false);
      return { cards: [] };
    }

    _isExtracting = true;
    console.log('[Chat] 开始提取卡片...');

    try {
      var result = await _extractCardsAPI();
      var cards = result.cards || [];

      cards.forEach(function(card) {
        card.id = 'card-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4);
        card.createdAt = new Date().toISOString();
        Storage.Echoes.add(card);
        Storage.RecentCards.add(card);
      });

      Storage.Analytics.track('card_generate', { count: cards.length, turn: turnCount });

      if (cards.length > 0) {
        _addBubble('ai', '🌱 新长了 ' + cards.length + ' 片叶子', null, null, false);
      } else {
        _addBubble('ai', '🍂 这次的对话养料还不够，再聊几轮？', null, null, false);
      }

      document.dispatchEvent(new CustomEvent('cards:generated', { detail: { cards: cards } }));
      return { cards: cards };

    } catch (err) {
      console.error('[Chat] 卡片提取异常:', err);
      return { cards: [] };
    } finally {
      _isExtracting = false;
    }
  }

  // ===== 工具函数 =====
  function _esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ===== 获取当前状态 =====
  function getState() {
    return {
      history: chatHistory,
      mode: currentMode,
      turnCount: turnCount,
      lastMeta: lastMeta,
      isProcessing: isProcessing,
    };
  }

  // ===== 公开 API =====
  return {
    init: init,
    sendMessage: sendMessage,
    switchMode: switchMode,
    clearChat: clearChat,
    startNewTopic: startNewTopic,
    getState: getState,
    extractCards: extractCards,
    addBubble: _addBubble,
    removeImage: removeImage,
    removeImageAt: removeImageAt,
    cancelDoc: cancelDoc,
  };
})();
