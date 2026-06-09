/**
 * 栖思 demo 2.0 — 推荐Agent模块
 * 三维度推荐：补缺 / 深入 / 拓展
 * 触发方式：手动点击"下一步推荐"按钮 → 调用API → 结果以AI气泡展示在对话区
 */
var Recommend = (function() {
  'use strict';

  var _isLoading = false;

  // ===== 冷启动引导文案（0-2张卡片）=====
  var COLD_START_TIPS = [
    '🌱 先来聊聊你最近学了什么吧，我帮你整理成知识卡片',
    '🌿 你可以试着和我聊一个你正在学的概念，我来引导你深入思考',
    '🍃 不如从你最感兴趣的一个知识点开始？说说你今天学了什么',
  ];

  /**
   * 获取推荐（主入口）
   * @returns {Promise<Array>} 推荐结果数组
   */
  async function getRecommendations() {
    if (_isLoading) {
      console.log('[Recommend] 正在加载中，跳过');
      return null;
    }

    // 激活聊天区域（隐藏空状态，显示 chatArea）
    _activateChatArea();

    var echoes = Storage.Echoes.load();

    // 冷启动：0-2张卡片，不调API
    if (echoes.length < 3) {
      _showRecommendLoading(true);
      _isLoading = true;
      // 模拟一个短暂延迟，让 loading 可见
      await new Promise(function(r) { setTimeout(r, 800); });
      _showRecommendLoading(false);
      _isLoading = false;
      _addAIBubble('多和我一起思考，我就能为你指明方向了 🌱');
      return null;
    }

    _isLoading = true;
    _showRecommendLoading(true);

    try {
      var result = await _callRecommendAPI(echoes);
      _showRecommendLoading(false);

      if (result.error) {
        _addAIBubble('推荐遇到了一点问题，稍后再试试 🌿');
        return null;
      }

      var recs = result.recommendations || [];
      if (recs.length === 0) {
        _addAIBubble('你目前的知识图谱很均衡，继续保持 🌳');
        return null;
      }

      // 存储推荐结果
      Storage.Recommend.save(recs);

      // 渲染为AI气泡
      _renderRecommendBubble(recs);

      // 埋点
      Storage.Analytics.track('recommend_show', { count: recs.length });

      return recs;

    } catch (err) {
      console.error('[Recommend] 请求异常:', err);
      _showRecommendLoading(false);
      _addAIBubble('网络好像不太稳定，稍后再试试 🌐');
      return null;
    } finally {
      _isLoading = false;
    }
  }

  /**
   * 调用推荐API
   */
  async function _callRecommendAPI(echoes) {
    var profile = Storage.Profile.load();
    var evalData = Storage.Evaluate.load();

    // 构建卡片摘要（只传必要字段，节省token）
    var cardSummary = echoes.map(function(c) {
      return {
        id: c.id,
        domain: c.domain || '未分类',
        level: c.level || 1,
        topic: c.topic || '',
        insight: (c.insight || '').substring(0, 60),
        blindSpot: (c.blindSpot || c.blindspot || '').substring(0, 40),
      };
    });

    // 构建评价摘要
    var evalSummary = null;
    if (evalData.length > 0) {
      var profile2 = Storage.Evaluate.getCognitiveProfile();
      evalSummary = {
        avgScores: profile2.avgScores,
        total: profile2.total,
      };
    }

    // 构建用户消息
    var userMsg = '请根据以下信息为我推荐学习方向：\n\n';
    userMsg += '## 我的知识卡片（共' + echoes.length + '张）\n';
    userMsg += JSON.stringify(cardSummary, null, 2) + '\n\n';

    if (evalSummary) {
      userMsg += '## 我的认知评价\n';
      userMsg += JSON.stringify(evalSummary, null, 2) + '\n\n';
    }

    userMsg += '## 我的画像\n';
    userMsg += '- 专业：' + (profile.major || '未知') + '\n';
    userMsg += '- 年级：' + (profile.grade || '未知') + '\n';
    userMsg += '- 目标：' + (profile.goals || '未知') + '\n';
    userMsg += '- 课程：' + (profile.courses || []).join('、') + '\n';

    var messages = [{ role: 'user', content: userMsg }];

    var response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: messages,
        mode: 'recommend',
      }),
    });

    if (!response.ok) {
      var err = await response.text();
      return { error: err };
    }

    return await response.json();
  }

  /**
   * 渲染推荐结果为AI气泡
   */
  function _renderRecommendBubble(recs) {
    var html = '<div class="recommend-bubble">';
    html += '<div class="recommend-header">🌿 根据你的知识图谱，我有几个建议</div>';

    var typeIcons = { '补缺': '🌱', '深入': '🔍', '拓展': '🌈' };
    var typeColors = { '补缺': '#1DD1A1', '深入': '#FF9F43', '拓展': '#54A0FF' };

    recs.forEach(function(rec, idx) {
      var icon = typeIcons[rec.type] || '💡';
      var color = typeColors[rec.type] || '#999';
      html += '<div class="recommend-item" style="border-left: 3px solid ' + color + '">';
      html += '<div class="recommend-item-header">';
      html += '<span class="recommend-icon">' + icon + '</span>';
      html += '<span class="recommend-type" style="color:' + color + '">' + _esc(rec.type || '') + '</span>';
      html += '<span class="recommend-title">' + _esc(rec.title || '') + '</span>';
      html += '</div>';
      html += '<div class="recommend-reason">' + _esc(rec.reason || '') + '</div>';
      if (rec.action) {
        html += '<div class="recommend-action">📌 ' + _esc(rec.action) + '</div>';
      }
      html += '</div>';
    });

    html += '<div class="recommend-footer">想从哪个方向开始？告诉我，我们聊聊 🌱</div>';
    html += '</div>';

    // 通过 Chat 模块添加气泡
    if (typeof Chat !== 'undefined' && Chat.addBubble) {
      Chat.addBubble('ai', html, null, null, true);
    }

    // 通知UI更新
    document.dispatchEvent(new CustomEvent('recommend:done', { detail: { recs: recs } }));
  }

  /**
   * 添加普通AI气泡
   */
  function _addAIBubble(text) {
    if (typeof Chat !== 'undefined' && Chat.addBubble) {
      Chat.addBubble('ai', text, null, null, false);
    }
  }

  /**
   * 激活聊天区域（隐藏空状态，显示 chatArea）
   */
  function _activateChatArea() {
    var emptyState = document.getElementById('emptyState');
    var chatArea = document.getElementById('chatArea');
    if (emptyState) emptyState.classList.add('hidden');
    if (chatArea) chatArea.classList.add('active');
  }

  /**
   * 显示/隐藏推荐加载状态（聊天区域正中间）
   */
  function _showRecommendLoading(show) {
    var el = document.getElementById('recommendLoading');
    if (show) {
      if (!el) {
        el = document.createElement('div');
        el.id = 'recommendLoading';
        el.className = 'recommend-loading';
        el.innerHTML = '<div class="recommend-loading-inner">🌿 推荐生成中...</div>';
        // 插入到聊天区域
        var chatArea = document.getElementById('chatArea');
        if (chatArea) {
          chatArea.style.position = 'relative';
          chatArea.appendChild(el);
        }
      }
      el.classList.add('visible');
    } else {
      if (el) el.classList.remove('visible');
    }
  }

  function _esc(s) {
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  /**
   * 获取加载状态
   */
  function isLoading() {
    return _isLoading;
  }

  /**
   * 森林页专用：获取推荐（返回结构化数据，不渲染气泡）
   * @param {boolean} forceRefresh 是否强制刷新（忽略缓存）
   * @returns {Promise<Array>} 推荐结果数组
   */
  async function getForestRecommendations(forceRefresh) {
    // 有缓存且未过期，直接返回
    if (!forceRefresh && Storage.ForestRecommend.isFresh()) {
      return Storage.ForestRecommend.getRecommendations();
    }

    var echoes = Storage.Echoes.load();

    // 冷启动：0-2张卡片
    if (echoes.length < 3) {
      return [];
    }

    try {
      var result = await _callRecommendAPI(echoes);
      if (result.error) return Storage.ForestRecommend.getRecommendations();

      var recs = result.recommendations || [];
      if (recs.length > 0) {
        Storage.ForestRecommend.save(recs);
      }
      return recs;
    } catch (err) {
      console.error('[ForestRecommend] 请求异常:', err);
      return Storage.ForestRecommend.getRecommendations();
    }
  }

  // ===== 公开 API =====
  return {
    getRecommendations: getRecommendations,
    getForestRecommendations: getForestRecommendations,
    isLoading: isLoading,
  };
})();
