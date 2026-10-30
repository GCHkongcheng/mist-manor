// 自动化验证（隐藏结局版）：
//   [1] 图结构完整性（next 指向存在 / 无孤岛 / 4 个结局）
//   [2] 计分完整性（任意路径 12 个计分选择，四维度各 3 题）
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

// 与 game.js 共用同一份引擎逻辑（不再复刻）
const Engine = require("./engine.js");
const optionVisible = Engine.optionVisible;

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
const enqueue = id => { if (!reachable.has(id)) { reachable.add(id); queue.push(id); } };
while (queue.length) {
  const id = queue.shift();
  const n = NODES[id];
  if (n.type === "narrative") enqueue(n.next);
  if (n.type === "choice") n.options.forEach(o => enqueue(o.next));
}
ok("无孤岛节点（全部可达，含 D 线）", reachable.size === STORY.length);

endings.forEach(e => {
  ok(e.id + " 字段完整",
    e.endingTitle && e.body && Array.isArray(e.variants) && e.baseText);
});
ok("变体文本均非空", endings.every(e => e.variants.every(v => v.text && v.text.length > 0)));

// ---------- [2] 全路径枚举（状态合并 DP：等价于遍历所有路径，但只处理不同状态） ----------
// 状态 = (节点, scores, affinity, 已计分选择数)。相同状态的路径合并并累计条数，
// 因此无需真的展开 49 万条路径，几秒即可完成，结论与逐条遍历等价。
console.log("\n[2] 全路径枚举（状态合并）+ 计分完整性");
// 旗标不影响后续分支，只影响结局文案，因此不进入状态键；合并时取并集
// （"某旗标在某结局下是否可点亮" 等价于 "并集中含该旗标"，判定仍精确）。
function stateKey(s) {
  return JSON.stringify([s.scores, s.affinity, s.choices]);
}
// 拓扑序（图为 DAG）
const topo = [];
{
  const indeg = {};
  STORY.forEach(n => indeg[n.id] = 0);
  const succ = n => n.type === "narrative" ? [n.next] : n.type === "choice" ? n.options.map(o => o.next) : [];
  STORY.forEach(n => succ(n).forEach(t => indeg[t]++));
  const q = STORY.filter(n => indeg[n.id] === 0).map(n => n.id);
  while (q.length) {
    const id = q.shift();
    topo.push(id);
    succ(NODES[id]).forEach(t => { if (--indeg[t] === 0) q.push(t); });
  }
}
ok("剧情图无环（可拓扑排序）", topo.length === STORY.length);

const layers = {};
STORY.forEach(n => layers[n.id] = new Map());
function addState(nodeId, st, count) {
  const k = stateKey(st);
  const cur = layers[nodeId].get(k);
  if (cur) { cur.count += count; Object.keys(st.flags).forEach(f => cur.flags[f] = true); }
  else layers[nodeId].set(k, Object.assign({}, st, { flags: Object.assign({}, st.flags), count: count }));
}
addState("prologue", { scores: Engine.newScores(), flags: {}, affinity: Engine.newAffinity(), choices: 0 }, 1);
const allPaths = [];   // 终态集合（每项带 count = 到达该终态的路径条数）
const endingsHit = new Set();
let totalPathCount = 0;
topo.forEach(id => {
  const n = NODES[id];
  layers[id].forEach(st => {
    if (n.type === "ending") {
      allPaths.push(Object.assign({ ending: id }, st));
      endingsHit.add(id);
      totalPathCount += st.count;
    } else if (n.type === "narrative") {
      addState(n.next, st, st.count);
    } else {
      n.options.forEach(o => {
        if (!optionVisible(o, st.affinity)) return; // 隐藏选项不满足条件则不可见
        const sc = Object.assign({}, st.scores), fl = Object.assign({}, st.flags), af = Object.assign({}, st.affinity);
        const scored = Engine.applyOption(sc, fl, af, o);
        addState(o.next, { scores: sc, flags: fl, affinity: af, choices: st.choices + (scored ? 1 : 0) }, st.count);
      });
    }
  });
  layers[id] = null; // 释放内存
});

