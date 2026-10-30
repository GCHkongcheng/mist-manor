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
  assert("标题屏雨声胶囊按钮存在", !!document.getElementById("title-rain-btn"));
  assert("字号缩放预设生效", document.body.dataset.font === "large");

  // 2. 开局首局（第 1 套题库）
  document.getElementById("start-btn").click();
  assert("首次进入显示印章微引导", !document.getElementById("toolbar-guide").classList.contains("hidden"));
  assert("开局光照为门厅 foyer", document.body.dataset.lighting === "foyer");

  // prologue -> ch1
  var cont1 = document.querySelector("#options .btn-ghost");
  assert("叙事节点显示继续按钮", !!cont1);
  cont1.click();

  var ch1Run1Text = document.getElementById("story-text").textContent;
  assert("首局 ch1 使用第 1 套题干", ch1Run1Text.indexOf("铜狮") >= 0);

  // 点击第一个选项 -> 验证可控反馈
  var opt0 = document.querySelector(".option-card");
  opt0.click();

  setTimeout(function () {
    var fb = document.querySelector("#options .feedback");
    var fbContinue = document.querySelector("#options .btn-ghost");
    assert("选后展示反馈且由继续按钮控制节奏", !!fb && !!fbContinue);
    assert("做出选择后印章引导自动收起", document.getElementById("toolbar-guide").classList.contains("hidden"));

    // 推进到 s1，检查 preVariants 即时回响
    fbContinue.click();
    var s1Text = document.getElementById("story-text").textContent;
    assert("s1 正文织入 ch1 的前置旗标回响 (preVariants)", s1Text.indexOf("余音未散") >= 0);

    // 测历史面板「回溯至此」按钮与三槽位手动存档
    document.getElementById("settings-btn").click();
    document.getElementById("contrast-toggle").click();
    assert("高对比度开关生效", document.body.classList.contains("high-contrast"));
    document.querySelector('.slot-item[data-slot="0"] .slot-save').click();
    var slot0Text = document.querySelector('.slot-item[data-slot="0"] .slot-name').textContent;
    assert("三槽位手动存档可写入槽一", slot0Text.indexOf("空") < 0);
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

    // 快速走完第一局直达结局
    var guard = 0;
    var stepTimer = setInterval(function () {
      guard++;
      if (!document.getElementById("result-screen").classList.contains("hidden") || guard > 200) {
        clearInterval(stepTimer);
        assert("第一局顺利抵达结局屏", !document.getElementById("result-screen").classList.contains("hidden"));
        var barText = document.getElementById("mbti-bars").textContent;
        assert("结局维度条显示百分比", barText.indexOf("%") >= 0);

        // 点击「再赴晚宴」开启二周目，验证平行题库启用
        document.getElementById("again-btn").click();
        document.querySelector("#options .btn-ghost").click(); // 跳过 prologue
        var ch1Run2Text = document.getElementById("story-text").textContent;
        assert("二周目 ch1 自动切换为第 2 套平行题库", ch1Run2Text.indexOf("迎客钟") >= 0 && ch1Run2Text !== ch1Run1Text);
        finish();
        return;
      }
      var card = document.querySelector(".option-card:not(:disabled)");
      if (card) { card.click(); return; }
      var btn = document.querySelector("#options .btn-ghost:not(:disabled)");
      if (btn) { btn.click(); }
    }, 200);
  }, 420);
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
