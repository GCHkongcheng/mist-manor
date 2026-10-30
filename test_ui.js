// ============================================================
// 迷雾庄园 · 无头浏览器 UI 冒烟测试
// 验证：印章微引导 / 选后可控继续 / 前置旗标回响 / 撤销不重复入史 /
//      二周目平行题库自动启用 / 场景光照切换 / 结局维度百分比与名片导出
// 运行：node test_ui.js
// ============================================================
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");

const EDGE_PATHS = [
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
];
const browser = EDGE_PATHS.find(p => fs.existsSync(p));
if (!browser) {
  console.log("未检测到 Edge/Chrome，跳过无头浏览器 UI 冒烟测试。");
  process.exit(0);
}

const rootDir = __dirname.replace(/\\/g, "/");
const html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

const driverScript = `
<base href="file:///${rootDir}/">
<script>
  localStorage.clear();
  localStorage.setItem("mist_manor_settings", JSON.stringify({
    speed: "instant", font: "large", sfx: false, rain: false, volume: 0.8, auto: false, skipRead: false
  }));
</script>
`;

const testScript = `
<script>
(function () {
  var results = [];
  function assert(name, cond) {
    results.push((cond ? "PASS: " : "FAIL: ") + name);
  }
  function finish() {
    var pre = document.createElement("pre");
    pre.id = "ui-test-result";
    pre.textContent = results.join("\\n");
    document.body.appendChild(pre);
  }

  // 1. 标题屏检查
  var rainPill = document.getElementById("title-rain-btn");
  assert("标题屏雨声胶囊按钮存在", !!rainPill);
  rainPill.click();
  var sfxOff = document.getElementById("sfx-toggle").getAttribute("aria-pressed") === "false";
  assert("标题屏开关夜雨声不篡改独立音效开关", rainPill.getAttribute("aria-pressed") === "true" && sfxOff);
  rainPill.click();
  assert("字号缩放预设生效", document.body.dataset.font === "large");

  // 2. 开局首局（第 1 套题库 + 火漆信封开场仪式 + 烛光实时摇曳交互）
  document.getElementById("start-btn").click();
  assert("首次进入显示印章微引导", !document.getElementById("toolbar-guide").classList.contains("hidden"));
  assert("开局光照为门厅 foyer", document.body.dataset.lighting === "foyer");
  var waxEnv = document.getElementById("wax-envelope");
  var waxBtn = document.getElementById("wax-seal-btn");
  assert("序章展示火漆信封开场仪式", !waxEnv.classList.contains("hidden") && !waxEnv.classList.contains("unsealed"));
  waxBtn.click();
  assert("点击火漆印后信封启封展开", waxEnv.classList.contains("unsealed"));

  // 触发指针移动验证实时烛光摇曳交互
  var appEl = document.getElementById("app");
  appEl.dispatchEvent(new PointerEvent("pointerdown", { clientX: 260, clientY: 220, bubbles: true }));

  // prologue -> ch1
  var cont1 = document.querySelector("#options .btn-ghost");
  assert("叙事节点显示继续按钮", !!cont1);
  cont1.click();
  assert("进入第一章后火漆信封自动收起", waxEnv.classList.contains("hidden"));

  var ch1Run1Text = document.getElementById("story-text").textContent;
  assert("首局 ch1 使用第 1 套题干", ch1Run1Text.indexOf("铜狮") >= 0);

  // 点击第一个选项 -> 验证可控反馈
  var opt0 = document.querySelector(".option-card");
  opt0.click();

  setTimeout(function () {
    assert("实时烛光微交互随指针更新光斑坐标", appEl.style.getPropertyValue("--spot-opacity") === "1");
    var fb = document.querySelector("#options .feedback");
    var fbContinue = document.querySelector("#options .btn-ghost");
    var keptChosen = document.querySelectorAll("#options .option-card.chosen");
    assert("选后展示反馈且由继续按钮控制节奏", !!fb && !!fbContinue);
    assert("选后保留所选卡片定格（不断层清空）", keptChosen.length === 1);
    assert("做出选择后印章引导自动收起", document.getElementById("toolbar-guide").classList.contains("hidden"));

    // 推进到 s1，检查 preVariants 即时回响
    fbContinue.click();
    var s1Text = document.getElementById("story-text").textContent;
    assert("s1 正文织入 ch1 的前置旗标回响 (preVariants)", s1Text.indexOf("余音未散") >= 0);

    // 测历史面板「回溯至此」按钮与三槽位手动存档（含二次确认与内联备份导入）
    document.getElementById("settings-btn").click();
    document.getElementById("contrast-toggle").click();
    assert("高对比度开关生效", document.body.classList.contains("high-contrast"));
    var slot0SaveBtn = document.querySelector('.slot-item[data-slot="0"] .slot-save');
    slot0SaveBtn.click();
    var slot0Text = document.querySelector('.slot-item[data-slot="0"] .slot-name').textContent;
    assert("三槽位手动存档可写入槽一并显示进度与时间", slot0Text.indexOf("空") < 0 && slot0Text.indexOf("/12问") >= 0);
    slot0SaveBtn.click();
    assert("已有存档槽位点击存触发二次覆盖确认", slot0SaveBtn.textContent === "覆盖?");
    slot0SaveBtn.click();
    assert("二次点击确认后完成覆盖并恢复按钮文案", slot0SaveBtn.textContent === "存");

    // 测试面板内联进度备份导入（无阻塞弹窗）
    document.getElementById("import-btn").click();
    var importBox = document.getElementById("import-box");
    assert("点击导入恢复展开内联输入框", !importBox.classList.contains("hidden"));
    document.getElementById("import-input").value = "invalid_base64";
    document.getElementById("import-confirm-btn").click();
    assert("内联导入对无效备份码给出即时状态提示", document.getElementById("import-status").textContent.indexOf("无效") >= 0);
    document.getElementById("settings-close").click();

    document.getElementById("history-btn").click();
    var countBefore = document.querySelectorAll("#history-list li").length;
    var jumpBtn = document.querySelector("#history-list .history-jump");
    assert("历史面板提供「回溯至此」跳转按钮", !!jumpBtn);
    jumpBtn.click();
    document.getElementById("history-btn").click();
    var countAfter = document.querySelectorAll("#history-list li").length;
    document.getElementById("history-close").click();
    assert("点击「回溯至此」后跳回对应章节且历史条数正确减少", countAfter < countBefore);

    // 快速走完第一局（ch6 选 B 线验证 **...** 解析为 <em class="story-em">，结局前切为快档验证结局轻提示）
    var guard = 0;
    var sawStoryEm = false;
    var stepTimer = setInterval(function () {
      guard++;
      var emEl = document.querySelector("#story-text em.story-em");
      if (emEl && emEl.textContent === "被记住的地方" && document.getElementById("story-text").textContent.indexOf("**") < 0) {
        sawStoryEm = true;
      }
      if (!document.getElementById("result-screen").classList.contains("hidden") || guard > 200) {
        clearInterval(stepTimer);
        assert("第一局顺利抵达结局屏", !document.getElementById("result-screen").classList.contains("hidden"));
        assert('**...** 解析为带金色微光样式的 <em class="story-em">', sawStoryEm);
        var skipHint = document.getElementById("ending-skip-hint");
        assert("结局打字期间底部显示明显跳过轻提示", !skipHint.classList.contains("hidden"));
        skipHint.click();
        var mbtiBox = document.getElementById("mbti-box");
        assert("点击结局轻提示后立即揭晓人格名片并收起提示",
          skipHint.classList.contains("hidden") && mbtiBox.classList.contains("mbti-show"));
        assert("名片初始展示正面家徽等待翻转", !mbtiBox.classList.contains("is-flipped"));
        document.getElementById("mbti-front").click();
        assert("点击拜访名片正面可 3D 翻转至背面人格画像", mbtiBox.classList.contains("is-flipped"));
        var barText = document.getElementById("mbti-bars").textContent;
        assert("结局维度条显示百分比", barText.indexOf("%") >= 0);

        // 验证结局图鉴与名片夹点击交互
        var unlockedCardSlot = document.querySelector("#cards-result .card-slot.unlocked");
        var lockedEndingSlot = document.querySelector("#gallery-result .gallery-slot:not(.unlocked)");
        var detailBox = document.getElementById("collection-detail-result");
        unlockedCardSlot.click();
        var cardPreviewOk = !detailBox.classList.contains("hidden") && detailBox.textContent.indexOf("已收录名片") >= 0;
        lockedEndingSlot.click();
        var cluePreviewOk = !detailBox.classList.contains("hidden") && detailBox.textContent.indexOf("解锁线索") >= 0;
        assert("点击收藏图鉴与名片夹可查看已解锁名片详情与未解锁结局线索", cardPreviewOk && cluePreviewOk);

        // 验证名片 Canvas 海报渲染（含专属轨迹与矢量二维码）
        var cv = window.CardExporter.renderCardCanvas({
          mbti: MBTI_TYPES["INTJ"],
          endingTitle: "结局二 · 门后",
          scores: { E: 1, I: 2.5, S: 1, N: 2.5, T: 2.5, F: 1, J: 2.5, P: 1 },
          dims: [{ left: "E", right: "I" }, { left: "S", right: "N" }, { left: "T", right: "F" }, { left: "J", right: "P" }],
          footprints: ["推门自报来意", "细辨1887画款", "推开纸星小门"],
          collectionSummary: "已解锁 1/4 结局 · 名片夹 1/16 型"
        });
        assert("Canvas 名片海报正常绘制（含本局轨迹与二维码）", cv && cv.width === 1080 && cv.height === 1560);

        // 切回立即档，点击「再赴晚宴」开启二周目，验证平行题库启用
        document.querySelector('#speed-seg button[data-speed="instant"]').click();
        document.getElementById("again-btn").click();
        document.querySelector("#options .btn-ghost").click(); // 跳过 prologue
        var ch1Run2Text = document.getElementById("story-text").textContent;
        assert("二周目 ch1 自动切换为第 2 套平行题库", ch1Run2Text.indexOf("迎客钟") >= 0 && ch1Run2Text !== ch1Run1Text);

        // 验证在选后反馈停留期间回封面再继续，不会重复累加题目进度与得分
        document.querySelectorAll(".option-card")[0].click();
        document.getElementById("settings-btn").click();
        document.getElementById("quit-btn").click();
        document.getElementById("continue-btn").click();
        assert("选后反馈期间回封面并继续，进度保持第 1 / 12 问不翻倍", document.getElementById("progress-label").textContent.indexOf("第 1 / 12 问") >= 0);

        finish();
        return;
      }
      var cards = document.querySelectorAll(".option-card:not(:disabled)");
      if (cards.length) {
        var chText = document.getElementById("chapter").textContent;
        if (chText.indexOf("第六章") >= 0 && cards[1]) {
          cards[1].click(); // 进 B 线以经过 B2 节点
          return;
        }
        if (chText.indexOf("门后 · 黎明前") >= 0) {
          // 进入结局前把打字速度切为 fast，验证结局打字期间的轻提示
          document.querySelector('#speed-seg button[data-speed="fast"]').click();
        }
        cards[0].click();
        return;
      }
      var btn = document.querySelector("#options .btn-ghost:not(:disabled)");
      if (btn) { btn.click(); }
    }, 180);
  }, 380);
})();
</script>
`;

const tmpFile = path.join(os.tmpdir(), "mist_manor_ui_test.html");
const outHtml = html
  .replace("<head>", "<head>" + driverScript)
  .replace("</body>", testScript + "</body>");
fs.writeFileSync(tmpFile, outHtml, "utf8");

const dom = execFileSync(browser, [
  "--headless=new",
  "--disable-gpu",
  "--virtual-time-budget=60000",
  "--dump-dom",
  "file:///" + tmpFile.replace(/\\/g, "/")
], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });

try { fs.unlinkSync(tmpFile); } catch (e) {}

const match = dom.match(/<pre id="ui-test-result">([\s\S]*?)<\/pre>/);
if (!match) {
  console.error("UI 冒烟测试未能完成执行");
  process.exit(1);
}
const lines = match[1].trim().split("\n");
let pass = 0, fail = 0;
lines.forEach(l => {
  if (l.startsWith("PASS:")) { pass++; console.log("  ✓ " + l.slice(6)); }
  else { fail++; console.log("  ✗ " + l.slice(6)); }
});
console.log("\nUI 冒烟测试：通过 " + pass + " 项，失败 " + fail + " 项");
process.exit(fail === 0 ? 0 : 1);
