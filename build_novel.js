// ============================================================
// 迷雾庄园 · 小说文档生成器
// 从 data.js（唯一真源）自动导出整篇可读的 NOVEL.md：
//   第一部 晚宴（公共线：代表路径 + 内联岔路）
//   第二~四章 A/B/C 线各自成篇（变体分「命中织入/其他回声」）
//   终章 D 线（隐藏结局，剧透预警）
//   尾注 16 型名片
// 剧情改动后重跑：node build_novel.js
// ============================================================
const fs = require("fs");
const path = require("path");
const vm = require("vm");

// ---------- 加载 data.js（与 test.js 相同方式） ----------
let code = fs.readFileSync(path.join(__dirname, "data.js"), "utf8");
code = code.replace("const STORY", "var STORY").replace("const MBTI_TYPES", "var MBTI_TYPES");
const ctx = {};
vm.runInNewContext(code, ctx);
const { STORY, MBTI_TYPES } = ctx;

const NODES = {};
STORY.forEach(n => { NODES[n.id] = n; });

// ---------- 代表路径：每个选择节点取第一个（可见）选项 ----------
function firstOption(node) {
  return node.options[0]; // requires 类隐藏选项在 ch6 排最后，不影响公共线/线内节点
}

// 沿代表路径收集旗标（供结局变体判定）
function collectFlags(startId, extra = []) {
  const flags = {};
  extra.forEach(f => { flags[f] = true; });
  let id = startId;
  while (id && NODES[id]) {
    const n = NODES[id];
    if (n.type === "ending") break;
    if (n.type === "narrative") { id = n.next; continue; }
    const o = firstOption(n);
    if (o.flags) o.flags.forEach(f => { flags[f] = true; });
    id = o.next;
  }
  return flags;
}

// ---------- 旗标 → 来源选项（用于变体因果标注） ----------
const FLAG_SOURCE = {};
STORY.forEach(n => {
  if (n.type !== "choice") return;
  n.options.forEach(o => (o.flags || []).forEach(f => {
    if (FLAG_SOURCE[f]) return;
    const t = o.text.replace(/[「」]/g, "");
    FLAG_SOURCE[f] = t.length > 18 ? t.slice(0, 18) + "…" : t;
  }));
});

// ---------- 文本块 ----------
const out = [];
function w(line) { out.push(line); }
function blank() { out.push(""); }

function sectionTitle(chapter) {
  if (!chapter) return;
  w("### " + chapter);
  blank();
}

// 呈现一个选择节点：正文 → 代表选项（你的行动）→ 反馈 → 内联岔路
function renderChoice(node) {
  sectionTitle(node.chapter);
  w(node.text);
  blank();
  const main = firstOption(node);
  // 代表选项织入正文（斜体强调这是「你」的行动）
  w("*" + main.text + "*");
  blank();
  if (main.feedback) { w(main.feedback); blank(); }
  // 内联岔路：其余选项
  const alts = node.options.filter(o => o !== main);
  if (alts.length) {
    alts.forEach(o => {
      const tag = o.hidden ? "〔岔路 · 隐藏〕" : "〔岔路〕";
      w("> " + tag + " " + o.text);
      if (o.feedback) w("> ↳ " + o.feedback); // 保留未走分支的后果，读者可见另一种可能
    });
    blank();
  }
}

function renderNarrative(node) {
  sectionTitle(node.chapter);
  w(node.text);
  blank();
}

// ---------- 公共线（prologue → ch6，ch6 的三选一岔路单独处理） ----------
function renderCommonLine() {
  w("# 第一部 · 晚宴");
  blank();
  const order = ["prologue", "ch1", "s1", "n1", "ch2", "s2", "ch3", "s3", "n2", "ch4", "n3", "ch5", "s4", "n4", "n5"];
  order.forEach(id => {
    const n = NODES[id];
    if (n.type === "narrative") renderNarrative(n);
    else renderChoice(n);
  });
  // ch6 分流：呈现正文与全部岔路（含隐藏选项），不选代表项
  const ch6 = NODES["ch6"];
  sectionTitle(ch6.chapter);
  w(ch6.text);
  blank();
  ch6.options.forEach(o => {
    const tag = o.hidden ? "> 〔岔路 · 隐藏〕" : "> 〔岔路〕";
    w(tag + " " + o.text);
  });
  blank();
}

// ---------- 单条剧情线成篇 ----------
function renderLine(lineStartId, endingId, chapterTitle, premise) {
  w("---");
  blank();
  w(chapterTitle);
  blank();
  if (premise) {
    w("> " + premise);
    blank();
  }
  // 线内节点（不含结局）
  let id = lineStartId;
  while (id && NODES[id] && NODES[id].type !== "ending") {
    const n = NODES[id];
    if (n.type === "narrative") {
      renderNarrative(n);
      id = n.next;
    } else {
      renderChoice(n);
      id = firstOption(n).next;
    }
  }
  // 结局：命中变体织入正文，未命中进「其他回声」
  const ending = NODES[endingId];
  // 命中旗标 = 公共线代表路径 + 本线代表路径
  const flags = collectFlags("prologue");
  const lineFlags = collectFlags(lineStartId);
  Object.keys(lineFlags).forEach(f => { flags[f] = true; });

  w("### 结局 · " + ending.endingTitle.replace(/^结局[一二三四] · /, ""));
  blank();
  w(ending.body);
  blank();
  const hit = [], miss = [];
  ending.variants.forEach(v => (flags[v.flag] ? hit : miss).push(v));
  if (hit.length) {
    hit.forEach(v => { w(v.text); blank(); });
  }
  if (miss.length) {
    w("#### 〔这一夜的其他回声〕");
    blank();
    w("*若你当夜走了别的路，结局还会记得这些——*");
    blank();
    miss.forEach(v => {
      const src = FLAG_SOURCE[v.flag];
      w("- " + (src ? "〔若你曾「" + src + "」〕" : "") + v.text); // 变体按因果标注来源选择
    });
    blank();
  }
  w(ending.baseText);
  blank();
}

