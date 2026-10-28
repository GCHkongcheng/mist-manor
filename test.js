// 自动化验证（隐藏结局版）：
//   [1] 图结构完整性（next 指向存在 / 无孤岛 / 4 个结局）
//   [2] 计分完整性（任意路径 8 个计分选择，四维度各 2 题）
//   [3] MBTI 计算 + 各线 16 型全覆盖
//   [4] D 线隐藏选项触发逻辑（requires 判定与好感度枚举一致性）
//   [5] 结局变体旗标可达
//   [6] 全路径遍历无死局（含隐藏选项路径）
//   [7] 模拟 game.js 的 optionVisible 逻辑走查
const fs = require("fs");
const vm = require("vm");

let code = fs.readFileSync("data.js", "utf8");
code = code.replace("const STORY", "var STORY").replace("const MBTI_TYPES", "var MBTI_TYPES");
const ctx = {};
vm.runInNewContext(code, ctx);
const { STORY, MBTI_TYPES } = ctx;

const NODES = {};
STORY.forEach(n => { NODES[n.id] = n; });

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log("  ✓ " + name); }
  else { fail++; console.log("  ✗ " + name); }
}

// 复刻 game.js 的隐藏选项可见性逻辑
function optionVisible(opt, affinity) {
  if (!opt.requires) return true;
  if (opt.requires.master && affinity.master < opt.requires.master) return false;
  if (opt.requires.shen && affinity.shen < opt.requires.shen) return false;
  return true;
}

// ---------- [1] 图结构 ----------
console.log("\n[1] 图结构完整性");
const endings = STORY.filter(n => n.type === "ending");
ok("共 4 个结局节点", endings.length === 4);
ok("结局为 A/B/C/D 四线", endings.map(e => e.id).join(",") === "endingA,endingB,endingC,endingD");

let badNext = [];
STORY.forEach(n => {
  if (n.type === "narrative" && !NODES[n.next]) badNext.push(n.id + "->" + n.next);
  if (n.type === "choice") n.options.forEach(o => { if (!NODES[o.next]) badNext.push(n.id + "->" + o.next); });
});
ok("所有 next 指向存在的节点", badNext.length === 0);

// 可达性 BFS（含隐藏选项——验证 D 线可达）
const reachable = new Set(["prologue"]);
const queue = ["prologue"];
while (queue.length) {
  const id = queue.shift();
  const n = NODES[id];
  if (n.type === "narrative") { reachable.add(n.next); queue.push(n.next); }
  if (n.type === "choice") n.options.forEach(o => { reachable.add(o.next); queue.push(o.next); });
}
ok("无孤岛节点（全部可达，含 D 线）", reachable.size === STORY.length);

endings.forEach(e => {
  ok(e.id + " 字段完整",
    e.endingTitle && e.body && Array.isArray(e.variants) && e.baseText);
});
ok("变体文本均非空", endings.every(e => e.variants.every(v => v.text && v.text.length > 0)));

// ---------- [2] 全路径遍历（复刻游戏逻辑） ----------
console.log("\n[2] 全路径遍历 + 计分完整性");
function walk(nodeId, scores, flags, affinity, choicesMade, endingsHit, paths) {
  const n = NODES[nodeId];
  if (n.type === "ending") {
    paths.push({ scores: { ...scores }, flags: { ...flags }, affinity: { ...affinity }, choices: choicesMade, ending: nodeId });
    endingsHit.add(nodeId);
    return;
  }
  if (n.type === "narrative") { walk(n.next, scores, flags, affinity, choicesMade, endingsHit, paths); return; }
  n.options.forEach(o => {
    if (!optionVisible(o, affinity)) return; // 隐藏选项不满足条件则不可见
    const sc = { ...scores };
    if (o.scores) Object.keys(o.scores).forEach(k => sc[k] += o.scores[k]);
    if (o.nudge) Object.keys(o.nudge).forEach(k => sc[k] += o.nudge[k]); // 平局裁判 0.5 分
    const fl = { ...flags };
    if (o.flags) o.flags.forEach(f => fl[f] = true);
    const af = { ...affinity };
    if (o.affinity) Object.keys(o.affinity).forEach(k => af[k] += o.affinity[k]);
    walk(o.next, sc, fl, af, choicesMade + (o.scores ? 1 : 0), endingsHit, paths);
  });
}
const allPaths = [];
const endingsHit = new Set();
walk("prologue", { E:0,I:0,S:0,N:0,T:0,F:0,J:0,P:0 }, {}, { master:0, shen:0 }, 0, endingsHit, allPaths);

ok("全路径遍历无死局", allPaths.length > 0);
ok("四个结局均可达", endingsHit.size === 4);
ok("任意路径计分选择数恒为 12", allPaths.every(p => p.choices === 12));

