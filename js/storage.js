/**
 * 栖思 demo 2.0 — 存储层
 * 封装 localStorage 读写 + 埋点模块
 */
var Storage = (function() {
  'use strict';

  // ===== 底层封装 =====
  function _get(key) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('[Storage] 读取失败:', key, e);
      return null;
    }
  }

  function _set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.warn('[Storage] 写入失败:', key, e);
    }
  }

  function _remove(key) {
    try { localStorage.removeItem(key); } catch (e) {}
  }

  // ===== 键名常量 =====
  var KEYS = {
    CHAT_STATE: 'qisi2-chat-state',
    ECHOES: 'qisi2-echoes',
    PROFILE: 'qisi2-profile',
    ONBOARDED: 'qisi2-onboarded',
    THEME: 'qisi2-theme',
    ANALYTICS: 'qisi2-analytics',
    EVALUATE: 'qisi2-evaluate',
    RECENT_CARDS: 'qisi2-recent-cards',
    RECOMMEND: 'qisi2-recommend',
    FOREST_RECOMMEND: 'qisi2-forest-recommend',
    TRASH: 'qisi2-trash',
    CUSTOM_DOMAINS: 'qisi2-custom-domains',
    CARD_NOTES: 'qisi2-card-notes',
  };

  // ========================================================
  //  ChatState — 聊天状态
  // ========================================================
  var ChatState = {
    save: function(state) { _set(KEYS.CHAT_STATE, state); },
    load: function() { return _get(KEYS.CHAT_STATE); },
    clear: function() { _remove(KEYS.CHAT_STATE); },
  };

  // ========================================================
  //  Echoes — 回响卡片
  // ========================================================
  var Echoes = {
    load: function() { return _get(KEYS.ECHOES) || []; },
    save: function(arr) { _set(KEYS.ECHOES, arr); },
    add: function(card) {
      var arr = Echoes.load();
      arr.push(card);
      Echoes.save(arr);
      return card;
    },
  };

  // ========================================================
  //  Profile — 用户画像（Onboarding数据）
  // ========================================================
  var Profile = {
    load: function() {
      return _get(KEYS.PROFILE) || {
        nickname: '',
        school: '',
        major: '',
        grade: '',
        courses: [],
        goals: '',
        style: '温和',
        treeSpecies: '银杏',
      };
    },
    save: function(profile) { _set(KEYS.PROFILE, profile); },
    update: function(key, value) {
      var p = Profile.load();
      p[key] = value;
      Profile.save(p);
      return p;
    },
  };

  // ========================================================
  //  Onboarding — 引导流程
  // ========================================================
  var Onboarding = {
    isDone: function() {
      try { return localStorage.getItem(KEYS.ONBOARDED) === 'true'; } catch (e) { return false; }
    },
    markDone: function() {
      try { localStorage.setItem(KEYS.ONBOARDED, 'true'); } catch (e) {}
    },
    reset: function() { _remove(KEYS.ONBOARDED); },
  };

  // ========================================================
  //  Theme — 主题
  // ========================================================
  var Theme = {
    get: function() {
      try { return localStorage.getItem(KEYS.THEME) || ''; } catch (e) { return ''; }
    },
    set: function(cls) {
      try { localStorage.setItem(KEYS.THEME, cls); } catch (e) {}
    },
  };

  // ========================================================
  //  RecentCards — 右侧面板最新卡片（独立于回响页）
  // ========================================================
  var RecentCards = {
    load: function() { return _get(KEYS.RECENT_CARDS) || []; },
    save: function(arr) { _set(KEYS.RECENT_CARDS, arr); },
    add: function(card) {
      var arr = RecentCards.load();
      arr.push(card);
      if (arr.length > 50) arr = arr.slice(-50);
      RecentCards.save(arr);
      return card;
    },
    removeByIds: function(ids) {
      var idSet = {};
      ids.forEach(function(id) { idSet[id] = true; });
      var arr = RecentCards.load().filter(function(c) { return !idSet[c.id]; });
      RecentCards.save(arr);
      return arr;
    },
    clear: function() { _remove(KEYS.RECENT_CARDS); },
  };

  // ========================================================
  //  Evaluate — 评价记录
  // ========================================================
  var Evaluate = {
    // 保存一次评价结果
    save: function(evalData) {
      var arr = Evaluate.load();
      arr.push(evalData);
      // 只保留最近50条
      if (arr.length > 50) arr = arr.slice(-50);
      _set(KEYS.EVALUATE, arr);
      return evalData;
    },

    // 加载全部评价历史
    load: function() { return _get(KEYS.EVALUATE) || []; },

    // 获取最新一次评价
    getLatest: function() {
      var arr = Evaluate.load();
      return arr.length > 0 ? arr[arr.length - 1] : null;
    },

    // 清空所有评价记录
    clear: function() { _remove(KEYS.EVALUATE); },

    // 计算认知档案：各等级占比 + 4维度均值
    getCognitiveProfile: function() {
      var arr = Evaluate.load();
      if (arr.length === 0) {
        return { distribution: {1:0,2:0,3:0,4:0,5:0}, avgScores: {depth:0,purity:0,accuracy:0,coherence:0}, avgScore: 0, total: 0 };
      }
      var dist = {1:0,2:0,3:0,4:0,5:0};
      var scoreSum = {depth:0, purity:0, accuracy:0, coherence:0};
      var totalScoreSum = 0;
      arr.forEach(function(e) {
        var lv = Math.min(5, Math.max(1, e.level || 1));
        dist[lv]++;
        if (e.scores) {
          scoreSum.depth     += (e.scores.depth     || 0);
          scoreSum.purity    += (e.scores.purity    || 0);
          scoreSum.accuracy  += (e.scores.accuracy  || 0);
          scoreSum.coherence += (e.scores.coherence || 0);
        }
        totalScoreSum += (e.score || 0);
      });
      var n = arr.length;
      return {
        distribution: dist,
        avgScores: {
          depth:     Math.round(scoreSum.depth     / n),
          purity:    Math.round(scoreSum.purity    / n),
          accuracy:  Math.round(scoreSum.accuracy  / n),
          coherence: Math.round(scoreSum.coherence / n),
        },
        avgScore: Math.round(totalScoreSum / n),
        total: n,
      };
    },
  };

  // ========================================================
  //  Recommend — 推荐记录
  // ========================================================
  var Recommend = {
    // 保存一次推荐结果
    save: function(recs) {
      var record = {
        recommendations: recs,
        timestamp: Date.now(),
        date: new Date().toISOString(),
      };
      _set(KEYS.RECOMMEND, record);
      return record;
    },

    // 加载最近一次推荐
    load: function() {
      return _get(KEYS.RECOMMEND) || null;
    },

    // 获取推荐列表（快捷方法）
    getRecommendations: function() {
      var data = Recommend.load();
      return data ? data.recommendations : [];
    },

    // 清空推荐记录
    clear: function() { _remove(KEYS.RECOMMEND); },
  };

  // ========================================================
  //  ForestRecommend — 森林页推荐记录
  // ========================================================
  var ForestRecommend = {
    save: function(recs) {
      var record = {
        recommendations: recs,
        timestamp: Date.now(),
        date: new Date().toISOString(),
      };
      _set(KEYS.FOREST_RECOMMEND, record);
      return record;
    },

    load: function() {
      return _get(KEYS.FOREST_RECOMMEND) || null;
    },

    getRecommendations: function() {
      var data = ForestRecommend.load();
      return data ? data.recommendations : [];
    },

    // 判断缓存是否有效（24小时内）
    isFresh: function() {
      var data = ForestRecommend.load();
      if (!data || !data.timestamp) return false;
      return (Date.now() - data.timestamp) < 24 * 60 * 60 * 1000;
    },

    clear: function() { _remove(KEYS.FOREST_RECOMMEND); },
  };

  // ========================================================
  //  Trash — 垃圾箱（已删除卡片，7天后自动清空）
  // ========================================================
  var Trash = {
    load: function() { return _get(KEYS.TRASH) || []; },

    // 将卡片移入垃圾箱（标记deletedAt时间戳）
    add: function(card) {
      var arr = Trash.load();
      var trashed = Object.assign({}, card, { deletedAt: Date.now() });
      arr.push(trashed);
      // 自动清空超过7天的
      arr = Trash._purgeOld(arr);
      _set(KEYS.TRASH, arr);
      return trashed;
    },

    // 批量移入垃圾箱
    addMany: function(cards) {
      var arr = Trash.load();
      var now = Date.now();
      cards.forEach(function(card) {
        arr.push(Object.assign({}, card, { deletedAt: now }));
      });
      arr = Trash._purgeOld(arr);
      _set(KEYS.TRASH, arr);
    },

    // 从垃圾箱恢复卡片到回响
    restore: function(id) {
      var arr = Trash.load();
      var card = null;
      var rest = [];
      arr.forEach(function(c) {
        if (c.id === id) { card = c; } else { rest.push(c); }
      });
      _set(KEYS.TRASH, rest);
      if (card) {
        delete card.deletedAt;
        return card;
      }
      return null;
    },

    // 永久删除
    permanentDelete: function(id) {
      var arr = Trash.load().filter(function(c) { return c.id !== id; });
      _set(KEYS.TRASH, arr);
    },

    // 批量永久删除
    permanentDeleteMany: function(ids) {
      var idSet = {};
      ids.forEach(function(id) { idSet[id] = true; });
      var arr = Trash.load().filter(function(c) { return !idSet[c.id]; });
      _set(KEYS.TRASH, arr);
    },

    // 清空垃圾箱
    clearAll: function() { _remove(KEYS.TRASH); },

    // 清除超过7天的条目
    _purgeOld: function(arr) {
      var cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
      return arr.filter(function(c) { return (c.deletedAt || 0) > cutoff; });
    },

    // 获取清空后的列表（先清超期的再返回）
    loadPurged: function() {
      var arr = Trash.load();
      var purged = Trash._purgeOld(arr);
      if (purged.length !== arr.length) _set(KEYS.TRASH, purged);
      return purged;
    },
  };

  // ========================================================
  //  CustomDomains — 用户自定义领域
  // ========================================================
  var CustomDomains = {
    load: function() { return _get(KEYS.CUSTOM_DOMAINS) || []; },
    save: function(arr) { _set(KEYS.CUSTOM_DOMAINS, arr); },
    add: function(name) {
      var list = CustomDomains.load();
      if (name && list.indexOf(name) < 0) { list.push(name); CustomDomains.save(list); }
      return list;
    },
    remove: function(name) {
      var list = CustomDomains.load().filter(function(d) { return d !== name; });
      CustomDomains.save(list);
      return list;
    },
  };

  // ========================================================
  //  CardNotes — 用户笔记（按卡片ID存储）
  // ========================================================
  var CardNotes = {
    // 获取某张卡片的笔记
    get: function(cardId) {
      var all = _get(KEYS.CARD_NOTES) || {};
      return all[cardId] || '';
    },
    // 保存某张卡片的笔记
    save: function(cardId, note) {
      var all = _get(KEYS.CARD_NOTES) || {};
      if (note && note.trim()) {
        all[cardId] = note.trim();
      } else {
        delete all[cardId]; // 空笔记删除key
      }
      _set(KEYS.CARD_NOTES, all);
    },
    // 删除某张卡片的笔记
    remove: function(cardId) {
      var all = _get(KEYS.CARD_NOTES) || {};
      delete all[cardId];
      _set(KEYS.CARD_NOTES, all);
    },
    // 获取全部笔记（用于导出等）
    loadAll: function() { return _get(KEYS.CARD_NOTES) || {}; },
  };

  // ========================================================
  //  Analytics — 埋点模块
  // ========================================================
  var Analytics = {
    track: function(eventId, data) {
      var events = _get(KEYS.ANALYTICS) || [];
      events.push({
        id: eventId,
        data: data || {},
        ts: Date.now(),
        date: new Date().toISOString().split('T')[0],
      });
      // 只保留最近1000条
      if (events.length > 1000) events = events.slice(-1000);
      _set(KEYS.ANALYTICS, events);
    },

    getEvents: function(filter) {
      var events = _get(KEYS.ANALYTICS) || [];
      if (filter && filter.id) {
        events = events.filter(function(e) { return e.id === filter.id; });
      }
      return events;
    },

    // 获取统计摘要
    getSummary: function() {
      var events = _get(KEYS.ANALYTICS) || [];
      var chatEnds = events.filter(function(e) { return e.id === 'chat_end'; });
      var cards = events.filter(function(e) { return e.id === 'card_generate'; });
      var modeLight = events.filter(function(e) { return e.id === 'mode_switch' && e.data.to === 'light'; });
      var modeDeep = events.filter(function(e) { return e.id === 'mode_switch' && e.data.to === 'deep'; });
      var c01 = events.filter(function(e) { return e.id === 'trust_c01'; });
      var c03 = events.filter(function(e) { return e.id === 'trust_c03'; });

      return {
        totalChats: chatEnds.length,
        totalCards: cards.length,
        modeLight: modeLight.length,
        modeDeep: modeDeep.length,
        c01Triggers: c01.length,
        c03Triggers: c03.length,
      };
    },

    clear: function() { _remove(KEYS.ANALYTICS); },
  };

  // ========================================================
  //  Streak — 连续天数计算
  // ========================================================
  var Streak = {
    // 记录今天的活跃
    recordToday: function() {
      var today = new Date().toISOString().split('T')[0];
      var streak = _get('qisi2-streak') || { days: [], current: 0 };
      if (!streak.days.includes(today)) {
        streak.days.push(today);
        // 只保留最近90天
        if (streak.days.length > 90) streak.days = streak.days.slice(-90);
      }
      // 计算连续天数
      streak.current = Streak._calcStreak(streak.days);
      _set('qisi2-streak', streak);
      return streak.current;
    },

    getCurrent: function() {
      var streak = _get('qisi2-streak') || { days: [], current: 0 };
      streak.current = Streak._calcStreak(streak.days);
      return streak.current;
    },

    _calcStreak: function(days) {
      if (!days || days.length === 0) return 0;
      var sorted = days.slice().sort().reverse();
      var today = new Date().toISOString().split('T')[0];
      var count = 0;
      var checkDate = new Date(today);

      for (var i = 0; i < sorted.length; i++) {
        var dateStr = checkDate.toISOString().split('T')[0];
        if (sorted.includes(dateStr)) {
          count++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }
      }
      return count;
    },
  };

  // ========================================================
  //  公开 API
  // ========================================================
  return {
    KEYS: KEYS,
    ChatState: ChatState,
    Echoes: Echoes,
    Profile: Profile,
    Onboarding: Onboarding,
    Theme: Theme,
    Analytics: Analytics,
    Streak: Streak,
    Evaluate: Evaluate,
    RecentCards: RecentCards,
    Recommend: Recommend,
    ForestRecommend: ForestRecommend,
    Trash: Trash,
    CustomDomains: CustomDomains,
    CardNotes: CardNotes,
  };
})();