// ---------- 尾注：16 型名片 ----------
function renderMbtiAppendix() {
  w("---");
  blank();
  w("# 尾注 · 名片夹里的十六种客人");
  blank();
  w("*晚宴为每一种人格都备好了一张名片。你的那张，只由你自己的选择写就。*");
  blank();
  const ORDER = ["INTJ","INTP","ENTJ","ENTP","INFJ","INFP","ENFJ","ENFP","ISTJ","ISFJ","ESTJ","ESFJ","ISTP","ISFP","ESTP","ESFP"];
  ORDER.forEach(c => {
    const t = MBTI_TYPES[c];
    if (!t) return;
    w("**" + t.code + " · " + t.name + "** — " + t.role);
    blank();
    w(t.desc);
    blank();
  });
}

// ---------- 组装 ----------
w("# 迷雾庄园");
blank();
w("*一场测出你 MBTI 的晚宴 · 完整剧情*");
blank();
w("> 本文档由 `build_novel.js` 从 `data.js` 自动生成——与游戏内容永远一致，改剧情后重跑一次即可。");
w("> 正文沿每条线的一条代表路径展开；**〔岔路〕**为该处未走的其他选择；结局中**〔这一夜的其他回声〕**为未触发的旗标变体段落。");
w("> ⚠️ 终章为隐藏结局，含全局剧透，建议游玩后阅读。");
blank();

// 目录
w("## 目录");
blank();
[
  "第一部 · 晚宴（公共线）",
  "第二部 · 真相之夜（书房线）",
  "第三部 · 门后（镜厅线）",
  "第四部 · 过客（回房线）",
  "终章 · 归还（隐藏线，剧透预警）",
  "尾注 · 名片夹里的十六种客人"
].forEach((t, i) => w((i + 1) + ". " + t));
blank();

// 人物表与时间线
w("## 人物表");
blank();
[
  "**你** —— 受邀的赴宴者。你是谁，只由你的选择写就。",
  "**维恩先生（主人）** —— 庄园的主人，艾德琳的父亲。百年间从不见客，今年是他第一次亲自出面。深夜守夜、亲手放下托盘的，也是他。",
  "**沈先生** —— 当年那名少年仆人的后人，带着被保存了一百年的银匙而来。他不是来偷的，是来还的。",
  "**艾德琳** —— 1887 年冬在后园井台救起少年、自己没能上来的独女。画中背影、镜厅里的女子、窗台上数乱了又重头数的纸星星，都是她。",
  "**灰斗篷（说书人）** —— 年年赴宴、替主人致辞，一百年里把这个故事讲了无数遍，也润了无数遍色。",
  "**披肩的女客** —— 头一回赴宴的年轻人，那位无名画家的曾孙女。她想替曾祖父，补一张正脸。"
].forEach(l => w("- " + l));
blank();
w("> **时间**：1987 年 11 月 3 日，距那个冬天恰好一百年。**地点**：浓雾中的维多利亚式庄园。");
blank();
w("---");
blank();

renderCommonLine();

renderLine(
  "A0", "endingA",
  "# 第二部 · 真相之夜（书房线）",
  "*那一夜，你随主人步入了书房。*"
);
renderLine(
  "B0", "endingB",
  "# 第三部 · 门后（镜厅线）",
  "*那一夜，你循着长廊尽头那一线蓝光，独自探去。*"
);
renderLine(
  "C0", "endingC",
  "# 第四部 · 过客（回房线）",
  "*那一夜，你道过晚安，回房歇息。*"
);
renderLine(
  "D0", "endingD",
  "# 终章 · 归还（隐藏线）",
  "*本章前提：晚宴中，你对主人与沈先生的好感各 ≥2——克制、打圆场、讲理、接近他。处世方式决定这扇门是否为你而开。*"
);

renderMbtiAppendix();

// ---------- 写文件 ----------
const md = out.join("\n") + "\n";
fs.writeFileSync(path.join(__dirname, "NOVEL.md"), md, "utf8");

// ---------- 统计（避免 PowerShell 内联中文问题，输出走文件句柄正常） ----------
const nodes = STORY.length;
const choices = STORY.filter(n => n.type === "choice").length;
const variants = STORY.filter(n => n.type === "ending").reduce((s, e) => s + e.variants.length, 0);
const chars = md.replace(/\s/g, "").length;
console.log("NOVEL.md generated: " + nodes + " nodes / " + choices + " choice nodes / " + variants + " variants / " + chars + " chars");