const countA = allPaths.filter(p => p.ending === "endingA").length;
const countB = allPaths.filter(p => p.ending === "endingB").length;
const countC = allPaths.filter(p => p.ending === "endingC").length;
const countD = allPaths.filter(p => p.ending === "endingD").length;
console.log("  路径分布: A=" + countA + " B=" + countB + " C=" + countC + " D=" + countD);
// D 线路径占比会随 D 线内容加深而升高（分母含 D 线内部分支），
// 改用「真实随机游玩达成率」度量稀有度（不受 D 线内部节点数影响）
{
  let dHits = 0, dTotal = 0;
  for (let t = 0; t < 20000; t++) {
    let nodeId = "prologue", aff = { master: 0, shen: 0 };
    while (NODES[nodeId].type !== "ending") {
      const n = NODES[nodeId];
      if (n.type === "narrative") { nodeId = n.next; continue; }
      const opts = n.options.filter(o => optionVisible(o, aff));
      const o = opts[Math.floor(Math.random() * opts.length)];
      if (o.affinity) Object.keys(o.affinity).forEach(k => aff[k] += o.affinity[k]);
      nodeId = o.next;
    }
    dTotal++;
    if (nodeId === "endingD") dHits++;
  }
  const rate = dHits / dTotal;
  console.log("  随机游玩隐藏结局达成率: " + (rate * 100).toFixed(2) + "%");
  ok("D 线（隐藏结局）稀有（真实游玩达成率 1%-8%）", rate >= 0.01 && rate <= 0.08);
}

// 各线四维度各 3 计分题（多数表决） + 0.5 倾向加权
["A", "B", "C", "D"].forEach(line => {
  const linePaths = allPaths.filter(p => p.ending === "ending" + line);
  const dimOK = linePaths.every(p =>
    (p.scores.E + p.scores.I === 3.5) && (p.scores.S + p.scores.N === 3.5) &&
    (p.scores.T + p.scores.F === 3.5) && (p.scores.J + p.scores.P === 3.5));
  ok(line + "线四维度各 3 计分题 + 0.5 加权", linePaths.length > 0 && dimOK);
});

// ---------- [3] MBTI 覆盖 ----------
console.log("\n[3] MBTI 计算覆盖");
function computeMBTI(s) {
  return (s.E > s.I ? "E" : "I") + (s.S > s.N ? "S" : "N") +
         (s.T > s.F ? "T" : "F") + (s.J > s.P ? "J" : "P");
}
["A", "B", "C", "D"].forEach(line => {
  const reached = new Set(allPaths.filter(p => p.ending === "ending" + line).map(p => computeMBTI(p.scores)));
  ok(line + "线覆盖全部 16 型", reached.size === 16);
});
ok("MBTI_TYPES 16 型齐全", Object.keys(MBTI_TYPES).length === 16);

// 平局不可能：3 题奇数多数表决 + 0.5 加权，四维度恒有确定倾向
ok("任意路径四维度均无平局", allPaths.every(p =>
  p.scores.E !== p.scores.I && p.scores.S !== p.scores.N &&
  p.scores.T !== p.scores.F && p.scores.J !== p.scores.P));

// nudge 结构核对：四维度各恰好一个 0.5 来源，且都在不计分小支点上
{
  const nudgeDims = {};
  STORY.forEach(n => n.type === "choice" && n.options.forEach(o => {
    if (o.nudge) Object.keys(o.nudge).forEach(k => {
      nudgeDims[k] = (nudgeDims[k] || 0) + o.nudge[k];
      if (o.scores) nudgeDims["__scored__"] = true; // 计分选项不应携带 nudge
    });
  }));
  ok("E/I,S/N,T/F,J/P 各恰好 1 处 0.5 裁判",
    nudgeDims.E === 0.5 && nudgeDims.I === 0.5 && nudgeDims.S === 0.5 && nudgeDims.N === 0.5 &&
    nudgeDims.T === 0.5 && nudgeDims.F === 0.5 && nudgeDims.J === 0.5 && nudgeDims.P === 0.5);
  ok("nudge 均位于不计分小支点（不与 scores 混用）", !nudgeDims.__scored__);
}

