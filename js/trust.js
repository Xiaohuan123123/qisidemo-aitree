/**
 * 栖思 demo 2.0 — 信任管理模块
 * 解析AI回复中的C01(坦诚告知)/C03(不确定标记)，渲染特殊样式
 */
var Trust = (function() {
  'use strict';

  // ===== C01 坦诚告知标记 =====
  // 检测AI回复中是否包含坦诚告知的内容
  var C01_PATTERNS = [
    /目前没有定论/,
    /目前没有标准答案/,
    /学术界.*?还没有共识/,
    /这个问题.*?争议/,
    /主流观点有/,
    /不同的看法/,
    /业内有.*?种/,
    /目前还没有定论/,
    /这个问题.*?没有.*?答案/,
  ];

  // ===== C03 不确定边界标记 =====
  var C03_PATTERNS = [
    /据我了解/,
    /这部分是我的推测/,
    /建议你再查证/,
    /我不太确定/,
    /这个我不确定/,
    /可能.*?不够准确/,
    /信息可能.*?不是最新的/,
    /我的信息.*?可能/,
    /仅供参考/,
  ];

  // ===== 检测信任标记 =====
  function detectTrustMarkers(text) {
    var result = {
      hasC01: false,
      hasC03: false,
      c01Segments: [],
      c03Segments: [],
    };

    // 按段落分割
    var paragraphs = text.split(/\n\n+/);

    paragraphs.forEach(function(para) {
      // 检测C01
      var isC01 = C01_PATTERNS.some(function(p) { return p.test(para); });
      if (isC01) {
        result.hasC01 = true;
        result.c01Segments.push(para.trim());
      }

      // 检测C03
      var isC03 = C03_PATTERNS.some(function(p) { return p.test(para); });
      if (isC03) {
        result.hasC03 = true;
        result.c03Segments.push(para.trim());
      }
    });

    return result;
  }

  // ===== 渲染信任标记 =====
  // 给AI回复中的信任标记加上特殊样式
  function renderWithTrustMarkers(text, trustInfo) {
    if (!trustInfo.hasC01 && !trustInfo.hasC03) return text;

    var result = text;

    // 给C01段落加上坦诚告知样式
    if (trustInfo.hasC01) {
      trustInfo.c01Segments.forEach(function(seg) {
        // 只处理前30个字符作为匹配，避免正则特殊字符问题
        var escaped = seg.substring(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
          result = result.replace(
            new RegExp(escaped),
            '<span class="trust-c01">$&</span>'
          );
        } catch (e) {
          // 正则匹配失败时忽略
        }
      });
    }

    // 给C03段落加上不确定标记样式
    if (trustInfo.hasC03) {
      trustInfo.c03Segments.forEach(function(seg) {
        var escaped = seg.substring(0, 30).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        try {
          result = result.replace(
            new RegExp(escaped),
            '<span class="trust-c03">$&</span>'
          );
        } catch (e) {}
      });
    }

    return result;
  }

  // ===== 生成信任提示标签 =====
  function getTrustBadge(trustInfo) {
    if (!trustInfo.hasC01 && !trustInfo.hasC03) return '';

    var badges = [];
    if (trustInfo.hasC01) {
      badges.push('<span class="badge badge-c01" title="坦诚告知：此话题尚无定论">💬 多元观点</span>');
    }
    if (trustInfo.hasC03) {
      badges.push('<span class="badge badge-c03" title="不确定标记：部分内容为推测">⚠️ 仅供参考</span>');
    }

    return '<div class="trust-badges">' + badges.join('') + '</div>';
  }

  // ===== 公开 API =====
  return {
    detect: detectTrustMarkers,
    render: renderWithTrustMarkers,
    getBadge: getTrustBadge,
  };
})();
