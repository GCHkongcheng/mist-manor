/* ============================================================
   迷雾庄园 · 游戏逻辑（完整功能版）
   设置(打字速度/音效/Auto) / 存档续玩 / 撤销栈 / 键盘操作 /
   历史回看 / WebAudio 音效 / 双好感度 / 隐藏选项 /
   结局图鉴 / 交互隐喻 / 打字机 / MBTI 计算 / 复制分享
   ============================================================ */

(function () {
  "use strict";

  // ---------- DOM ----------
  const $ = function (id) { return document.getElementById(id); };
  const titleScreen = $("title-screen");
  const gameScreen = $("game-screen");
  const resultScreen = $("result-screen");
  const startBtn = $("start-btn");
  const continueBtn = $("continue-btn");
  const againBtn = $("again-btn");
  const shareBtn = $("share-btn");
  const chapterEl = $("chapter");
  const storyEl = $("story-text");
  const optionsEl = $("options");
  const progressEl = $("progress");
  const endingTitleEl = $("ending-title");
  const endingTextEl = $("ending-text");
  const mbtiCode = $("mbti-code");
  const mbtiName = $("mbti-name");
  const mbtiRole = $("mbti-role");
  const mbtiDesc = $("mbti-desc");
  const appEl = $("app");

  // 工具条 / 面板
  const toolbar = $("toolbar");
  const autoBtn = $("auto-btn");
  const historyBtn = $("history-btn");
  const settingsBtn = $("settings-btn");
  const settingsPanel = $("settings-panel");
  const historyPanel = $("history-panel");
  const historyList = $("history-list");
  const speedSeg = $("speed-seg");
  const sfxToggle = $("sfx-toggle");
  const rainToggle = $("rain-toggle");
  const autoToggle = $("auto-toggle");
  const skipToggle = $("skip-toggle");
  const settingsClose = $("settings-close");
  const historyClose = $("history-close");
  const quitBtn = $("quit-btn");
  const undoBar = $("undo-bar");
  const undoBtn = $("undo-btn");
  const resetGalleryBtn = $("reset-gallery-btn");

  // ---------- 节点索引 ----------
  const NODES = {};
  STORY.forEach(function (n) { NODES[n.id] = n; });
  const TOTAL_CHOICES = 12;

  // 存储键
  const K_GALLERY = "mist_manor_gallery";
  const K_CARDS = "mist_manor_cards";
  const K_SETTINGS = "mist_manor_settings";
  const K_SAVE = "mist_manor_save";
  const K_READ = "mist_manor_read";   // 已读节点（快进用）

  // ---------- 设置 ----------
  const SPEEDS = {
    slow:    { base: 70, punct: 200 },
    normal:  { base: 42, punct: 130 },
    fast:    { base: 18, punct: 60 },
    instant: { base: 0,  punct: 0 }
  };
  let settings = { speed: "normal", sfx: false, auto: false, rain: false, skipRead: false };

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(K_SETTINGS));
      if (s && SPEEDS[s.speed]) settings = Object.assign(settings, s);
    } catch (e) {}
  }
  function saveSettings() {
    try { localStorage.setItem(K_SETTINGS, JSON.stringify(settings)); } catch (e) {}
  }

  function applySettingsUI() {
    // 速度分段
    speedSeg.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.speed === settings.speed);
    });
    // 开关
    sfxToggle.setAttribute("aria-pressed", settings.sfx ? "true" : "false");
    sfxToggle.classList.toggle("on", settings.sfx);
    rainToggle.setAttribute("aria-pressed", settings.rain ? "true" : "false");
    rainToggle.classList.toggle("on", settings.rain);
    autoToggle.setAttribute("aria-pressed", settings.auto ? "true" : "false");
    autoToggle.classList.toggle("on", settings.auto);
    skipToggle.setAttribute("aria-pressed", settings.skipRead ? "true" : "false");
    skipToggle.classList.toggle("on", settings.skipRead);
    // 工具条 Auto 按钮
    autoBtn.textContent = settings.auto ? "⏸" : "▶";
    autoBtn.classList.toggle("active", settings.auto);
    // 雨声跟随开关
    setRain(settings.rain);
  }

  // ---------- 音效（WebAudio 合成，零资源文件） ----------
  let audioCtx = null;
  function playSfx(kind) {
    if (!settings.sfx) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      let freq = 660, dur = 0.06, vol = 0.03, type = "sine";
      if (kind === "click")  { freq = 740; dur = 0.05; }
      if (kind === "chime")  { freq = 880; dur = 0.35; vol = 0.045; }
      if (kind === "shatter"){ freq = 190; dur = 0.22; vol = 0.06; type = "triangle"; }
      if (kind === "reveal") { freq = 523; dur = 0.6;  vol = 0.05; }
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch (e) {}
  }

  // ---------- 雨声氛围（WebAudio 白噪声 + 低通滤波，零资源文件） ----------
  let rainCtx = null, rainGain = null, rainNodes = null, rainFadeTimer = null;

  function buildRain() {
    // 惰性创建独立的 AudioContext，与音效互不影响
    rainCtx = new (window.AudioContext || window.webkitAudioContext)();
    // 2 秒循环白噪声缓冲
    const len = rainCtx.sampleRate * 2;
    const buf = rainCtx.createBuffer(1, len, rainCtx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = rainCtx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    // 低通滤波成"雨落在屋顶"的闷响，再轻微降采样质感
    const lp = rainCtx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 650;
    lp.Q.value = 0.4;
    // 带通补一层"沙沙"细节
    const bp = rainCtx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 0.3;
    const bpGain = rainCtx.createGain();
    bpGain.gain.value = 0.25;
    rainGain = rainCtx.createGain();
    rainGain.gain.value = 0;
    src.connect(lp);
    src.connect(bp);
    bp.connect(bpGain);
    bpGain.connect(rainGain);
    lp.connect(rainGain);
    rainGain.connect(rainCtx.destination);
    src.start();
    rainNodes = src;
  }

  function setRain(on) {
    try {
      if (on) {
        if (!rainCtx) buildRain();
        if (rainCtx.state === "suspended") rainCtx.resume();
        // 淡入
        if (rainFadeTimer) { clearTimeout(rainFadeTimer); rainFadeTimer = null; }
        const t = rainCtx.currentTime;
        rainGain.gain.cancelScheduledValues(t);
        rainGain.gain.setValueAtTime(rainGain.gain.value, t);
        rainGain.gain.linearRampToValueAtTime(0.045, t + 2);
      } else if (rainCtx && rainGain) {
        // 淡出后挂起（省电）
        const t = rainCtx.currentTime;
        rainGain.gain.cancelScheduledValues(t);
        rainGain.gain.setValueAtTime(rainGain.gain.value, t);
        rainGain.gain.linearRampToValueAtTime(0.0001, t + 1.5);
        rainFadeTimer = setTimeout(function () {
          rainFadeTimer = null;
          if (rainCtx && rainCtx.state === "running" && !settings.rain) rainCtx.suspend();
        }, 1600);
      }
    } catch (e) {}
  }

  // ---------- 状态 ----------
  let currentNodeId = "prologue";
  let choiceIndex = 0;
  let scores = { E:0, I:0, S:0, N:0, T:0, F:0, J:0, P:0 };
  let flags = {};
  let affinity = { master: 0, shen: 0 };
  let currentEnding = null;
  let typingTimer = null;
  let isTyping = false;
  let autoTimer = null;      // Auto 模式计时器
  let nextTimer = null;      // 反馈→跳转计时器（撤销时需取消，防止竞态）
  let history = [];          // {chapter, text, chosen}

  // 撤销栈：快照当前完整状态（选择前压栈）
  let undoStack = [];

  function snapshot() {
    return {
      nodeId: currentNodeId,
      choiceIndex: choiceIndex,
      scores: Object.assign({}, scores),
      flags: Object.assign({}, flags),
      affinity: Object.assign({}, affinity),
      history: history.slice()
    };
  }
  function restore(snap) {
    currentNodeId = snap.nodeId;
    choiceIndex = snap.choiceIndex;
    scores = Object.assign({}, snap.scores);
    flags = Object.assign({}, snap.flags);
    affinity = Object.assign({}, snap.affinity);
    history = snap.history.slice();
  }

  // ---------- 存档 ----------
  function saveGame() {
    // 仅在未到结局时存档
    if (currentEnding) {
      try { localStorage.removeItem(K_SAVE); } catch (e) {}
      return;
    }
    const data = {
      nodeId: currentNodeId,
      choiceIndex: choiceIndex,
      scores: scores,
      flags: flags,
      affinity: affinity,
      history: history,
      undoStack: undoStack.slice(),
      savedAt: Date.now()
    };
    try { localStorage.setItem(K_SAVE, JSON.stringify(data)); } catch (e) {}
    updateContinueBtn();
  }
  function loadSave() {
    try { return JSON.parse(localStorage.getItem(K_SAVE)); } catch (e) { return null; }
  }
  function updateContinueBtn() {
    const s = loadSave();
    if (s && NODES[s.nodeId]) {
      continueBtn.classList.remove("hidden");
      const mins = Math.max(1, Math.round((Date.now() - s.savedAt) / 60000));
      continueBtn.textContent = "▸ 继续上次的晚宴（" + (mins < 60 ? mins + " 分钟前" : "更早") + "）";
    } else {
      continueBtn.classList.add("hidden");
    }
  }

  // ---------- 结局图鉴 ----------
  function getGallery() {
    try { return JSON.parse(localStorage.getItem(K_GALLERY)) || {}; }
    catch (e) { return {}; }
  }
  function unlockEnding(id) {
    const g = getGallery();
    if (!g[id]) {
      g[id] = true;
      try { localStorage.setItem(K_GALLERY, JSON.stringify(g)); } catch (e) {}
    }
  }
  function renderGallery() {
    const g = getGallery();
    const ALL = ["endingA", "endingB", "endingC", "endingD"];
    ["gallery-title", "gallery-result"].forEach(function (id) {
      const el = $(id);
      if (!el) return;
      el.innerHTML = "";
      ALL.forEach(function (eid, idx) {
        const slot = document.createElement("span");
        slot.className = "gallery-slot" + (g[eid] ? " unlocked" : "");
        slot.title = g[eid] ? NODES[eid].endingTitle : "结局 " + (idx + 1) + " · 未解锁";
        slot.textContent = g[eid] ? ["真相", "门后", "过客", "归还"][idx] : "?";
        el.appendChild(slot);
      });
    });
    // 图鉴有进度时显示重置按钮
    const got = Object.keys(g).length;
    resetGalleryBtn.classList.toggle("hidden", got === 0);
  }

  // ---------- 16 型名片夹 ----------
  // 全部 16 个 MBTI 代号，按传统四分组排列
  const ALL_TYPES = [
    "INTJ","INTP","ENTJ","ENTP",
    "INFJ","INFP","ENFJ","ENFP",
    "ISTJ","ISFJ","ESTJ","ESFJ",
    "ISTP","ISFP","ESTP","ESFP"
  ];
  function getCards() {
    try { return JSON.parse(localStorage.getItem(K_CARDS)) || {}; }
    catch (e) { return {}; }
  }
  function unlockCard(code) {
    const c = getCards();
    if (!c[code]) {
      c[code] = true;
      try { localStorage.setItem(K_CARDS, JSON.stringify(c)); } catch (e) {}
    }
  }
  function renderCards() {
    const c = getCards();
    const got = Object.keys(c).length;
    ["cards-title", "cards-result"].forEach(function (id) {
      const el = $(id);
      if (!el) return;
      // 标题屏：尚未集到任何名片时也展示空名片夹（让收集目标可见）
      el.innerHTML = "";
      ALL_TYPES.forEach(function (code) {
        const slot = document.createElement("span");
        slot.className = "card-slot" + (c[code] ? " unlocked" : "");
        if (c[code] && MBTI_TYPES[code]) {
          slot.textContent = code;
          slot.title = MBTI_TYPES[code].name + " · " + MBTI_TYPES[code].role;
        } else {
          slot.textContent = "·";
          slot.title = "名片 " + code + " · 未解锁";
        }
        el.appendChild(slot);
      });
      const label = el.previousElementSibling;
      if (label && label.classList && label.classList.contains("cards-label")) {
        label.textContent = "名片夹 · 已集 " + got + "/16 型";
      }
    });
    // 联动图鉴重置按钮（两套收集有任一进度即可见）
    const g = getGallery();
    resetGalleryBtn.classList.toggle("hidden", Object.keys(g).length === 0 && got === 0);
  }

  // ---------- 交互隐喻 ----------
  function applyNodeFx(node) {
    appEl.classList.remove("fx-shatter");
    document.body.classList.remove("tint-blue", "tint-gold");
    if (node.effect === "shatter") {
      appEl.classList.add("fx-shatter");
      playSfx("shatter");
      setTimeout(function () { appEl.classList.remove("fx-shatter"); }, 700);
    }
    if (node.tint === "blue") document.body.classList.add("tint-blue");
    if (node.tint === "gold") document.body.classList.add("tint-gold");
  }

  // ---------- 已读节点记录（快进用） ----------
  const READ_MAX = 200; // 防止无限增长，保留最近的节点 id
  let readSet = null;
  function markRead(nodeId) {
    try {
      if (readSet === null) {
        readSet = JSON.parse(localStorage.getItem(K_READ)) || [];
      }
      if (readSet.indexOf(nodeId) < 0) {
        readSet.push(nodeId);
        if (readSet.length > READ_MAX) readSet = readSet.slice(-READ_MAX);
        localStorage.setItem(K_READ, JSON.stringify(readSet));
      }
    } catch (e) {
      readSet = readSet || [];
    }
  }
  function isRead(nodeId) {
    try {
      if (readSet === null) {
        readSet = JSON.parse(localStorage.getItem(K_READ)) || [];
      }
    } catch (e) { readSet = []; }
    return readSet.indexOf(nodeId) >= 0;
  }

  // ---------- 打字机 ----------
  function typeText(text, target, done) {
    clearTyping();
    isTyping = true;
    target.classList.add("typing");
    target.textContent = "";
    const chars = Array.from(text);
    let i = 0;
    const spd = SPEEDS[settings.speed];
    // 已读快进：该节点文本此前看过（且非"立即"档，立即档本就直出）——直接呈现
    const skip = settings.skipRead && arguments.length > 3 && arguments[3] && spd.base > 0;
    if (skip) {
      target.textContent = text;
      finishTyping(target);
      if (done) done();
      return;
    }

    function step() {
      if (i >= chars.length) {
        finishTyping(target);
        if (done) done();
        return;
      }
      target.textContent += chars[i];
      const ch = chars[i];
      i++;
      if (spd.base === 0) {
        // 立即模式：整段直接呈现
        target.textContent = text;
        finishTyping(target);
        if (done) done();
        return;
      }
      const delay = /[。，；！？、\n」』——…]/.test(ch) ? spd.punct : spd.base;
      typingTimer = setTimeout(step, delay);
    }

    // 点击文本跳过打字
    target.onclick = function () {
      if (!isTyping) return;
      clearTyping();
      target.textContent = text;
      finishTyping(target);
      if (done) done();
    };

    step();
  }

  function clearTyping() {
    if (typingTimer) { clearTimeout(typingTimer); typingTimer = null; }
    clearAuto();
  }

  function finishTyping(target) {
    isTyping = false;
    target.classList.remove("typing");
    target.onclick = null;
  }

  // ---------- Auto 模式 ----------
  function clearAuto() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  }
  // 取消"反馈→跳转"的待触发跳转（撤销/重置时调用，防止竞态）
  function clearNext() {
    if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
  }
  // 打字完成后延迟自动继续（仅对叙事节点与反馈后跳转生效）
  function autoContinue(delay, fn) {
    if (!settings.auto) return;
    clearAuto();
    autoTimer = setTimeout(fn, delay);
  }

  // ---------- 进度 ----------
  function renderProgress() {
    progressEl.innerHTML = "";
    for (let i = 0; i < TOTAL_CHOICES; i++) {
      const dot = document.createElement("span");
      dot.className = "progress-dot";
      if (i < choiceIndex) dot.classList.add("done");
      else if (i === choiceIndex) dot.classList.add("current");
      progressEl.appendChild(dot);
    }
  }

  // ---------- 历史记录 ----------
  function pushHistory(entry) {
    history.push(entry);
    if (history.length > 60) history.shift(); // 防止过长
  }
  function renderHistory() {
    historyList.innerHTML = "";
    if (history.length === 0) {
      const li = document.createElement("li");
      li.textContent = "（夜才刚刚开始……）";
      li.className = "history-item history-dim";
      historyList.appendChild(li);
      return;
    }
    history.forEach(function (h) {
      if (h.chapter) {
        const li = document.createElement("li");
        li.className = "history-chapter";
        li.textContent = h.chapter;
        historyList.appendChild(li);
      }
      const li2 = document.createElement("li");
      li2.className = "history-item";
      li2.textContent = h.text;
      historyList.appendChild(li2);
      if (h.chosen) {
        const li3 = document.createElement("li");
        li3.className = "history-chosen";
        li3.textContent = "→ " + h.chosen;
        historyList.appendChild(li3);
      }
    });
    // 滚动到底部（最新）
    setTimeout(function () { historyList.scrollTop = historyList.scrollHeight; }, 0);
  }

  // ---------- 节点播放 ----------
  function playNode(nodeId) {
    const node = NODES[nodeId];
    if (!node) { console.error("未知节点: " + nodeId); return; }
    currentNodeId = nodeId;
    optionsEl.innerHTML = "";
    applyNodeFx(node);
    updateUndoBar();
    saveGame();

    if (node.type === "narrative") {
      chapterEl.textContent = node.chapter || "";
      if (node.chapter) renderProgress();
      pushHistory({ chapter: node.chapter, text: node.text });
      markRead(nodeId);
      typeText(node.text, storyEl, function () {
        showContinueHint(function () { playNode(node.next); });
      }, isRead(nodeId));
      return;
    }

    if (node.type === "choice") {
      chapterEl.textContent = node.chapter || "";
      renderProgress();
      pushHistory({ chapter: node.chapter, text: node.text });
      markRead(nodeId);
      typeText(node.text, storyEl, function () { showOptions(node); }, isRead(nodeId));
      return;
    }

    if (node.type === "ending") {
      currentEnding = node;
      unlockEnding(node.id);
      unlockCard(computeMBTI().code);
      saveGame(); // 到结局即清档
      showResult(node);
    }
  }

  // ---------- 选项 ----------
  function optionVisible(opt) {
    if (!opt.requires) return true;
    if (opt.requires.master && affinity.master < opt.requires.master) return false;
    if (opt.requires.shen && affinity.shen < opt.requires.shen) return false;
    return true;
  }

  function showOptions(node) {
    optionsEl.innerHTML = "";
    const visible = node.options.filter(optionVisible);
    visible.forEach(function (opt, idx) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-card" + (opt.hidden ? " option-hidden" : "");
      btn.dataset.idx = idx;
      // 键盘序号提示（1-4）
      btn.innerHTML = '<span class="opt-key">' + (idx + 1) + "</span>" + opt.text;
      btn.style.transitionDelay = (idx * 0.12) + "s";
      btn.addEventListener("click", function () { chooseOption(node, opt, btn); });
      optionsEl.appendChild(btn);
      requestAnimationFrame(function () { btn.classList.add("show"); });
    });
  }

  function chooseOption(node, opt, btn) {
    const all = optionsEl.querySelectorAll(".option-card");
    all.forEach(function (b) { b.disabled = true; });
    btn.classList.add("chosen");
    playSfx("click");
    undoStack.push(snapshot());
    if (undoStack.length > 20) undoStack.shift();

    // 计入历史
    pushHistory({ chosen: opt.text });

    // 计分（小支点/分流无 scores 不计分）
    if (opt.scores) {
      Object.keys(opt.scores).forEach(function (k) { scores[k] += opt.scores[k]; });
      choiceIndex++;
    }
    // 平局裁判：小支点的 0.5 分倾向加权（不计分、不进进度条，细化 3:0 / 2:1 的强度区分）
    if (opt.nudge) {
      Object.keys(opt.nudge).forEach(function (k) { scores[k] += opt.nudge[k]; });
    }
    if (opt.flags) opt.flags.forEach(function (f) { flags[f] = true; });
    if (opt.affinity) {
      Object.keys(opt.affinity).forEach(function (k) { affinity[k] += opt.affinity[k]; });
    }

    // 显示反馈，稍候跳转（两级计时器均由 nextTimer 追踪，撤销/重置时统一取消）
    clearNext();
    nextTimer = setTimeout(function () {
      nextTimer = null;
      optionsEl.innerHTML = "";
      const fb = document.createElement("p");
      fb.className = "feedback";
      fb.textContent = opt.feedback;
      optionsEl.appendChild(fb);
      updateUndoBar();
      var goNext = function () { nextTimer = null; playNode(opt.next); };
      if (settings.auto) {
        autoContinue(1800, goNext);
      } else {
        nextTimer = setTimeout(goNext, 1500);
      }
    }, 450);
  }

  // ---------- 撤销 ----------
  // 撤销栏常驻：只要还有可撤销的步数就显示（与 Z 键行为一致）
  function updateUndoBar() {
    undoBar.classList.toggle("hidden", undoStack.length === 0);
  }
  function doUndo() {
    if (!undoStack.length) return;
    clearNext();  // 取消待触发的跳转，防止撤销后剧情仍被推进
    restore(undoStack.pop());
    playSfx("click");
    currentEnding = null;
    resultScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    toolbar.classList.remove("hidden");
    clearAuto();
    clearTyping();
    playNode(currentNodeId);
  }

  // ---------- 继续提示 ----------
  function showContinueHint(onContinue) {
    const hint = document.createElement("button");
    hint.type = "button";
    hint.className = "btn-ghost";
    hint.textContent = "▸ 继续（空格）";
    hint.style.marginTop = "8px";
    hint.style.opacity = "0";
    hint.style.transition = "opacity 0.6s";
    optionsEl.appendChild(hint);
    requestAnimationFrame(function () { hint.style.opacity = "1"; });
    hint.addEventListener("click", function () {
      hint.disabled = true;
      onContinue();
    });
    // Auto 模式下自动点继续
    if (settings.auto) {
      autoContinue(1200, function () { if (!hint.disabled) onContinue(); });
    }
  }

  // ---------- MBTI 计算 ----------
  function computeMBTI() {
    const code =
      (scores.E > scores.I ? "E" : "I") +
      (scores.S > scores.N ? "S" : "N") +
      (scores.T > scores.F ? "T" : "F") +
      (scores.J > scores.P ? "J" : "P");
    return MBTI_TYPES[code];
  }

  // ---------- 结局拼装 ----------
  function buildEndingText(node) {
    const parts = [node.body];
    node.variants.forEach(function (v) {
      if (flags[v.flag] && v.text) parts.push(v.text);
    });
    parts.push(node.baseText);
    return parts.join("\n");
  }

  // ---------- 结局展示 ----------
  function showResult(ending) {
    gameScreen.classList.add("hidden");
    toolbar.classList.add("hidden");
    resultScreen.classList.remove("hidden");
    renderGallery();
    renderCards();
    playSfx("reveal");

    endingTitleEl.textContent = ending.endingTitle;
    const fullText = buildEndingText(ending);
    typeText(fullText, endingTextEl, function () {
      const mbtiBox = $("mbti-box");
      if (mbtiBox) mbtiBox.classList.add("mbti-show");
      playSfx("chime");
    });
    // 立即模式下的兜底：MBTI 区直接显示
    if (settings.speed === "instant") {
      $("mbti-box").classList.add("mbti-show");
    }

    const m = computeMBTI();
    mbtiCode.textContent = m.code;
    mbtiName.textContent = m.name;
    mbtiRole.textContent = "「" + m.role + "」";
    mbtiDesc.textContent = m.desc;

    // 擦肩而过提示：未达成隐藏结局时点明"还有一扇门"，驱动重玩
    const resultHint = $("result-hint");
    if (resultHint) {
      if (ending.id === "endingD") {
        resultHint.textContent = "你推开了那扇最难推开的门——这一夜，三个人的告别都与你有关。";
      } else if (affinity.master >= 2 || affinity.shen >= 2) {
        resultHint.textContent = "离席时，主人与沈先生似乎都想对你说什么，终究没有说出口——这一夜，似乎还有一扇门在等你。";
      } else {
        resultHint.textContent = "这一夜的晚宴只有三位客人赴约——你、真相，与一扇始终虚掩的门。";
      }
    }

    // 四维度倾向条：百分比 + 高亮测出的那一侧
    renderMbtiBars();
  }

  // ---------- 四维度倾向条 ----------
  var MBTI_DIMS = [
    { left: "E", right: "I", label: "外向 — 内向" },
    { left: "S", right: "N", label: "实感 — 直觉" },
    { left: "T", right: "F", label: "思考 — 情感" },
    { left: "J", right: "P", label: "判断 — 展望" }
  ];
  function renderMbtiBars() {
    const barsEl = $("mbti-bars");
    if (!barsEl) return;
    barsEl.innerHTML = "";
    MBTI_DIMS.forEach(function (d) {
      const l = scores[d.left], r = scores[d.right];
      const total = l + r;
      if (total <= 0) return;
      const pct = Math.round((r / total) * 100);
      const row = document.createElement("div");
      row.className = "mbti-bar-row";
      row.title = d.label + "：" + d.left + " " + (100 - pct) + "% / " + d.right + " " + pct + "%";
      const sideL = document.createElement("span");
      sideL.className = "bar-side" + (l > r ? " side-win" : "");
      sideL.textContent = d.left;
      const track = document.createElement("span");
      track.className = "bar-track";
      const fill = document.createElement("span");
      fill.className = "bar-fill";
      fill.style.width = pct + "%";   // 右侧占比，从左向右填充
      track.appendChild(fill);
      const sideR = document.createElement("span");
      sideR.className = "bar-side" + (r > l ? " side-win" : "");
      sideR.textContent = d.right;
      row.appendChild(sideL);
      row.appendChild(track);
      row.appendChild(sideR);
      barsEl.appendChild(row);
    });
  }

  // ---------- 复制结局 / 系统分享 ----------
  // 移动端优先唤起系统分享面板（Web Share API），不支持则回退剪贴板
  function canShare() {
    return !!(navigator.share && navigator.canShare);
  }
  function updateShareBtn() {
    shareBtn.textContent = canShare() ? "分享结局" : "复制结局";
  }
  function shareResult() {
    const m = computeMBTI();
    const g = getGallery();
    const got = Object.keys(g).length;
    const cardsGot = Object.keys(getCards()).length;
    const shareTitle = "迷雾庄园 · " + currentEnding.endingTitle;
    const shareSummary =
      "晚宴为我写下的画像——MBTI：" + m.code + " · " + m.name + "\n" + m.role;
    const text =
      shareTitle + "\n" +
      buildEndingText(currentEnding) + "\n\n" +
      shareSummary + "\n\n" +
      "来迷雾庄园，赴一场测出你 MBTI 的晚宴。\n" +
      "三条剧情线 · 一个隐藏结局 · 我已解锁 " + got + "/4 个结局 · 名片夹 " + cardsGot + "/16 型";
    if (canShare()) {
      navigator.share({ title: shareTitle, text: text })
        .then(function () { shareSucceeded(); })
        .catch(function (err) {
          if (err && err.name === "AbortError") return; // 用户取消，静默处理
          fallbackCopy(text); // 其他失败（如权限）回退剪贴板
        });
    } else {
      fallbackCopy(text);
    }
  }
  function shareSucceeded() {
    shareBtn.textContent = "已分享 ✓";
    setTimeout(updateShareBtn, 1800);
  }
  function fallbackCopy(text) {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    document.body.removeChild(ta);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(function () {});
    }
    shareBtn.textContent = "已复制 ✓";
    setTimeout(updateShareBtn, 1800);
  }

  // ---------- 面板控制 ----------
  function openPanel(panel) { panel.classList.remove("hidden"); }
  function closePanels() {
    settingsPanel.classList.add("hidden");
    historyPanel.classList.add("hidden");
  }
  function toggleSettings() {
    if (settingsPanel.classList.contains("hidden")) {
      historyPanel.classList.add("hidden");
      applySettingsUI();
      openPanel(settingsPanel);
    } else {
      settingsPanel.classList.add("hidden");
    }
  }
  function toggleHistory() {
    if (historyPanel.classList.contains("hidden")) {
      settingsPanel.classList.add("hidden");
      renderHistory();
      openPanel(historyPanel);
    } else {
      historyPanel.classList.add("hidden");
    }
  }
  function toggleAuto() {
    settings.auto = !settings.auto;
    saveSettings();
    applySettingsUI();
    if (settings.auto) {
      // 若当前正在等待继续提示，立即触发
      const hint = optionsEl.querySelector(".btn-ghost");
      if (hint && !hint.disabled && hint.textContent.indexOf("继续") >= 0) hint.click();
    } else {
      clearAuto();
    }
  }

  // ---------- 流程控制 ----------
  function startGame(fresh) {
    closePanels();
    titleScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    toolbar.classList.remove("hidden");

    if (fresh) {
      resetState();
      playNode("prologue");
    } else {
      // 读档
      const s = loadSave();
      resetState();
      if (s && NODES[s.nodeId]) {
        currentNodeId = s.nodeId;
        choiceIndex = s.choiceIndex || 0;
        scores = s.scores || scores;
        flags = s.flags || {};
        affinity = s.affinity || affinity;
        history = s.history || [];
        undoStack = Array.isArray(s.undoStack) ? s.undoStack : [];
        playNode(s.nodeId);
      } else {
        playNode("prologue");
      }
    }
  }

  function resetState() {
    currentNodeId = "prologue";
    choiceIndex = 0;
    scores = { E:0, I:0, S:0, N:0, T:0, F:0, J:0, P:0 };
    flags = {};
    affinity = { master: 0, shen: 0 };
    currentEnding = null;
    undoStack = [];
    history = [];
    clearTyping();
    clearAuto();
    clearNext();
    storyEl.textContent = "";
    storyEl.onclick = null;
    endingTextEl.textContent = "";
    endingTextEl.onclick = null;
    const mbtiBox = $("mbti-box");
    if (mbtiBox) mbtiBox.classList.remove("mbti-show");
    optionsEl.innerHTML = "";
    chapterEl.textContent = "";
    progressEl.innerHTML = "";
    undoBar.classList.add("hidden");
    document.body.classList.remove("tint-blue", "tint-gold");
    appEl.classList.remove("fx-shatter");
  }

  function quitToTitle() {
    closePanels();
    clearNext();
    clearAuto();
    saveGame();
    gameScreen.classList.add("hidden");
    resultScreen.classList.add("hidden");
    toolbar.classList.add("hidden");
    titleScreen.classList.remove("hidden");
    updateContinueBtn();
    renderGallery();
    renderCards();
  }

  // ---------- 键盘操作 ----------
  function onKeydown(e) {
    // 面板打开时：Esc 关闭
    const panelOpen = !settingsPanel.classList.contains("hidden") || !historyPanel.classList.contains("hidden");
    if (e.key === "Escape") {
      if (panelOpen) { closePanels(); return; }
      if (!gameScreen.classList.contains("hidden")) { toggleSettings(); return; }
      return;
    }
    if (panelOpen) return;

    const inGame = !gameScreen.classList.contains("hidden");
    if (!inGame) return;

    // 数字 1-4：选选项
    if (/^[1-4]$/.test(e.key)) {
      const cards = optionsEl.querySelectorAll(".option-card:not(:disabled)");
      const idx = parseInt(e.key, 10) - 1;
      if (cards[idx]) { cards[idx].click(); }
      return;
    }
    // 空格：继续提示 / 跳过打字
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (isTyping) { storyEl.click(); return; }
      const hint = optionsEl.querySelector(".btn-ghost:not(:disabled)");
      if (hint) hint.click();
      return;
    }
    // A：自动播放
    if (e.key === "a" || e.key === "A") { toggleAuto(); return; }
    // H：历史
    if (e.key === "h" || e.key === "H") { toggleHistory(); return; }
    // Z：撤销
    if (e.key === "z" || e.key === "Z") { doUndo(); return; }
  }

  // ---------- 事件绑定 ----------
  startBtn.addEventListener("click", function () {
    // 已有存档时，开新局前清掉旧档
    try { localStorage.removeItem(K_SAVE); } catch (e) {}
    startGame(true);
  });
  continueBtn.addEventListener("click", function () { startGame(false); });
  againBtn.addEventListener("click", function () { startGame(true); });
  shareBtn.addEventListener("click", shareResult);

  settingsBtn.addEventListener("click", toggleSettings);
  settingsClose.addEventListener("click", closePanels);
  quitBtn.addEventListener("click", quitToTitle);
  historyBtn.addEventListener("click", toggleHistory);
  historyClose.addEventListener("click", closePanels);
  autoBtn.addEventListener("click", toggleAuto);

  // 速度分段
  speedSeg.querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () {
      settings.speed = b.dataset.speed;
      saveSettings();
      applySettingsUI();
      playSfx("click");
    });
  });
  // 音效开关
  sfxToggle.addEventListener("click", function () {
    settings.sfx = !settings.sfx;
    saveSettings();
    applySettingsUI();
    if (settings.sfx) playSfx("chime");
  });
  // 雨声开关
  rainToggle.addEventListener("click", function () {
    settings.rain = !settings.rain;
    saveSettings();
    applySettingsUI();
  });
  // 已读快进开关
  skipToggle.addEventListener("click", function () {
    settings.skipRead = !settings.skipRead;
    saveSettings();
    applySettingsUI();
  });
  // Auto 开关
  autoToggle.addEventListener("click", toggleAuto);

  // 撤销 / 图鉴重置
  undoBtn.addEventListener("click", doUndo);
  resetGalleryBtn.addEventListener("click", function () {
    try {
      localStorage.removeItem(K_GALLERY);
      localStorage.removeItem(K_CARDS);
    } catch (e) {}
    renderGallery();
    renderCards();
    updateContinueBtn();
    resetGalleryBtn.classList.add("hidden");
  });

  document.addEventListener("keydown", onKeydown);

  // 点击遮罩空白处关闭
  settingsPanel.addEventListener("click", function (e) { if (e.target === settingsPanel) closePanels(); });
  historyPanel.addEventListener("click", function (e) { if (e.target === historyPanel) closePanels(); });

  // ---------- 初始化 ----------
  loadSettings();
  applySettingsUI();
  renderGallery();
  renderCards();
  updateContinueBtn();
  updateShareBtn();
})();
