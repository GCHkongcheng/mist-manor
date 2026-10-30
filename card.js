/* ============================================================
   迷雾庄园 · 结局名片绘制与分享模块（Canvas 生成 1080×1560 PNG）
   ============================================================ */
(function (root) {
  "use strict";

  var SHARE_URL = "mist.gchkc.top";
  // 中文排版禁则：行首不允许出现的标点
  var NO_LINE_START = "，。、；：！？）」』”’…—,.;:!?)";

  function wrapLines(ctx, text, maxW) {
    var lines = [];
    var line = "";
    Array.from(text || "").forEach(function (ch) {
      if (ch === "\n") { lines.push(line); line = ""; return; }
      var t = line + ch;
      if (ctx.measureText(t).width > maxW && line && NO_LINE_START.indexOf(ch) < 0) {
        lines.push(line);
        line = ch;
      } else {
        line = t;
      }
    });
    if (line) lines.push(line);
    return lines;
  }

  function renderCardCanvas(opts) {
    var m = opts.mbti;
    var endingTitle = opts.endingTitle || "";
    var scores = opts.scores || {};
    var dims = opts.dims || [];
    var W = 1080, H = 1560;
    var cv = document.createElement("canvas");
    cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d");
    var cs = getComputedStyle(document.body);
    var gold = cs.getPropertyValue("--gold").trim() || "#c9a96a";
    var goldSoft = cs.getPropertyValue("--gold-soft").trim() || "#a38b55";
    var ink = cs.getPropertyValue("--ink").trim() || "#e8e2d4";
    var dim = cs.getPropertyValue("--ink-dim").trim() || "#a39b8a";
    var serif = cs.getPropertyValue("--serif").trim() || "serif";
    var latin = cs.getPropertyValue("--latin").trim() || "Georgia, serif";

    // 背景 + 暗角
    var bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, "#15121f"); bg.addColorStop(1, "#0d0b14");
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    var vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.8);
    vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);

    // 双线边框
    ctx.strokeStyle = goldSoft; ctx.lineWidth = 3; ctx.strokeRect(44, 44, W - 88, H - 88);
    ctx.globalAlpha = 0.45; ctx.lineWidth = 1.5; ctx.strokeRect(66, 66, W - 132, H - 132);
    ctx.globalAlpha = 1;

    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "12px";
    ctx.fillStyle = gold; ctx.font = "40px " + serif;
    ctx.fillText("迷雾庄园", W / 2, 170);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "4px";
    ctx.fillStyle = dim; ctx.font = "28px " + serif;
    ctx.fillText("晚宴为你写下的画像", W / 2, 224);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "8px";
    ctx.fillStyle = ink; ctx.font = "46px " + serif;
    ctx.fillText(endingTitle, W / 2, 330);

    // 分隔线
    ctx.strokeStyle = goldSoft; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W / 2 - 160, 380); ctx.lineTo(W / 2 + 160, 380); ctx.stroke();

    // 人格代号
    if ("letterSpacing" in ctx) ctx.letterSpacing = "20px";
    ctx.fillStyle = gold; ctx.font = "200px " + latin;
    ctx.fillText(m.code, W / 2 + 10, 600);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "10px";
    ctx.fillStyle = ink; ctx.font = "60px " + serif;
    ctx.fillText(m.name, W / 2, 704);
    if ("letterSpacing" in ctx) ctx.letterSpacing = "2px";
    ctx.fillStyle = gold; ctx.font = "36px " + serif;
    var roleLines = wrapLines(ctx, "「" + m.role + "」", W - 240);
    var y = 780;
    roleLines.forEach(function (l) { ctx.fillText(l, W / 2, y); y += 52; });

    // 描述
    if ("letterSpacing" in ctx) ctx.letterSpacing = "1px";
    ctx.fillStyle = dim; ctx.font = "32px " + serif;
    y += 24;
    wrapLines(ctx, m.desc, W - 280).slice(0, 7).forEach(function (l) { ctx.fillText(l, W / 2, y); y += 54; });

    // 四维度倾向条（含百分比）
    y += 36;
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    dims.forEach(function (d) {
      var l = scores[d.left] || 0, r = scores[d.right] || 0, total = l + r;
      if (total <= 0) return;
      var pctR = Math.round((r / total) * 100);
      var pctL = 100 - pctR;
      var x0 = 310, x1 = W - 310;
      ctx.font = "bold 30px " + latin;
      ctx.textAlign = "right";
      ctx.fillStyle = l > r ? gold : dim;
      ctx.fillText(d.left + " " + pctL + "%", x0 - 24, y + 12);
      ctx.textAlign = "left";
      ctx.fillStyle = r > l ? gold : dim;
      ctx.fillText(pctR + "% " + d.right, x1 + 24, y + 12);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(x0, y, x1 - x0, 8);
      ctx.fillStyle = gold;
      if (l >= r) {
        ctx.fillRect(x0, y, (x1 - x0) * (pctL / 100), 8);
      } else {
        var w = (x1 - x0) * (pctR / 100);
        ctx.fillRect(x1 - w, y, w, 8);
      }
      y += 62;
    });

    // 页脚
    ctx.textAlign = "center";
    if ("letterSpacing" in ctx) ctx.letterSpacing = "3px";
    ctx.fillStyle = gold; ctx.font = "30px " + serif;
    ctx.fillText("来迷雾庄园，赴一场测出你十六型人格的晚宴", W / 2, H - 190);
    ctx.fillStyle = dim; ctx.font = "28px " + latin;
    ctx.fillText(SHARE_URL, W / 2, H - 140);
    ctx.font = "22px " + serif;
    ctx.fillText("趣味互动叙事 · 仅供娱乐，非专业心理测评", W / 2, H - 104);
    return cv;
  }

  function saveCardImage(opts, cardBtn) {
    var code = opts.mbti.code;
    var filename = "迷雾庄园-" + code + ".png";
    cardBtn.disabled = true;
    cardBtn.textContent = "生成中…";
    var done = function (msg) {
      cardBtn.textContent = msg;
      cardBtn.disabled = false;
      setTimeout(function () { cardBtn.textContent = "保存名片图"; }, 1800);
    };
    renderCardCanvas(opts).toBlob(function (blob) {
      if (!blob) { done("生成失败"); return; }
      var download = function () {
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
        done("已保存");
      };
      try {
        var file = new File([blob], filename, { type: "image/png" });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          navigator.share({ files: [file], title: "迷雾庄园 · " + code })
            .then(function () { done("已分享"); })
            .catch(function (err) {
              if (err && err.name === "AbortError") { done("保存名片图"); return; }
              download();
            });
          return;
        }
      } catch (e) {}
      download();
    }, "image/png");
  }

  root.CardExporter = {
    renderCardCanvas: renderCardCanvas,
    saveCardImage: saveCardImage
  };
})(typeof self !== "undefined" ? self : this);