ok("全路径枚举无死局", allPaths.length > 0);
ok("四个结局均可达", endingsHit.size === 4);
ok("任意路径计分选择数恒为 12", allPaths.every(p => p.choices === 12));

const countOf = id => allPaths.filter(p => p.ending === id).reduce((a, p) => a + p.count, 0);
const countA = countOf("endingA");
const countB = countOf("endingB");
const countC = countOf("endingC");
const countD = countOf("endingD");
console.log("  路径分布: A=" + countA + " B=" + countB + " C=" + countC + " D=" + countD +
  " （合计 " + totalPathCount + "，不同终态 " + allPaths.length + "）");
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
const computeMBTI = Engine.computeCode;
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

// ---------- [6] 平行题库、前置回响与场景光照验证 ----------
console.log("\n[6] 平行题库 (altOptions) · 前置回响 (preVariants) · 场景光照");
const altNodes = STORY.filter(n => n.altText || n.altOptions);
ok("公共线 9 道计分题均配备平行题库", altNodes.length === 9);
altNodes.forEach(n => {
  const sameShape = Array.isArray(n.altOptions) && n.altOptions.length === n.options.length &&
    n.altOptions.every((ao, i) => {
      const o = n.options[i];
      return ao.text && ao.feedback && ao.next === o.next &&
        JSON.stringify(ao.scores || null) === JSON.stringify(o.scores || null) &&
        JSON.stringify(ao.flags || null) === JSON.stringify(o.flags || null) &&
        JSON.stringify(ao.affinity || null) === JSON.stringify(o.affinity || null);
    });
  ok(n.id + " 平行题库与原题计分/旗标/好感/跳转完全等价", sameShape);
});

// 验证 Engine.resolveNode 在平行题库与前置旗标下的表现
{
  const maskAllAlt = {};
  altNodes.forEach(n => { maskAllAlt[n.id] = true; });
  const r0 = Engine.resolveNode(NODES["ch1"], {}, {});
  const r1 = Engine.resolveNode(NODES["ch1"], {}, maskAllAlt);
  ok("Engine.resolveNode 可正确切换原题与平行题库", r0.text !== r1.text && r0.options[0].text !== r1.options[0].text);
  const s1WithFlag = Engine.resolveNode(NODES["s1"], { flag_loud: true }, {});
  ok("Engine.resolveNode 可将 preVariants 即时回响织入正文", s1WithFlag.text.indexOf(NODES["s1"].preVariants[0].text) === 0);
}

// 验证所有 preVariants 引用的 flag 均在某处可产生
{
  const allFlags = new Set();
  STORY.forEach(n => n.type === "choice" && n.options.forEach(o => (o.flags || []).forEach(f => allFlags.add(f))));
  const badPre = [];
  STORY.forEach(n => (n.preVariants || []).forEach(pv => { if (!allFlags.has(pv.flag)) badPre.push(n.id + ":" + pv.flag); }));
  ok("所有 preVariants 旗标均有对应来源选项", badPre.length === 0);
}

// 验证所有节点均配置了合法的 lighting 场景光照预设
{
  const validLight = new Set(["foyer", "banquet", "study", "mirror", "guest", "garden", "dawn"]);
  ok("全部节点均配置合法 lighting 场景光照", STORY.every(n => validLight.has(n.lighting)));
}

// 验证 C 线结局主体扩充后不再单薄
{
  const endC = NODES["endingC"];
  const cLen = Array.from(endC.body + endC.baseText).length;
  ok("endingC 主体正文充实（≥120 字，实际 " + cLen + " 字）", cLen >= 120);
}

