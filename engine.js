/* ============================================================
   迷雾庄园 · 纯逻辑引擎（浏览器与 Node 共用，无 DOM 依赖）
   game.js 与 test.js 同时使用这里的函数，避免测试复刻逻辑而与真实代码漂移。
   ============================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  function newScores() { return { E:0, I:0, S:0, N:0, T:0, F:0, J:0, P:0 }; }
  function newAffinity() { return { master: 0, shen: 0 }; }

  // 隐藏选项可见性：好感度需达到 requires 要求
  function optionVisible(opt, affinity) {
    if (!opt.requires) return true;
    if (opt.requires.master && affinity.master < opt.requires.master) return false;
    if (opt.requires.shen && affinity.shen < opt.requires.shen) return false;
    return true;
  }

  // 解析节点当前生效的题干与选项（支持重玩平行题库 altText / altOptions，且拼入 preVariants 即时回响）
  function resolveNode(node, flags, variantMap) {
    var useAlt = !!(variantMap && variantMap[node.id] && node.altText && node.altOptions);
    var baseText = useAlt ? node.altText : (node.text || "");
    var prefix = [];
    if (Array.isArray(node.preVariants) && flags) {
      node.preVariants.forEach(function (pv) {
        if (flags[pv.flag] && pv.text) prefix.push(pv.text);
      });
    }
    var fullText = prefix.length ? (prefix.join("\n") + "\n\n" + baseText) : baseText;
    var options = useAlt ? node.altOptions : (node.options || []);
    return { text: fullText, options: options, isAlt: useAlt };
  }

  // 应用一个选项的全部效果（原地修改 scores / flags / affinity）。
  // 返回该选项是否为计分选择（用于推进进度）。
  function applyOption(scores, flags, affinity, opt) {
    if (opt.scores) Object.keys(opt.scores).forEach(function (k) { scores[k] += opt.scores[k]; });
    // 平局裁判：小支点 0.5 分倾向加权（不计分、不进进度条）
    if (opt.nudge) Object.keys(opt.nudge).forEach(function (k) { scores[k] += opt.nudge[k]; });
    if (opt.flags) opt.flags.forEach(function (f) { flags[f] = true; });
    if (opt.affinity) Object.keys(opt.affinity).forEach(function (k) { affinity[k] += opt.affinity[k]; });
    return !!opt.scores;
  }

  // 四维度多数表决得到 MBTI 代号
  function computeCode(s) {
    return (s.E > s.I ? "E" : "I") + (s.S > s.N ? "S" : "N") +
           (s.T > s.F ? "T" : "F") + (s.J > s.P ? "J" : "P");
  }

  // 结局正文拼装：主体 + 命中旗标的变体 + 收束段
  function buildEndingText(node, flags) {
    var parts = [node.body];
    node.variants.forEach(function (v) {
      if (flags[v.flag] && v.text) parts.push(v.text);
    });
    parts.push(node.baseText);
    return parts.join("\n");
  }

  return {
    newScores: newScores,
    newAffinity: newAffinity,
    optionVisible: optionVisible,
    resolveNode: resolveNode,
    applyOption: applyOption,
    computeCode: computeCode,
    buildEndingText: buildEndingText
  };
});