// 随机游玩分布均匀性：无类型占比畸高（修复前 INFP 因平局默认可达 ~31.6%）
{
  const N = 20000;
  const dist = {};
  for (let t = 0; t < N; t++) {
    let nodeId = "prologue", s = { E:0,I:0,S:0,N:0,T:0,F:0,J:0,P:0 }, aff = { master:0, shen:0 };
    while (NODES[nodeId].type !== "ending") {
      const n = NODES[nodeId];
      if (n.type === "narrative") { nodeId = n.next; continue; }
      const opts = n.options.filter(o => optionVisible(o, aff));
      const o = opts[Math.floor(Math.random() * opts.length)];
      if (o.scores) Object.keys(o.scores).forEach(k => s[k] += o.scores[k]);
      if (o.nudge) Object.keys(o.nudge).forEach(k => s[k] += o.nudge[k]);
      if (o.affinity) Object.keys(o.affinity).forEach(k => aff[k] += o.affinity[k]);
      nodeId = o.next;
    }
    const code = computeMBTI(s);
    dist[code] = (dist[code] || 0) + 1;
  }
  const maxShare = Math.max(...Object.values(dist)) / N;
  console.log("  随机游玩 16 型最大占比: " + (maxShare * 100).toFixed(1) + "%（均匀期望 6.25%）");
  ok("无类型占比畸高（<15%）", maxShare < 0.15);
  ok("随机游玩可测出全部 16 型", Object.keys(dist).length === 16);
}

// ---------- [4] D 线触发条件正交性 ----------
console.log("\n[4] 隐藏选项触发条件");
const ch6 = NODES["ch6"];
const hiddenOpt = ch6.options.find(o => o.hidden);
ok("ch6 存在隐藏选项", !!hiddenOpt);
ok("隐藏选项 requires master≥2 且 shen≥2",
  hiddenOpt && hiddenOpt.requires.master === 2 && hiddenOpt.requires.shen === 2);

// 好感度来源核对：统计公共线各选项的 affinity（n1-n4 计分题必须不带好感度，保持触发难度不变）
let masterSources = 0, shenSources = 0;
["ch1","s1","n1","ch3","s3","n2","ch4","n3","ch5","s4","n4"].forEach(id => {
  NODES[id].options.forEach(o => {
    if (o.affinity && o.affinity.master) masterSources += o.affinity.master;
    if (o.affinity && o.affinity.shen) shenSources += o.affinity.shen;
  });
});
["n1","n2","n3","n4"].forEach(id => {
  ok(id + " 计分题不带好感度（不破坏 D 线触发难度）",
    NODES[id].options.every(o => !o.affinity));
});
console.log("  公共线好感度来源: 主人=" + masterSources + "处, 沈先生=" + shenSources + "处");
ok("主人好感来源足够凑满 2", masterSources >= 2);
ok("沈先生好感来源足够凑满 2", shenSources >= 2);

// D 线全部路径好感度都满足条件
ok("D 线所有路径 好感度 master≥2 且 shen≥2",
  allPaths.filter(p => p.ending === "endingD").every(p => p.affinity.master >= 2 && p.affinity.shen >= 2));

// 普通玩家（不看攻略）也能自然凑够条件的概率：好感随机路径下 D 可见比例
let visibleCount = 0, totalSim = 0;
for (let t = 0; t < 5000; t++) {
  let aff = { master: 0, shen: 0 };
  ["ch1","s1","ch3","s3","ch5","s4"].forEach(id => {
    const opts = NODES[id].options;
    const o = opts[Math.floor(Math.random() * opts.length)];
    if (o.affinity) Object.keys(o.affinity).forEach(k => aff[k] += o.affinity[k]);
  });
  totalSim++;
  if (optionVisible(hiddenOpt, aff)) visibleCount++;
}
const ratio = visibleCount / totalSim;
console.log("  随机游玩隐藏选项可见比例: " + (ratio * 100).toFixed(1) + "%");
ok("隐藏选项可见比例适中（5%-40%）", ratio >= 0.05 && ratio <= 0.40);

// ---------- [5] 结局变体旗标可达 ----------
console.log("\n[5] 结局变体旗标可达");
endings.forEach(e => {
  const linePaths = allPaths.filter(p => p.ending === e.id);
  e.variants.forEach(v => {
    const hit = linePaths.some(p => p.flags[v.flag]);
    ok(e.id + " 变体 " + v.flag + " 可点亮", hit);
  });
});

// ---------- [6] 抽样 ----------
console.log("\n[6] 抽样路径");
// 找一条 D 线路径打印
const dPath = allPaths.find(p => p.ending === "endingD");
console.log("  隐藏结局样例 → MBTI: " + computeMBTI(dPath.scores) +
  " · 好感度: 主人" + dPath.affinity.master + "/沈" + dPath.affinity.shen +
  " · 旗标: " + Object.keys(dPath.flags).slice(0, 6).join(",") + "…");

console.log("\n==============================");
console.log("通过 " + pass + " 项，失败 " + fail + " 项 · 总路径数 " + allPaths.length);
process.exit(fail === 0 ? 0 : 1);