// ---------- [7] 友人请柬种子编解码 · 前客余温 · 双人同席合盘验证 ----------
console.log("\n[7] 友人请柬种子编解码 · 前客余温 · 双人同席合盘 (16×16×4×4)");
{
  const sampleFlags = { flag_quiet: true, flag_detail: true, flag_return: true };
  const seed = Engine.encodeInviteSeed("INTJ", "endingA", sampleFlags);
  ok("encodeInviteSeed 生成紧凑种子码", seed === "INTJ-A-13a");

  const parsedFromHash = Engine.parseInviteSeed("https://mist.gchkc.top/#invite=" + seed);
  ok("parseInviteSeed 可从完整 URL Hash 解析邀请人信息与 3 枚轨迹",
    parsedFromHash && parsedFromHash.code === "INTJ" && parsedFromHash.endingKey === "A" &&
    parsedFromHash.footprints.length === 3 && parsedFromHash.flags.flag_detail === true);

  const parsedShort = Engine.parseInviteSeed("enfp-b");
  ok("parseInviteSeed 支持大小写不敏感的简写种子 (enfp-b)",
    parsedShort && parsedShort.code === "ENFP" && parsedShort.endingId === "endingB");

  ok("parseInviteSeed 对非法种子安全返回 null",
    Engine.parseInviteSeed("XXXX-A") === null && Engine.parseInviteSeed("") === null);

  // 验证 ch2 / ch5 / ch6 前客余温织入
  const ch2WithInv = Engine.resolveNode(NODES["ch2"], {}, {}, parsedFromHash);
  const ch5WithInv = Engine.resolveNode(NODES["ch5"], {}, {}, parsedFromHash);
  const ch6WithInv = Engine.resolveNode(NODES["ch6"], {}, {}, parsedFromHash);
  ok("resolveNode 在 ch2/ch5/ch6 织入对应邀请人的〔前客余温〕",
    ch2WithInv.text.indexOf("〔前客余温〕") >= 0 &&
    ch5WithInv.text.indexOf("〔前客余温〕") >= 0 &&
    ch6WithInv.text.indexOf("随主人步入了书房") >= 0);

  // 枚举全部 16 × 16 × 4 × 4 = 4096 种双人合盘组合
  const types = Object.keys(MBTI_TYPES);
  const ends = ["A", "B", "C", "D"];
  const bondTitles = new Set();
  const routeTitles = new Set();
  let allValid = true;
  types.forEach(t1 => {
    ends.forEach(e1 => {
      types.forEach(t2 => {
        ends.forEach(e2 => {
          const b = Engine.computeBond({ code: t1, endingKey: e1 }, { code: t2, endingKey: e2 });
          if (!b || !b.title || !b.resonance || !b.desc || !b.routeTitle || !b.routeDesc) {
            allValid = false;
          } else {
            bondTitles.add(b.title);
            routeTitles.add(b.routeTitle);
          }
        });
      });
    });
  });
  ok("4096 种双人合盘组合全部生成有效判词与路线跋文", allValid);
  ok("覆盖全部 8 种人格关系原型与 9 种结局交汇原型", bondTitles.size === 8 && routeTitles.size === 9);
}

console.log("\n[8] 烛光显影术（炙烤密文 ch2/ch4/A0 + 镜厅吹熄蜡烛 B1）");
{
  const sCh2 = Engine.getCandleSecret("ch2");
  const sCh4 = Engine.getCandleSecret("ch4");
  const sA0  = Engine.getCandleSecret("A0");
  const sB1  = Engine.getCandleSecret("B1");
  ok("ch2/ch4/A0 配置为 roast 炙烤显影模式，B1 配置为 blow 吹熄蜡烛模式",
    sCh2 && sCh2.mode === "roast" &&
    sCh4 && sCh4.mode === "roast" &&
    sA0 && sA0.mode === "roast" &&
    sB1 && sB1.mode === "blow" &&
    Engine.getCandleSecret("ch1") === null);

  const cFlags = { flag_secret_canvas: true, flag_candle_blown: true };
  const fp = Engine.buildFootprints(cFlags);
  ok("烛光显影旗标可提炼为专属考据足迹印章",
    fp.indexOf("炙烤画布显影当票") >= 0 && fp.indexOf("吹熄烛火窥见镜渊") >= 0);

  const endBText = Engine.buildEndingText(NODES["endingB"], cFlags);
  ok("buildEndingText 将烛光显影发现的密文回响织入结局正文",
    endBText.indexOf("画布背面被烛火烘出的那行当票编号") >= 0 &&
    endBText.indexOf("在镜厅吹熄烛火的那两秒极暗里") >= 0);
}

