/**
 * 栖思 demo 2.0 — 评价Agent模块（v2）
 * 4维度量化评分 + 本地关键词检测 + API评价调用 + 针对性评语
 */
var Evaluate = (function() {
  'use strict';

  // ===== 结束对话关键词 =====
  var END_KEYWORDS = [
    '今天就到这', '就聊到这吧', '结束吧', '我先走了',
    '下次再聊', '拜拜', '我先撤了', '不聊了',
    '先这样吧', '去学习了', '就到这吧', '先走了'
  ];

  // ===== 本地关键词规则（认知等级检测）=====
  var LEVEL_KEYWORDS = {
    5: ['我发现我', '我之前以为', '反思', '我学到了.*方法', '下次我会', '我意识到自己的', '策略'],
    4: ['类似', '就像', '和.*一样', '联想', '对比起来', '跟.*差不多', '类比', '迁移'],
    3: ['因为', '所以', '原因是', '导致了', '之所以.*是因为', '根本原因', '这说明'],
    2: ['怎么做', '步骤是', '首先.*然后', '流程', '方法是', '做法'],
  };

  // ===== 情绪关键词 =====
  var EMOTION_KEYWORDS = {
    positive: ['原来如此', '懂了', '恍然大悟', '有意思', '明白了', '理解了', '有道理', '确实', '原来是这样', '学到了'],
    negative: ['不懂', '困惑', '好难', '不知道', '不清楚', '完全不明白', '一头雾水', '没搞懂', '太难了'],
  };

  // ===== 纯度检测关键词 =====
  var PURITY_KEYWORDS = {
    positive: ['我想到', '我之前', '我的理解是', '我觉得', '比如我', '我自己', '我的经验', '我举个例子', '我突然想到', '换个角度'],
    negative: ['你说得对', '就像你说的', '正如你提到', '你刚才说', '对对对', '是的是的', '嗯嗯', '好的好的', '你告诉我', '不知道', '不清楚'],
  };

  // ===== 准确度检测关键词 =====
  var ACCURACY_KEYWORDS = {
    negative: ['好像', '可能', '大概', '应该是', '不确定', '不太清楚', '记不太清', '混了', '搞混'],
  };

  // ===== 综合分的树意象映射 =====
  var SCORE_NARRATIVES = {
    high: [
      '今天的对话像一棵扎了深根的树 🌳',
      '你的思考扎实而独立，根系很深 🌲',
    ],
    mid: [
      '你的树在稳步生长，枝干开始有了自己的形状 🌿',
      '今天长了一截结实的枝干 🌳',
    ],
    low: [
      '种子刚发芽，再多浇一点水，它会长得更壮 🌱',
      '今天的对话是好的开始，继续浇灌 🌿',
    ],
    veryLow: [
      '种子已经埋下了，下次试着多问几个"为什么" 🌾',
      '每棵树都从种子开始，不急 🌱',
    ],
  };

  // ===== 针对性建议池 =====
  var SUGGESTIONS = {
    depth: [
      '试着在一个点上多问几个"为什么"',
      '下次聊到一个概念时，试着分析它的原因',
      '从"是什么"走向"为什么"，你的树根会扎得更深',
    ],
    purity: [
      '试着用自己的话重新表达——这才是你真正理解的信号',
      '下次试着举一个自己的例子来说明概念',
      '少一些"你说得对"，多一些"我觉得"',
    ],
    accuracy: [
      '试着举一个自己的例子来验证理解',
      '下次聊到容易混淆的概念，试着区分它们的不同',
      '不确定的地方可以问问AI，核实一下自己的理解',
    ],
    coherence: [
      '试着在一个话题上深挖，而不是频繁切换',
      '下次聊到一半，试着回顾一下之前说过的内容',
      '把今天的对话串成一条线，看看能不能讲出一个完整的故事',
    ],
  };

  // ===== 检测对话结束关键词 =====
  function detectEndKeyword(text) {
    if (!text) return false;
    for (var i = 0; i < END_KEYWORDS.length; i++) {
      if (text.indexOf(END_KEYWORDS[i]) >= 0) return true;
    }
    return false;
  }

  // ===== 本地认知等级检测 =====
  function detectLevel(text) {
    if (!text || text.length < 5) return 1;
    for (var level = 5; level >= 2; level--) {
      var keywords = LEVEL_KEYWORDS[level];
      for (var i = 0; i < keywords.length; i++) {
        if (new RegExp(keywords[i]).test(text)) return level;
      }
    }
    if (text.length > 50) return 2;
    return 1;
  }

  // ===== 本地情绪检测 =====
  function detectEmotion(text) {
    if (!text) return 'neutral';
    for (var emotion in EMOTION_KEYWORDS) {
      var keywords = EMOTION_KEYWORDS[emotion];
      for (var i = 0; i < keywords.length; i++) {
        if (text.indexOf(keywords[i]) >= 0) return emotion;
      }
    }
    return 'neutral';
  }

  // ===== 调用API评价 =====
  async function requestEvaluation(chatHistory, userProfile) {
    if (!chatHistory || chatHistory.length < 4) return null;

    var conversationText = chatHistory.map(function(m) {
      return (m.role === 'user' ? '用户' : 'AI') + '：' + m.content;
    }).join('\n');

    var messages = [{ role: 'user', content: '请评估以下对话中用户的认知水平：\n\n' + conversationText }];

    try {
      var response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: messages, mode: 'evaluate', userProfile: userProfile || {} }),
      });

      if (!response.ok) {
        console.warn('[Evaluate] API评价失败:', response.status);
        return null;
      }

      var data = await response.json();
      return data.evaluation || null;
    } catch (err) {
      console.error('[Evaluate] API评价异常:', err);
      return null;
    }
  }

  // ===== 本地4维度评分（基于对话历史）=====
  function calculateLocalScores(chatHistory) {
    var userMessages = chatHistory.filter(function(m) { return m.role === 'user'; });
    var totalRounds = userMessages.length;
    if (totalRounds === 0) return { depth: 0, purity: 0, accuracy: 0, coherence: 0 };

    var levels = [];
    var levelUps = 0;
    var consecutiveL1 = 0;
    var maxConsecutiveL1 = 0;
    var purityScore = 50;
    var accuracyScore = 60;
    var coherenceCount = 0;
    var jumpCount = 0;
    var lastTopic = '';

    userMessages.forEach(function(msg, idx) {
      var text = msg.content || '';

      // 认知等级
      var lv = detectLevel(text);
      levels.push(lv);
      if (idx > 0 && lv > levels[idx - 1]) levelUps++;
      if (lv === 1) { consecutiveL1++; maxConsecutiveL1 = Math.max(maxConsecutiveL1, consecutiveL1); }
      else { consecutiveL1 = 0; }

      // 纯度
      PURITY_KEYWORDS.positive.forEach(function(kw) { if (text.indexOf(kw) >= 0) purityScore += 6; });
      PURITY_KEYWORDS.negative.forEach(function(kw) { if (text.indexOf(kw) >= 0) purityScore -= 5; });

      // 准确度
      ACCURACY_KEYWORDS.negative.forEach(function(kw) { if (text.indexOf(kw) >= 0) accuracyScore -= 6; });

      // 连贯性（简化：检测是否有"刚才""之前""上次"等引用前文的词）
      if (text.indexOf('刚才') >= 0 || text.indexOf('之前') >= 0 || text.indexOf('上次') >= 0 || text.indexOf('前面') >= 0) {
        coherenceCount++;
      }
    });

    var maxLevel = Math.max.apply(null, levels);
    var l2plus = levels.filter(function(l) { return l >= 2; }).length;

    // 深度分
    var depth = Math.min(100, Math.max(0,
      maxLevel * 15 + levelUps * 10 + l2plus * 3 - maxConsecutiveL1 * 2
    ));

    // 纯度分
    var purity = Math.min(100, Math.max(0, purityScore));

    // 准确度分
    var accuracy = Math.min(100, Math.max(0, accuracyScore));

    // 连贯分
    var coherenceBase = totalRounds > 0 ? Math.round((totalRounds - jumpCount) / totalRounds * 70) : 50;
    var coherence = Math.min(100, Math.max(0, coherenceBase + coherenceCount * 10));

    return { depth: depth, purity: purity, accuracy: accuracy, coherence: coherence };
  }

  // ===== 合并API评价和本地评分 =====
  function mergeScores(apiEval, localScores) {
    if (!apiEval || !apiEval.scores) return localScores;
    // API评分权重70%，本地评分权重30%
    return {
      depth:    Math.round((apiEval.scores.depth    || 0) * 0.7 + localScores.depth    * 0.3),
      purity:   Math.round((apiEval.scores.purity   || 0) * 0.7 + localScores.purity   * 0.3),
      accuracy: Math.round((apiEval.scores.accuracy || 0) * 0.7 + localScores.accuracy * 0.3),
      coherence:Math.round((apiEval.scores.coherence|| 0) * 0.7 + localScores.coherence* 0.3),
    };
  }

  // ===== 计算综合分 =====
  function calcTotalScore(scores) {
    return Math.round(
      scores.depth    * 0.30 +
      scores.purity   * 0.25 +
      scores.accuracy * 0.25 +
      scores.coherence* 0.20
    );
  }

  // ===== 找最弱维度 =====
  function findWeakest(scores) {
    var min = Infinity;
    var weakest = 'depth';
    for (var dim in scores) {
      if (scores[dim] < min) { min = scores[dim]; weakest = dim; }
    }
    return weakest;
  }

  // ===== 获取叙事文案 =====
  function getNarrative(score) {
    if (score >= 80) return _pickRandom(SCORE_NARRATIVES.high);
    if (score >= 60) return _pickRandom(SCORE_NARRATIVES.mid);
    if (score >= 40) return _pickRandom(SCORE_NARRATIVES.low);
    return _pickRandom(SCORE_NARRATIVES.veryLow);
  }

  // ===== 获取针对性建议 =====
  function getSuggestion(weakest) {
    return _pickRandom(SUGGESTIONS[weakest] || SUGGESTIONS.depth);
  }

  function _pickRandom(arr) {
    if (!arr || arr.length === 0) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  }

  // ===== 获取认知档案 =====
  function getCognitiveProfile() {
    return Storage.Evaluate.getCognitiveProfile();
  }

  // ===== 完整评价流程（对话结束时调用）=====
  async function runEndEvaluation(chatHistory, userProfile) {
    // 本地评分（即时，零Token）
    var localScores = calculateLocalScores(chatHistory);

    // API评价（异步）
    var apiEval = await requestEvaluation(chatHistory, userProfile);

    // 合并评分
    var scores = mergeScores(apiEval, localScores);
    var score = calcTotalScore(scores);
    var weakest = findWeakest(scores);
    var narrative = getNarrative(score);
    var suggestion = getSuggestion(weakest);

    // 确定认知等级（1-5）
    var level = apiEval ? (apiEval.level || 1) : detectLevel(
      chatHistory.filter(function(m) { return m.role === 'user'; }).pop().content
    );

    // 构建评价记录
    var evalRecord = {
      id: 'eval-' + Date.now(),
      ts: Date.now(),
      turnCount: chatHistory.filter(function(m) { return m.role === 'user'; }).length,
      level: level,
      score: score,
      scores: scores,
      summary: (apiEval && apiEval.summary) || '',
      weakest: weakest,
      suggestion: suggestion,
      narrative: narrative,
    };

    // 存储
    Storage.Evaluate.save(evalRecord);

    // 埋点
    Storage.Analytics.track('evaluate_done', {
      level: level,
      score: score,
      turn: evalRecord.turnCount,
    });

    // 注意：不在这里dispatch事件，由调用方（_endConversationFlow）在卡片保存后统一dispatch
    return evalRecord;
  }

  // ===== 每10轮的轻量评价（保留兼容）=====
  function shouldEvaluate(turnCount) {
    return turnCount > 0 && turnCount % 10 === 0;
  }

  async function runPeriodicEvaluation(chatHistory, userProfile) {
    var evaluation = await requestEvaluation(chatHistory, userProfile);
    if (!evaluation) return null;

    var evalRecord = {
      id: 'eval-' + Date.now(),
      ts: Date.now(),
      turnCount: chatHistory.filter(function(m) { return m.role === 'user'; }).length,
      level: evaluation.level || 1,
      score: evaluation.score || 50,
      scores: evaluation.scores || { depth: 50, purity: 50, accuracy: 50, coherence: 50 },
      summary: evaluation.summary || '',
      weakest: evaluation.weakest || 'depth',
      suggestion: evaluation.suggestion || '',
      narrative: evaluation.narrative || '',
    };

    Storage.Evaluate.save(evalRecord);

    document.dispatchEvent(new CustomEvent('evaluate:done', {
      detail: { evaluation: evalRecord }
    }));

    return evalRecord;
  }

  // ===== 公开 API =====
  return {
    detectEndKeyword: detectEndKeyword,
    detectLevel: detectLevel,
    detectEmotion: detectEmotion,
    shouldEvaluate: shouldEvaluate,
    requestEvaluation: requestEvaluation,
    calculateLocalScores: calculateLocalScores,
    getNarrative: getNarrative,
    getSuggestion: getSuggestion,
    getCognitiveProfile: getCognitiveProfile,
    runEndEvaluation: runEndEvaluation,
    runPeriodicEvaluation: runPeriodicEvaluation,
  };
})();
