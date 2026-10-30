/* ============================================================
   迷雾庄园 · 结局名片绘制与分享模块（Canvas 生成 1080×1560 PNG）
   包含：跨浏览器像素级居中字距排版、本局专属印记、内置矢量二维码
   ============================================================ */
(function (root) {
  "use strict";

  var SHARE_URL = "mist.gchkc.top";
  // 中文排版禁则：行首不允许出现的标点
  var NO_LINE_START = "，。、；：！？）」』”’…—,.;:!?)";

  // ISO/IEC 18004 Version 2-L (25×25) 矩阵，编码内容: "https://mist.gchkc.top"
  var QR_ROWS = [
    33441535, 17072961, 24453981, 24416349, 24419933,
    17069633, 33510911, 76288,    31398852, 2211265,
    24473655, 28891154, 16017867, 7070025,  18221159,
    10743122, 22485496, 81691,    33535835, 17111323,
    24454651, 24421180, 24447633, 17146650, 33526115
  ];

  // 跨浏览器精确水平居中 + 字间距绘制（彻底规避 ctx.letterSpacing 兼容性与尾部偏移 Bug）
  function drawCenteredText(ctx, text, centerX, y, spacing) {
    var chars = Array.from(String(text || ""));
    if (!chars.length) return;
    var sp = spacing || 0;
    ctx.save();
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
    if (sp === 0 || chars.length === 1) {
      ctx.textAlign = "center";
      ctx.fillText(chars.join(""), centerX, y);
      ctx.restore();
      return;
    }
    var widths = chars.map(function (ch) { return ctx.measureText(ch).width; });
    var totalW = widths.reduce(function (a, b) { return a + b; }, 0) + sp * (chars.length - 1);
    var curX = centerX - totalW / 2;
    ctx.textAlign = "left";
    chars.forEach(function (ch, idx) {
      ctx.fillText(ch, curX, y);
      curX += widths[idx] + sp;
    });
    ctx.restore();
  }

  function wrapLines(ctx, text, maxW) {
    var lines = [];
    var line = "";
    ctx.save();
    if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
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
    ctx.restore();
    if (line) lines.push(line);
    return lines;
  }

  function drawQrCode(ctx, x, y, size, goldSoft, ink) {
    var N = 25;
    var quiet = 2;
    var totalMods = N + quiet * 2;
    var cell = Math.floor(size / totalMods);
    var boxSize = cell * totalMods;
    var ox = x + Math.round((size - boxSize) / 2);
    var oy = y + Math.round((size - boxSize) / 2);

    // 羊皮纸浅底衬垫（保证微信/小红书长按识图与相机扫码对比度）
    ctx.save();
    ctx.fillStyle = ink || "#e8e2d4";
    ctx.fillRect(ox, oy, boxSize, boxSize);
    ctx.strokeStyle = goldSoft || "#a38b55";
    ctx.lineWidth = 2;
    ctx.strokeRect(ox - 4, oy - 4, boxSize + 8, boxSize + 8);

    ctx.fillStyle = "#120f1c";
    for (var r = 0; r < N; r++) {
      var rowBits = QR_ROWS[r];
      for (var c = 0; c < N; c++) {
        if ((rowBits >>> (N - 1 - c)) & 1) {
          ctx.fillRect(ox + (c + quiet) * cell, oy + (r + quiet) * cell, cell, cell);
        }
      }
    }
    ctx.restore();
  }

  function renderCardCanvas(opts) {
    var m = opts.mbti;
    var endingTitle = opts.endingTitle || "";
    var scores = opts.scores || {};
    var dims = opts.dims || [];
    var footprints = opts.footprints || [];
    var collectionSummary = opts.collectionSummary || "";
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

    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = gold; ctx.font = "40px " + serif;
    drawCenteredText(ctx, "迷雾庄园", W / 2, 162, 12);
    ctx.fillStyle = dim; ctx.font = "26px " + serif;
    drawCenteredText(ctx, "晚宴为你写下的画像", W / 2, 214, 4);
    ctx.fillStyle = ink; ctx.font = "44px " + serif;
    drawCenteredText(ctx, endingTitle, W / 2, 308, 8);

    // 分隔线
    ctx.strokeStyle = goldSoft; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(W / 2 - 160, 352); ctx.lineTo(W / 2 + 160, 352); ctx.stroke();

    // 人格代号（精确跨浏览器居中，无偏移）
    ctx.fillStyle = gold; ctx.font = "190px " + latin;
    drawCenteredText(ctx, m.code, W / 2, 556, 20);
    ctx.fillStyle = ink; ctx.font = "56px " + serif;
    drawCenteredText(ctx, m.name, W / 2, 652, 10);
    ctx.fillStyle = gold; ctx.font = "34px " + serif;
    var roleLines = wrapLines(ctx, "「" + m.role + "」", W - 240);
    var y = 724;
    roleLines.forEach(function (l) { drawCenteredText(ctx, l, W / 2, y, 2); y += 50; });

    // 描述
    ctx.fillStyle = dim; ctx.font = "30px " + serif;
    y += 18;
    wrapLines(ctx, m.desc, W - 260).slice(0, 5).forEach(function (l) {
      drawCenteredText(ctx, l, W / 2, y, 1);
      y += 50;
    });

    // 四维度倾向条（含百分比）
    y += 28;
    dims.forEach(function (d) {
      var l = scores[d.left] || 0, r = scores[d.right] || 0, total = l + r;
      if (total <= 0) return;
      var pctR = Math.round((r / total) * 100);
      var pctL = 100 - pctR;
      var x0 = 310, x1 = W - 310;
      ctx.font = "bold 28px " + latin;
      ctx.textAlign = "right";
      ctx.fillStyle = l > r ? gold : dim;
      ctx.fillText(d.left + " " + pctL + "%", x0 - 24, y + 11);
      ctx.textAlign = "left";
      ctx.fillStyle = r > l ? gold : dim;
      ctx.fillText(pctR + "% " + d.right, x1 + 24, y + 11);
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.fillRect(x0, y, x1 - x0, 8);
      ctx.fillStyle = gold;
      if (l >= r) {
        ctx.fillRect(x0, y, (x1 - x0) * (pctL / 100), 8);
      } else {
        var w = (x1 - x0) * (pctR / 100);
        ctx.fillRect(x1 - w, y, w, 8);
      }
      y += 56;
    });

    // 本局专属晚宴轨迹印记（个性化签条）
    if (footprints.length > 0) {
      y += 18;
      var tagText = "今夜轨迹 · " + footprints.join("  |  ");
      ctx.font = "24px " + serif;
      ctx.fillStyle = gold;
      drawCenteredText(ctx, tagText, W / 2, y, 2);
    }

    // 底部分隔细线 + 左侧传播文案 + 右侧矢量二维码
    var footerTop = H - 268;
    ctx.strokeStyle = "rgba(201, 169, 106, 0.28)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(120, footerTop); ctx.lineTo(W - 120, footerTop); ctx.stroke();

    ctx.textAlign = "left";
    ctx.fillStyle = gold; ctx.font = "30px " + serif;
    ctx.fillText("来迷雾庄园，赴一场十六型人格晚宴", 120, footerTop + 62);
    ctx.fillStyle = ink; ctx.font = "26px " + latin;
    ctx.fillText("https://" + SHARE_URL, 120, footerTop + 108);
    ctx.fillStyle = dim; ctx.font = "22px " + serif;
    var subFooter = collectionSummary
      ? (collectionSummary + " · 扫码或长按识别赴宴")
      : "趣味互动叙事 · 扫码或长按识别赴宴";
    ctx.fillText(subFooter, 120, footerTop + 150);

    // 绘制 145×145 矢量二维码于右下角
    drawQrCode(ctx, W - 268, footerTop + 22, 145, goldSoft, ink);

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