console.log("\n[9] 潜意识行为侧写 (Micro-Telemetry) · 命运证物陈列匣 (Relic Cabinet)");
{
  const shEntj = Engine.computeShadowProfile("ENTJ", { hoverSwitches: 8, undoCount: 3 });
  ok("ENTJ 高游移+悔棋触发「表象 ENTJ · 潜影 INFP」维恩手写暗批",
    shEntj.surfaceCode === "ENTJ" &&
    shEntj.shadowCode === "INFP" &&
    shEntj.tag === "表象 ENTJ · 潜影 INFP" &&
    shEntj.note.indexOf("8 次游移") >= 0 &&
    shEntj.note.indexOf("3 次拨回怀表") >= 0);

  let allShadowsValid = true;
  const sampleTelemetries = [
    {},
    { hoverSwitches: 6, undoCount: 0 },
    { hoverSwitches: 1, undoCount: 2 },
    { skipCount: 5, quickCount: 8 },
    { hesitateCount: 3, totalThinkMs: 40000 },
    { candleCount: 2, totalThinkMs: 22000 }
  ];
  Object.keys(MBTI_TYPES).forEach(code => {
    sampleTelemetries.forEach(tm => {
      const sp = Engine.computeShadowProfile(code, tm);
      if (!sp || !MBTI_TYPES[sp.surfaceCode] || !MBTI_TYPES[sp.shadowCode] || !sp.tag || !sp.note) {
        allShadowsValid = false;
      }
    });
  });
  ok("16 型人格 × 6 类微动作侧写模板全部生成合法表里双生人格与暗批", allShadowsValid);

  ok("RELIC_CABINET 包含 8 件古董证物且 RELIC_RESONANCE 配置三件套八音盒短笺",
    Array.isArray(Engine.RELIC_CABINET) && Engine.RELIC_CABINET.length === 8 &&
    Engine.RELIC_RESONANCE && Engine.RELIC_RESONANCE.requiredRelics.length === 3 &&
    Engine.RELIC_RESONANCE.letterBody.indexOf("艾德琳") >= 0);

  const unlockedRelics = Engine.matchRelicsFromFlags({
    flag_photo: true,
    flag_detail: true,
    flag_guest: true,
    flag_mercy: true
  });
  ok("matchRelicsFromFlags 准确映射对应的古董证物 ID",
    unlockedRelics.indexOf("relic_photo") >= 0 &&
    unlockedRelics.indexOf("relic_frame") >= 0 &&
    unlockedRelics.indexOf("relic_guest") >= 0 &&
    unlockedRelics.indexOf("relic_shatter") >= 0);
}

// ---------- [10] 抽样 ----------
console.log("\n[10] 抽样路径");
// 找一条 D 线路径打印
const dPath = allPaths.find(p => p.ending === "endingD");
console.log("  隐藏结局样例 → MBTI: " + computeMBTI(dPath.scores) +
  " · 好感度: 主人" + dPath.affinity.master + "/沈" + dPath.affinity.shen +
  " · 旗标: " + Object.keys(dPath.flags).slice(0, 6).join(",") + "…");

console.log("\n==============================");
console.log("通过 " + pass + " 项，失败 " + fail + " 项 · 总路径数 " + totalPathCount);
process.exit(fail === 0 ? 0 : 1);
