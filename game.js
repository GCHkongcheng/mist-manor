/* ============================================================
   迷雾庄园 · 游戏主控逻辑
   依赖：data.js / engine.js / audio.js / card.js
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
  const titleRainBtn = $("title-rain-btn");
  const titleHint = $("title-hint");
  const againBtn = $("again-btn");
  const shareBtn = $("share-btn");
  const cardBtn = $("card-btn");
  const chapterEl = $("chapter");
  const storyEl = $("story-text");
  const optionsEl = $("options");
  const progressEl = $("progress");
  const progressLabelEl = $("progress-label");
  const endingTitleEl = $("ending-title");
  const endingTextEl = $("ending-text");
  const endingSkipHint = $("ending-skip-hint");
  const waxEnvelope = $("wax-envelope");
  const waxSealBtn = $("wax-seal-btn");
  const mbtiBox = $("mbti-box");
  const mbtiFront = $("mbti-front");
  const mbtiFrontTitle = $("mbti-front-title");
  const mbtiFlipBackBtn = $("mbti-flip-back-btn");
  const mbtiCode = $("mbti-code");
  const mbtiName = $("mbti-name");
  const mbtiRole = $("mbti-role");
  const mbtiDesc = $("mbti-desc");
  const appEl = $("app");

  // 工具条 / 面板
  const toolbar = $("toolbar");
  const toolbarGuide = $("toolbar-guide");
  const autoBtn = $("auto-btn");
  const historyBtn = $("history-btn");
  const settingsBtn = $("settings-btn");
  const settingsPanel = $("settings-panel");
  const historyPanel = $("history-panel");
  const historyList = $("history-list");
  const speedSeg = $("speed-seg");
  const fontSeg = $("font-seg");
  const contrastToggle = $("contrast-toggle");
  const sfxToggle = $("sfx-toggle");
  const rainToggle = $("rain-toggle");
  const volumeRange = $("volume-range");
  const autoToggle = $("auto-toggle");
  const skipToggle = $("skip-toggle");
  const saveSlotsEl = $("save-slots");
  const exportBtn = $("export-btn");
  const importBtn = $("import-btn");
  const importBox = $("import-box");
  const importInput = $("import-input");
  const importConfirmBtn = $("import-confirm-btn");
  const importStatus = $("import-status");
  const settingsClose = $("settings-close");
  const historyClose = $("history-close");
  const quitBtn = $("quit-btn");
  const undoBar = $("undo-bar");
  const undoBtn = $("undo-btn");
  const resetGalleryBtn = $("reset-gallery-btn");

  // ---------- 节点索引与元数据推导 ----------
  const NODES = {};
  STORY.forEach(function (n) { NODES[n.id] = n; });
  const ALT_NODE_IDS = STORY.filter(function (n) { return n.altText && n.altOptions; }).map(function (n) { return n.id; });
  const TOTAL_CHOICES = 12;

  // 存储键
  const K_GALLERY  = "mist_manor_gallery";
  const K_CARDS    = "mist_manor_cards";
  const K_SETTINGS = "mist_manor_settings";
  const K_SAVE     = "mist_manor_save";
  const K_SLOTS    = "mist_manor_slots";
  const K_READ     = "mist_manor_read";
  const K_GUIDE    = "mist_manor_guide_seen";
  const K_RUNS     = "mist_manor_runs";

  // ---------- 设置 ----------
  const SPEEDS = {
    slow:    { base: 70, punct: 200 },
    normal:  { base: 42, punct: 130 },
    fast:    { base: 18, punct: 60 },
    instant: { base: 0,  punct: 0 }
  };
  const FONTS = { normal: true, large: true, xlarge: true };
  let settings = {
    speed: "normal",
    font: "normal",
    contrast: false,
    sfx: false,
    rain: false,
    volume: 0.8,
    auto: false,
    skipRead: false
  };

  function loadSettings() {
    try {
      const s = JSON.parse(localStorage.getItem(K_SETTINGS));
      if (s && typeof s === "object") {
        if (SPEEDS[s.speed]) settings.speed = s.speed;
        if (FONTS[s.font]) settings.font = s.font;
        if (typeof s.contrast === "boolean") settings.contrast = s.contrast;
        if (typeof s.sfx === "boolean") settings.sfx = s.sfx;
        if (typeof s.rain === "boolean") settings.rain = s.rain;
        if (typeof s.volume === "number") settings.volume = Math.max(0, Math.min(1, s.volume));
        if (typeof s.auto === "boolean") settings.auto = s.auto;
        if (typeof s.skipRead === "boolean") settings.skipRead = s.skipRead;
      }
    } catch (e) {}
  }
  function saveSettings() {
    try { localStorage.setItem(K_SETTINGS, JSON.stringify(settings)); } catch (e) {}
  }

  function applySettingsUI() {
    speedSeg.querySelectorAll("button").forEach(function (b) {
      b.classList.toggle("active", b.dataset.speed === settings.speed);
    });
    if (fontSeg) {
      fontSeg.querySelectorAll("button").forEach(function (b) {
        b.classList.toggle("active", b.dataset.font === settings.font);
      });
    }
    document.body.dataset.font = settings.font;
    document.body.classList.toggle("high-contrast", !!settings.contrast);
    if (contrastToggle) {
      contrastToggle.setAttribute("aria-pressed", settings.contrast ? "true" : "false");
      contrastToggle.classList.toggle("on", !!settings.contrast);
    }
    sfxToggle.setAttribute("aria-pressed", settings.sfx ? "true" : "false");
    sfxToggle.classList.toggle("on", settings.sfx);
    rainToggle.setAttribute("aria-pressed", settings.rain ? "true" : "false");
    rainToggle.classList.toggle("on", settings.rain);
    if (volumeRange) volumeRange.value = String(Math.round(settings.volume * 100));
    autoToggle.setAttribute("aria-pressed", settings.auto ? "true" : "false");
    autoToggle.classList.toggle("on", settings.auto);
    skipToggle.setAttribute("aria-pressed", settings.skipRead ? "true" : "false");
    skipToggle.classList.toggle("on", settings.skipRead);

    autoBtn.classList.toggle("active", settings.auto);
    autoBtn.setAttribute("aria-pressed", settings.auto ? "true" : "false");

    if (titleRainBtn) {
      titleRainBtn.classList.toggle("on", settings.rain);
      titleRainBtn.setAttribute("aria-pressed", settings.rain ? "true" : "false");
      titleRainBtn.textContent = settings.rain ? "夜雨声：开（戴耳机更佳）" : "夜雨声：关（戴耳机更佳）";
    }
    AudioEngine.setConfig({ sfx: settings.sfx, rain: settings.rain, volume: settings.volume });
  }

  // ---------- 状态 ----------
  let currentNodeId = "prologue";
  let choiceIndex = 0;
  let scores = Engine.newScores();
  let flags = {};
  let affinity = Engine.newAffinity();
  let variantMap = {};       // 本局公共线 9 题的平行题库掩码 { ch1: true/false, ... }
  let currentEnding = null;
  let typingTimer = null;
  let isTyping = false;
  let autoTimer = null;
  let nextTimer = null;
  let log = [];              // 历史记录 {chapter, text, chosen}
  let undoStack = [];
  let pendingChoiceSnap = null; // 选后反馈停留期间的节点入口快照，防止中途存盘导致二次计分

  // 生成平行题库掩码：首局全用第 1 套；第 2 局全用第 2 套；第 3 局起每题随机抽一套
  function buildVariantMap() {
    let runs = 0;
    try { runs = parseInt(localStorage.getItem(K_RUNS) || "0", 10) || 0; } catch (e) {}
    const unlockedCount = Object.keys(getGallery()).length;
    const effectiveRun = Math.max(runs, unlockedCount);
    try { localStorage.setItem(K_RUNS, String(effectiveRun + 1)); } catch (e) {}
    const map = {};
    ALT_NODE_IDS.forEach(function (id, idx) {
      if (effectiveRun === 0) map[id] = false;
      else if (effectiveRun === 1) map[id] = true;
      else map[id] = (Math.random() < 0.5) ? true : (idx % 2 === (effectiveRun % 2));
    });
    return map;
  }

  function snapshot() {
    return {
      nodeId: currentNodeId,
      choiceIndex: choiceIndex,
      scores: Object.assign({}, scores),
      flags: Object.assign({}, flags),
      affinity: Object.assign({}, affinity),
      variantMap: Object.assign({}, variantMap),
      history: log.slice()
    };
  }
  function restore(snap) {
    currentNodeId = snap.nodeId;
    choiceIndex = snap.choiceIndex;
    scores = Object.assign({}, snap.scores);
    flags = Object.assign({}, snap.flags);
    affinity = Object.assign({}, snap.affinity);
    variantMap = Object.assign({}, snap.variantMap || {});
    log = snap.history.slice();
    pendingChoiceSnap = null;
  }

  // ---------- 存档 ----------
  const SAVE_VERSION = 2;
  const SAVE_UNDO_MAX = 5;
  function buildSavePayload() {
    const base = pendingChoiceSnap || snapshot();
    const stack = pendingChoiceSnap
      ? undoStack.slice(0, Math.max(0, undoStack.length - 1)).slice(-SAVE_UNDO_MAX)
      : undoStack.slice(-SAVE_UNDO_MAX);
    return {
      version: SAVE_VERSION,
      nodeId: base.nodeId,
      choiceIndex: base.choiceIndex,
      scores: Object.assign({}, base.scores),
      flags: Object.assign({}, base.flags),
      affinity: Object.assign({}, base.affinity),
      variantMap: Object.assign({}, base.variantMap),
      history: base.history.slice(),
      undoStack: stack,
      savedAt: Date.now()
    };
  }
  function saveGame() {
    if (currentEnding) {
      try { localStorage.removeItem(K_SAVE); } catch (e) {}
      return;
    }
    const data = buildSavePayload();
    try { localStorage.setItem(K_SAVE, JSON.stringify(data)); } catch (e) {}
    updateContinueBtn();
  }
  function validSave(s) {
    if (!s || typeof s !== "object" || s.version !== SAVE_VERSION) return false;
    if (!NODES[s.nodeId] || typeof s.savedAt !== "number") return false;
    if (typeof s.choiceIndex !== "number") return false;
    if (!s.scores || !Object.keys(Engine.newScores()).every(function (k) { return typeof s.scores[k] === "number"; })) return false;
    if (!s.affinity || typeof s.affinity.master !== "number" || typeof s.affinity.shen !== "number") return false;
    if (!s.flags || typeof s.flags !== "object") return false;
    if (!Array.isArray(s.history)) return false;
    if (s.undoStack !== undefined && !Array.isArray(s.undoStack)) return false;
    return true;
  }
  function loadSave() {
    let s = null;
    try { s = JSON.parse(localStorage.getItem(K_SAVE)); } catch (e) { s = null; }
    if (s === null) return null;
    if (validSave(s)) return s;
    try { localStorage.removeItem(K_SAVE); } catch (e) {}
    return null;
  }
  function formatElapsed(savedAt) {
    const mins = Math.max(1, Math.round((Date.now() - savedAt) / 60000));
    if (mins < 60) return mins + " 分钟前";
    const hours = Math.round(mins / 60);
    if (hours < 24) return hours + " 小时前";
    return Math.round(hours / 24) + " 天前";
  }
  function updateContinueBtn() {
    const s = loadSave();
    if (s) {
      continueBtn.classList.remove("hidden");
      const ch = NODES[s.nodeId] && NODES[s.nodeId].chapter ? NODES[s.nodeId].chapter + " · " : "";
      continueBtn.textContent = "继续上次的晚宴（" + ch + formatElapsed(s.savedAt) + "）";
    } else {
      continueBtn.classList.add("hidden");
    }
  }

  // ---------- 三槽位手动存档（含进度/时间展示与覆盖/读档二次确认） ----------
  function getSlots() {
    try {
      const arr = JSON.parse(localStorage.getItem(K_SLOTS));
      return Array.isArray(arr) ? [arr[0] || null, arr[1] || null, arr[2] || null] : [null, null, null];
    } catch (e) { return [null, null, null]; }
  }
  function resetSlotBtnConfirm(btn, defaultLabel) {
    if (!btn) return;
    if (btn._confirmTimer) { clearTimeout(btn._confirmTimer); btn._confirmTimer = null; }
    delete btn.dataset.confirm;
    btn.classList.remove("confirm-warn");
    btn.textContent = defaultLabel;
  }
  function renderSlots() {
    if (!saveSlotsEl) return;
    const slots = getSlots();
    const names = ["槽一", "槽二", "槽三"];
    const inGame = !gameScreen.classList.contains("hidden") && !currentEnding;
    saveSlotsEl.querySelectorAll(".slot-item").forEach(function (row) {
      const idx = parseInt(row.dataset.slot, 10);
      const s = validSave(slots[idx]) ? slots[idx] : null;
      const nameEl = row.querySelector(".slot-name");
      const saveBtn = row.querySelector(".slot-save");
      const loadBtn = row.querySelector(".slot-load");
      resetSlotBtnConfirm(saveBtn, "存");
      resetSlotBtnConfirm(loadBtn, "读");
      if (s) {
        const ch = (NODES[s.nodeId] && NODES[s.nodeId].chapter) ? NODES[s.nodeId].chapter : s.nodeId;
        const stepInfo = (typeof s.choiceIndex === "number" ? s.choiceIndex : 0) + "/" + TOTAL_CHOICES + "问";
        const elapsed = formatElapsed(s.savedAt);
        const fullLabel = names[idx] + " · " + ch + "（" + stepInfo + " · " + elapsed + "）";
        nameEl.textContent = fullLabel;
        nameEl.title = fullLabel;
        loadBtn.classList.remove("hidden");
      } else {
        nameEl.textContent = names[idx] + " · 空";
        nameEl.title = names[idx] + " · 空";
        loadBtn.classList.add("hidden");
      }
      saveBtn.disabled = !inGame;
    });
  }
  function saveToSlot(idx, saveBtn) {
    if (currentEnding || gameScreen.classList.contains("hidden")) return;
    const slots = getSlots();
    const hasExisting = validSave(slots[idx]);
    // 槽位已有存档时，需二次点击确认覆盖，避免误触丢失旧档
    if (hasExisting && saveBtn && saveBtn.dataset.confirm !== "1") {
      saveBtn.dataset.confirm = "1";
      saveBtn.classList.add("confirm-warn");
      saveBtn.textContent = "覆盖?";
      AudioEngine.playSfx("click");
      if (saveBtn._confirmTimer) clearTimeout(saveBtn._confirmTimer);
      saveBtn._confirmTimer = setTimeout(function () {
        resetSlotBtnConfirm(saveBtn, "存");
      }, 3000);
      return;
    }
    slots[idx] = buildSavePayload();
    try { localStorage.setItem(K_SLOTS, JSON.stringify(slots)); } catch (e) {}
    AudioEngine.playSfx("click");
    renderSlots();
  }
  function loadFromSlot(idx, loadBtn) {
    const slots = getSlots();
    const s = validSave(slots[idx]) ? slots[idx] : null;
    if (!s) return;
    const hasActiveProgress = !gameScreen.classList.contains("hidden") && !currentEnding && (choiceIndex > 0 || log.length > 1);
    if (hasActiveProgress && loadBtn && loadBtn.dataset.confirm !== "1") {
      loadBtn.dataset.confirm = "1";
      loadBtn.classList.add("confirm-warn");
      loadBtn.textContent = "确读?";
      AudioEngine.playSfx("click");
      if (loadBtn._confirmTimer) clearTimeout(loadBtn._confirmTimer);
      loadBtn._confirmTimer = setTimeout(function () {
        resetSlotBtnConfirm(loadBtn, "读");
      }, 3000);
      return;
    }
    try { localStorage.setItem(K_SAVE, JSON.stringify(s)); } catch (e) {}
    AudioEngine.playSfx("click");
    startGame(false);
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
  const ENDING_HINTS = [
    "结局一 · 书房：第六章随主人步入书房",
    "结局二 · 门后：第六章循长廊尽头蓝光探去",
    "结局三 · 过客：第六章道过晚安回房歇息",
    "结局四 · 归还（隐藏）：晚宴中对主人与沈先生均多留一份体谅与分寸，第六章将浮现第四个选择"
  ];
  const ENDING_NAMES = ["真相", "门后", "过客", "归还"];

  // 图鉴与名片夹点击详情预览（兼顾触屏与收集回看）
  function toggleCollectionDetail(scope, key, builder) {
    const detailEl = $("collection-detail-" + scope);
    if (!detailEl) return;
    const wrap = detailEl.parentElement;
    if (detailEl.dataset.activeKey === key && !detailEl.classList.contains("hidden")) {
      detailEl.classList.add("hidden");
      detailEl.dataset.activeKey = "";
      if (wrap) {
        wrap.querySelectorAll(".gallery-slot.active, .card-slot.active").forEach(function (b) {
          b.classList.remove("active");
        });
      }
      return;
    }
    detailEl.dataset.activeKey = key;
    detailEl.innerHTML = "";
    builder(detailEl);
    detailEl.classList.remove("hidden");
    AudioEngine.playSfx("click");
  }

  function renderGallery() {
    const g = getGallery();
    const ALL = ["endingA", "endingB", "endingC", "endingD"];
    ["title", "result"].forEach(function (scope) {
      const el = $("gallery-" + scope);
      if (!el) return;
      el.innerHTML = "";
      const detailEl = $("collection-detail-" + scope);
      if (detailEl) {
        detailEl.classList.add("hidden");
        detailEl.dataset.activeKey = "";
      }
      ALL.forEach(function (eid, idx) {
        const unlocked = !!g[eid];
        const slot = document.createElement("button");
        slot.type = "button";
        slot.className = "gallery-slot" + (unlocked ? " unlocked" : "");
        slot.title = unlocked ? NODES[eid].endingTitle : ENDING_HINTS[idx];
        slot.textContent = unlocked ? ENDING_NAMES[idx] : "?";
        slot.setAttribute("aria-label", unlocked ? NODES[eid].endingTitle : ("未解锁结局 " + (idx + 1) + " 线索"));
        slot.addEventListener("click", function () {
          const wrap = el.parentElement;
          const wasActive = slot.classList.contains("active");
          if (wrap) {
            wrap.querySelectorAll(".gallery-slot.active, .card-slot.active").forEach(function (b) {
              b.classList.remove("active");
            });
          }
          if (!wasActive) slot.classList.add("active");
          toggleCollectionDetail(scope, "ending:" + eid, function (box) {
            const head = document.createElement("div");
            head.className = "collection-detail-head";
            const titleSpan = document.createElement("span");
            titleSpan.textContent = unlocked ? NODES[eid].endingTitle : ("结局" + ["一", "二", "三", "四"][idx] + " · 未解锁");
            const tagSpan = document.createElement("span");
            tagSpan.className = "collection-detail-tag";
            tagSpan.textContent = unlocked ? "已收录" : "解锁线索";
            head.appendChild(titleSpan);
            head.appendChild(tagSpan);
            box.appendChild(head);
            const body = document.createElement("p");
            body.className = "collection-detail-body";
            body.textContent = unlocked
              ? (NODES[eid].body.replace(/\n+/g, " ") + "（" + ENDING_HINTS[idx] + "）")
              : ENDING_HINTS[idx];
            box.appendChild(body);
          });
        });
        el.appendChild(slot);
      });
    });
    const got = Object.keys(g).length;
    if (titleHint) {
      if (got > 0 && got < 4) {
        titleHint.textContent = "已解锁 " + got + "/4 个结局 · 新一局将启用平行题库，点击图鉴可看线索";
      } else if (got === 4) {
        titleHint.textContent = "四条结局已悉数走遍 · 庄园的门永远为你敞开";
      } else {
        titleHint.textContent = "约 6 分钟 · 4 个结局 · 双题库重玩不重样";
      }
    }
    resetGalleryBtn.classList.toggle("hidden", got === 0 && Object.keys(getCards()).length === 0);
  }

  // ---------- 16 型名片夹 ----------
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
    ["title", "result"].forEach(function (scope) {
      const el = $("cards-" + scope);
      if (!el) return;
      el.innerHTML = "";
      ALL_TYPES.forEach(function (code) {
        const unlocked = !!(c[code] && MBTI_TYPES[code]);
        const t = MBTI_TYPES[code];
        const slot = document.createElement("button");
        slot.type = "button";
        slot.className = "card-slot" + (unlocked ? " unlocked" : "");
        slot.dataset.code = code;
        if (unlocked) {
          slot.textContent = code;
          slot.title = t.name + " · " + t.role;
          slot.setAttribute("aria-label", code + " " + t.name + " 已解锁名片");
        } else {
          slot.textContent = "·";
          slot.title = "名片 " + code + " · 未解锁";
          slot.setAttribute("aria-label", "名片 " + code + " 未解锁");
        }
        slot.addEventListener("click", function () {
          const wrap = el.parentElement;
          const wasActive = slot.classList.contains("active");
          if (wrap) {
            wrap.querySelectorAll(".gallery-slot.active, .card-slot.active").forEach(function (b) {
              b.classList.remove("active");
            });
          }
          if (!wasActive) slot.classList.add("active");
          toggleCollectionDetail(scope, "card:" + code, function (box) {
            const head = document.createElement("div");
            head.className = "collection-detail-head";
            const titleSpan = document.createElement("span");
            titleSpan.textContent = unlocked ? (t.code + " · " + t.name) : ("名片 " + code + (t ? " · " + t.name : ""));
            const tagSpan = document.createElement("span");
            tagSpan.className = "collection-detail-tag";
            tagSpan.textContent = unlocked ? "已收录名片" : "尚未收录";
            head.appendChild(titleSpan);
            head.appendChild(tagSpan);
            box.appendChild(head);
            if (unlocked) {
              const roleP = document.createElement("p");
              roleP.className = "collection-detail-role";
              roleP.textContent = "「" + t.role + "」";
              const descP = document.createElement("p");
              descP.className = "collection-detail-body";
              descP.textContent = t.desc;
              box.appendChild(roleP);
              box.appendChild(descP);
            } else {
              const body = document.createElement("p");
              body.className = "collection-detail-body";
              body.textContent = "在晚宴的 12 次抉择中，当四维度倾向汇聚为 " + code + " 时，庄园主人将为你奉上这张拜访名片。";
              box.appendChild(body);
            }
          });
        });
        el.appendChild(slot);
      });
      const label = el.previousElementSibling;
      if (label && label.classList && label.classList.contains("cards-label")) {
        label.textContent = "名片夹 · 已集 " + got + "/16 型";
      }
    });
    const g = getGallery();
    resetGalleryBtn.classList.toggle("hidden", Object.keys(g).length === 0 && got === 0);
  }

  // ---------- 场景光照、交互隐喻与烛光端详增强 ----------
  const INSPECT_NODES = {
    ch2: true, s2: true, ch4: true,
    A0: true, A1: true, A2: true, A3: true,
    B0: true, B1: true, Bs1: true
  };
  function applyNodeFx(node) {
    appEl.classList.remove("fx-shatter");
    appEl.classList.toggle("candle-inspect", !!INSPECT_NODES[node.id]);
    document.body.classList.remove("tint-blue", "tint-gold");
    document.body.dataset.lighting = node.lighting || "foyer";
    if (node.effect === "shatter") {
      appEl.classList.add("fx-shatter");
      AudioEngine.playSfx("shatter");
      setTimeout(function () { appEl.classList.remove("fx-shatter"); }, 700);
    }
    if (node.tint === "blue") document.body.classList.add("tint-blue");
    if (node.tint === "gold") document.body.classList.add("tint-gold");
  }

  // ---------- 已读节点记录（快进用） ----------
  const READ_MAX = 200;
  let readSet = null;
  function readKey(nodeId) {
    return variantMap[nodeId] ? (nodeId + ":alt") : nodeId;
  }
  function markRead(nodeId) {
    try {
      if (readSet === null) readSet = JSON.parse(localStorage.getItem(K_READ)) || [];
      const k = readKey(nodeId);
      if (readSet.indexOf(k) < 0) {
        readSet.push(k);
        if (readSet.length > READ_MAX) readSet = readSet.slice(-READ_MAX);
        localStorage.setItem(K_READ, JSON.stringify(readSet));
      }
    } catch (e) { readSet = readSet || []; }
  }
  function isRead(nodeId) {
    try {
      if (readSet === null) readSet = JSON.parse(localStorage.getItem(K_READ)) || [];
    } catch (e) { readSet = []; }
    return readSet.indexOf(readKey(nodeId)) >= 0;
  }

  // ---------- 富文本解析（将 **...** 解析为 <em class="story-em">）与打字机 ----------
  function parseRichText(raw) {
    const str = String(raw || "");
    const segments = [];
    const chars = [];
    const re = /\*\*(.+?)\*\*/g;
    let lastIdx = 0;
    let m;
    while ((m = re.exec(str)) !== null) {
      if (m.index > lastIdx) {
        const plainArr = Array.from(str.slice(lastIdx, m.index));
        segments.push({ chars: plainArr, em: false });
        Array.prototype.push.apply(chars, plainArr);
      }
      const emArr = Array.from(m[1]);
      segments.push({ chars: emArr, em: true });
      Array.prototype.push.apply(chars, emArr);
      lastIdx = re.lastIndex;
    }
    if (lastIdx < str.length) {
      const tailArr = Array.from(str.slice(lastIdx));
      segments.push({ chars: tailArr, em: false });
      Array.prototype.push.apply(chars, tailArr);
    }
    return { segments: segments, chars: chars };
  }

  function fillRichSlice(container, segments, startIdx, endIdx) {
    container.textContent = "";
    let pos = 0;
    for (let s = 0; s < segments.length; s++) {
      const seg = segments[s];
      const len = seg.chars.length;
      const segStart = pos;
      const segEnd = pos + len;
      pos = segEnd;
      if (segEnd <= startIdx || segStart >= endIdx) continue;
      const from = Math.max(0, startIdx - segStart);
      const to = Math.min(len, endIdx - segStart);
      const sliceStr = seg.chars.slice(from, to).join("");
      if (!sliceStr) continue;
      if (seg.em) {
        const emEl = document.createElement("em");
        emEl.className = "story-em";
        emEl.textContent = sliceStr;
        container.appendChild(emEl);
      } else {
        container.appendChild(document.createTextNode(sliceStr));
      }
    }
  }

  function typeText(text, target, done, alreadyRead) {
    clearTyping();
    isTyping = true;
    target.classList.add("typing");
    target.setAttribute("aria-busy", "true");
    const parsed = parseRichText(text);
    const chars = parsed.chars;
    const segments = parsed.segments;
    let i = 0;
    const spd = SPEEDS[settings.speed];
    const shownEl = document.createElement("span");
    shownEl.className = "typing-shown";
    const restEl = document.createElement("span");
    restEl.style.visibility = "hidden";
    restEl.setAttribute("aria-hidden", "true");
    fillRichSlice(restEl, segments, 0, chars.length);
    target.textContent = "";
    target.appendChild(shownEl);
    target.appendChild(restEl);

    const skip = (settings.skipRead && alreadyRead && spd.base > 0) || spd.base === 0;
    if (skip) {
      fillRichSlice(target, segments, 0, chars.length);
      finishTyping(target);
      if (done) done();
      return;
    }

    function step() {
      if (i >= chars.length) {
        fillRichSlice(target, segments, 0, chars.length);
        finishTyping(target);
        if (done) done();
        return;
      }
      const ch = chars[i];
      i++;
      fillRichSlice(shownEl, segments, 0, i);
      fillRichSlice(restEl, segments, i, chars.length);
      const delay = /[。，；！？、\n」』——…]/.test(ch) ? spd.punct : spd.base;
      typingTimer = setTimeout(step, delay);
    }

    target.onclick = function () {
      if (!isTyping) return;
      clearTyping();
      fillRichSlice(target, segments, 0, chars.length);
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
    target.setAttribute("aria-busy", "false");
    target.onclick = null;
  }

  function clearAuto() {
    if (autoTimer) { clearTimeout(autoTimer); autoTimer = null; }
  }
  function clearNext() {
    if (nextTimer) { clearTimeout(nextTimer); nextTimer = null; }
  }
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
    progressEl.setAttribute("aria-valuenow", String(choiceIndex));
    if (progressLabelEl) {
      const stepNum = Math.min(TOTAL_CHOICES, choiceIndex + 1);
      progressLabelEl.textContent = choiceIndex >= TOTAL_CHOICES
        ? ("已完成 " + TOTAL_CHOICES + " / " + TOTAL_CHOICES + " 问")
        : ("第 " + stepNum + " / " + TOTAL_CHOICES + " 问");
    }
  }

  // ---------- 历史记录（支持点击「回溯至此」直接跳回过去节点） ----------
  function pushHistory(entry) {
    log.push(entry);
    if (log.length > 60) log.shift();
  }
  function jumpToUndoIndex(idx) {
    if (idx < 0 || idx >= undoStack.length) return;
    clearNext();
    const snap = undoStack[idx];
    undoStack = undoStack.slice(0, idx);
    restore(snap);
    AudioEngine.playSfx("click");
    currentEnding = null;
    closePanels();
    resultScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    toolbar.classList.remove("hidden");
    clearAuto();
    clearTyping();
    playNode(currentNodeId, true);
  }
  function renderHistory() {
    historyList.innerHTML = "";
    if (log.length === 0) {
      const li = document.createElement("li");
      li.textContent = "（夜才刚刚开始……）";
      li.className = "history-item history-dim";
      historyList.appendChild(li);
      return;
    }
    log.forEach(function (h) {
      if (h.chapter) {
        const li = document.createElement("li");
        li.className = "history-chapter";
        const span = document.createElement("span");
        span.textContent = h.chapter;
        li.appendChild(span);
        // 若 undoStack 中存在该节点的快照，提供「回溯至此」按钮
        if (h.nodeId && h.nodeId !== currentNodeId) {
          let snapIdx = -1;
          for (let i = undoStack.length - 1; i >= 0; i--) {
            if (undoStack[i].nodeId === h.nodeId) { snapIdx = i; break; }
          }
          if (snapIdx >= 0) {
            const jbtn = document.createElement("button");
            jbtn.type = "button";
            jbtn.className = "link-btn history-jump";
            jbtn.textContent = "回溯至此";
            jbtn.addEventListener("click", function () { jumpToUndoIndex(snapIdx); });
            li.appendChild(jbtn);
          }
        }
        historyList.appendChild(li);
      }
      if (h.text) {
        const li2 = document.createElement("li");
        li2.className = "history-item";
        const parsedH = parseRichText(h.text);
        fillRichSlice(li2, parsedH.segments, 0, parsedH.chars.length);
        historyList.appendChild(li2);
      }
      if (h.chosen) {
        const li3 = document.createElement("li");
        li3.className = "history-chosen";
        li3.textContent = h.chosen;
        historyList.appendChild(li3);
      }
    });
    setTimeout(function () { historyList.scrollTop = historyList.scrollHeight; }, 0);
  }

  // ---------- 序章火漆信封开场仪式 ----------
  let pendingPrologueStart = null;
  function unsealEnvelope() {
    if (!waxEnvelope) return;
    waxEnvelope.classList.add("unsealed");
    gameScreen.classList.remove("seal-locked");
    AudioEngine.playSfx("seal");
    if (pendingPrologueStart) {
      const fn = pendingPrologueStart;
      pendingPrologueStart = null;
      fn();
    }
  }

  // ---------- 节点播放 ----------
  function playNode(nodeId, replay) {
    const node = NODES[nodeId];
    if (!node) { console.error("未知节点: " + nodeId); return; }
    currentNodeId = nodeId;
    pendingPrologueStart = null;
    pendingChoiceSnap = null;
    optionsEl.innerHTML = "";
    applyNodeFx(node);
    updateUndoBar();

    if (waxEnvelope) {
      if (nodeId === "prologue") {
        waxEnvelope.classList.remove("hidden");
        if (!replay) {
          waxEnvelope.classList.remove("unsealed");
        } else {
          waxEnvelope.classList.add("unsealed");
        }
      } else {
        waxEnvelope.classList.add("hidden");
        gameScreen.classList.remove("seal-locked");
      }
    }

    if (node.type === "narrative") {
      const resolved = Engine.resolveNode(node, flags, variantMap);
      chapterEl.textContent = node.chapter || "";
      renderProgress();
      if (!replay) pushHistory({ nodeId: nodeId, chapter: node.chapter, text: resolved.text });
      saveGame();
      const wasRead = isRead(nodeId);
      markRead(nodeId);

      // 非立即档且首次进入序章时，先展示封缄火漆信封，待点击火漆印（或按空格）后启封打字
      if (nodeId === "prologue" && !replay && settings.speed !== "instant" && !settings.auto) {
        gameScreen.classList.add("seal-locked");
        pendingPrologueStart = function () {
          typeText(resolved.text, storyEl, function () {
            showContinueHint(function () { playNode(node.next); });
          }, wasRead);
        };
        return;
      }

      gameScreen.classList.remove("seal-locked");
      typeText(resolved.text, storyEl, function () {
        showContinueHint(function () { playNode(node.next); });
      }, wasRead);
      return;
    }

    if (node.type === "choice") {
      const resolved = Engine.resolveNode(node, flags, variantMap);
      chapterEl.textContent = node.chapter || "";
      renderProgress();
      if (!replay) pushHistory({ nodeId: nodeId, chapter: node.chapter, text: resolved.text });
      saveGame();
      const wasRead = isRead(nodeId);
      markRead(nodeId);
      typeText(resolved.text, storyEl, function () {
        showOptions(node, resolved.options);
      }, wasRead);
      return;
    }

    if (node.type === "ending") {
      currentEnding = node;
      unlockEnding(node.id);
      unlockCard(computeMBTI().code);
      saveGame();
      showResult(node);
    }
  }

  // ---------- 选项与可控反馈 ----------
  function optionVisible(opt) {
    return Engine.optionVisible(opt, affinity);
  }

  function showOptions(node, rawOptions) {
    optionsEl.innerHTML = "";
    const list = rawOptions || node.options;
    const visible = list.filter(optionVisible);
    visible.forEach(function (opt, idx) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "option-card" + (opt.hidden ? " option-hidden" : "");
      btn.dataset.idx = idx;
      const keySpan = document.createElement("span");
      keySpan.className = "opt-key";
      keySpan.textContent = String(idx + 1);
      const textSpan = document.createElement("span");
      textSpan.textContent = opt.text;
      btn.appendChild(keySpan);
      btn.appendChild(textSpan);
      btn.style.transitionDelay = (idx * 0.1) + "s";
      btn.addEventListener("click", function () { chooseOption(node, opt, btn); });
      optionsEl.appendChild(btn);
      requestAnimationFrame(function () { btn.classList.add("show"); });
    });
  }

  function renderFeedbackContent(fbEl, feedbackText) {
    const raw = String(feedbackText || "");
    const m = raw.match(/^(.*?)(\s*〔[^〕]+〕)$/);
    if (m) {
      fbEl.appendChild(document.createTextNode(m[1]));
      const badge = document.createElement("span");
      badge.className = "affinity-badge";
      badge.textContent = m[2].trim();
      fbEl.appendChild(badge);
    } else {
      fbEl.textContent = raw;
    }
  }

  function chooseOption(node, opt, btn) {
    const all = optionsEl.querySelectorAll(".option-card");
    all.forEach(function (b) {
      b.disabled = true;
      b.style.transitionDelay = "0s";
      if (b !== btn) b.classList.add("option-dismissed");
    });
    btn.classList.add("chosen");
    AudioEngine.playSfx("click");
    dismissToolbarGuide();

    const preSnap = snapshot();
    pendingChoiceSnap = preSnap;
    undoStack.push(preSnap);
    if (undoStack.length > 20) undoStack.shift();

    pushHistory({ chosen: opt.text });

    if (Engine.applyOption(scores, flags, affinity, opt)) choiceIndex++;
    renderProgress();

    // 选后反馈：保留所选卡片定格，收起未选项后平滑浮现反馈正文 + 「继续（空格）」按钮
    clearNext();
    nextTimer = setTimeout(function () {
      nextTimer = null;
      optionsEl.querySelectorAll(".option-card:not(.chosen)").forEach(function (b) {
        if (b.parentNode === optionsEl) optionsEl.removeChild(b);
      });
      const fb = document.createElement("p");
      fb.className = "feedback";
      renderFeedbackContent(fb, opt.feedback);
      optionsEl.appendChild(fb);
      updateUndoBar();
      showContinueHint(function () { playNode(opt.next); });
    }, 280);
  }

  // ---------- 撤销 ----------
  function updateUndoBar() {
    undoBar.classList.toggle("hidden", undoStack.length === 0);
  }
  function doUndo() {
    if (!undoStack.length) return;
    clearNext();
    restore(undoStack.pop());
    AudioEngine.playSfx("click");
    currentEnding = null;
    resultScreen.classList.add("hidden");
    gameScreen.classList.remove("hidden");
    toolbar.classList.remove("hidden");
    clearAuto();
    clearTyping();
    playNode(currentNodeId, true);
  }

  // ---------- 继续提示 ----------
  function showContinueHint(onContinue) {
    const hint = document.createElement("button");
    hint.type = "button";
    hint.className = "btn-ghost";
    hint.textContent = "继续（空格）";
    hint.style.marginTop = "4px";
    hint.style.opacity = "0";
    hint.style.transition = "opacity 0.4s";
    optionsEl.appendChild(hint);
    requestAnimationFrame(function () { hint.style.opacity = "1"; });
    const go = function () {
      if (hint.disabled) return;
      hint.disabled = true;
      clearAuto();
      onContinue();
    };
    hint.addEventListener("click", go);
    if (settings.auto) {
      autoContinue(1400, go);
    }
  }

  // ---------- MBTI 计算与结局展示 ----------
  function computeMBTI() {
    return MBTI_TYPES[Engine.computeCode(scores)];
  }
  function buildEndingText(node) {
    return Engine.buildEndingText(node, flags);
  }

  function flipMbtiCard(toBack) {
    if (!mbtiBox) return;
    const wantFlip = typeof toBack === "boolean" ? toBack : !mbtiBox.classList.contains("is-flipped");
    mbtiBox.classList.toggle("is-flipped", wantFlip);
    AudioEngine.playSfx(wantFlip ? "flip" : "click");
  }

  function showResult(ending) {
    gameScreen.classList.add("hidden");
    toolbar.classList.add("hidden");
    resultScreen.classList.remove("hidden");
    renderGallery();
    renderCards();
    AudioEngine.playSfx("reveal");

    endingTitleEl.textContent = ending.endingTitle;
    if (mbtiFrontTitle) mbtiFrontTitle.textContent = ending.endingTitle;
    if (mbtiBox) mbtiBox.classList.remove("is-flipped");
    const fullText = buildEndingText(ending);
    if (endingSkipHint) {
      endingSkipHint.classList.toggle("hidden", settings.speed === "instant");
    }
    typeText(fullText, endingTextEl, function () {
      if (endingSkipHint) endingSkipHint.classList.add("hidden");
      if (mbtiBox) mbtiBox.classList.add("mbti-show");
      AudioEngine.playSfx("chime");
    });

    const m = computeMBTI();
    mbtiCode.textContent = m.code;
    mbtiName.textContent = m.name;
    mbtiRole.textContent = "「" + m.role + "」";
    mbtiDesc.textContent = m.desc;

    const resultHint = $("result-hint");
    if (resultHint) {
      if (ending.id === "endingD") {
        resultHint.textContent = "你推开了那扇最难推开的门——这一夜，三个人的告别都与你有关。";
      } else if (affinity.master >= 2 || affinity.shen >= 2) {
        const who = affinity.master >= 2 ? "主人已认可你的分寸，只差走进沈先生的心事" : "沈先生已向你敞开心扉，只差赢得主人的信任";
        resultHint.textContent = "离席时，似乎还有一扇门与你擦肩而过（" + who + "）。再赴晚宴，那扇门或许会为你而开。";
      } else {
        resultHint.textContent = "这一夜的晚宴只有三位客人赴约——若在席间对主人与沈先生多一分体谅与克制，第六章将浮现第四条路。";
      }
    }

    renderMbtiBars();
  }

  // ---------- 四维度倾向条（含百分比） ----------
  const MBTI_DIMS = [
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
      const pctR = Math.round((r / total) * 100);
      const pctL = 100 - pctR;
      const row = document.createElement("div");
      row.className = "mbti-bar-row";
      row.title = d.label + "：" + d.left + " " + pctL + "% / " + d.right + " " + pctR + "%";
      const sideL = document.createElement("span");
      sideL.className = "bar-side bar-side-l" + (l > r ? " side-win" : "");
      sideL.textContent = d.left + " " + pctL + "%";
      const track = document.createElement("span");
      track.className = "bar-track";
      const fill = document.createElement("span");
      fill.className = "bar-fill";
      if (l >= r) {
        fill.style.left = "0";
        fill.style.width = pctL + "%";
      } else {
        fill.style.left = (100 - pctR) + "%";
        fill.style.width = pctR + "%";
      }
      track.appendChild(fill);
      const sideR = document.createElement("span");
      sideR.className = "bar-side bar-side-r" + (r > l ? " side-win" : "");
      sideR.textContent = pctR + "% " + d.right;
      row.appendChild(sideL);
      row.appendChild(track);
      row.appendChild(sideR);
      barsEl.appendChild(row);
    });
  }

  // ---------- 复制结局 / 保存名片图 ----------
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
      "晚宴为我写下的画像——" + m.code + " · " + m.name + "\n" + m.role;
    const cleanEndingText = buildEndingText(currentEnding).replace(/\*\*(.+?)\*\*/g, "$1");
    const text =
      shareTitle + "\n" +
      cleanEndingText + "\n\n" +
      shareSummary + "\n\n" +
      "来迷雾庄园，赴一场测出你十六型人格的晚宴：https://mist.gchkc.top\n" +
      "四条剧情线 · 一个隐藏结局 · 我已解锁 " + got + "/4 个结局 · 名片夹 " + cardsGot + "/16 型";
    if (canShare()) {
      navigator.share({ title: shareTitle, text: text })
        .then(function () { shareSucceeded(); })
        .catch(function (err) {
          if (err && err.name === "AbortError") return;
          fallbackCopy(text);
        });
    } else {
      fallbackCopy(text);
    }
  }
  function shareSucceeded() {
    shareBtn.textContent = "已分享";
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
    shareBtn.textContent = "已复制";
    setTimeout(updateShareBtn, 1800);
  }

  // 提炼本局专属晚宴轨迹印记（供名片图展示个性化足迹）
  const FOOTPRINT_LABELS = [
    { flag: "flag_loud",      label: "推门自报来意" },
    { flag: "flag_quiet",     label: "叩环静候檐下" },
    { flag: "flag_frame",     label: "轻翻覆面银框" },
    { flag: "flag_detail",    label: "细辨1887画款" },
    { flag: "flag_sigh",      label: "凝望黑裙背影" },
    { flag: "flag_guest",     label: "与沈先生同席" },
    { flag: "flag_photo",     label: "瞥见滑落旧照" },
    { flag: "flag_mercy",     label: "温言解围碎瓷" },
    { flag: "flag_logic",     label: "冷静建言锔补" },
    { flag: "flag_chronicle", label: "校对百年日志" },
    { flag: "flag_return",    label: "银匙归还陈列" },
    { flag: "flag_keep",      label: "带走百年银匙" },
    { flag: "flag_room",      label: "推开纸星小门" },
    { flag: "flag_respect",   label: "守礼未启小门" },
    { flag: "flag_find",      label: "荒草拾得旧匙" },
    { flag: "flag_hook",      label: "井台挂回银匙" },
    { flag: "flag_song",      label: "井畔静立听曲" },
    { flag: "flag_rose",      label: "井台播撒蔷薇" },
    { flag: "flag_stone",     label: "井畔立碑为记" }
  ];
  function buildFootprints() {
    const picked = [];
    // 优先取线内特征旗标 + 公共线代表旗标，凑齐 3 枚印记
    for (let i = FOOTPRINT_LABELS.length - 1; i >= 0; i--) {
      if (flags[FOOTPRINT_LABELS[i].flag]) {
        picked.unshift(FOOTPRINT_LABELS[i].label);
        if (picked.length >= 3) break;
      }
    }
    return picked;
  }

  function saveCard() {
    if (!currentEnding) return;
    if (mbtiBox && mbtiBox.classList.contains("mbti-show") && !mbtiBox.classList.contains("is-flipped")) {
      flipMbtiCard(true);
    }
    const gotEndings = Object.keys(getGallery()).length;
    const gotCards = Object.keys(getCards()).length;
    CardExporter.saveCardImage({
      mbti: computeMBTI(),
      endingTitle: currentEnding.endingTitle,
      scores: scores,
      dims: MBTI_DIMS,
      footprints: buildFootprints(),
      collectionSummary: "已解锁 " + gotEndings + "/4 结局 · 名片夹 " + gotCards + "/16 型"
    }, cardBtn);
  }

  // ---------- 进度备份导出 / 导入（面板内联交互，无阻塞弹窗） ----------
  function exportBackup() {
    const payload = {
      v: 1,
      gallery: getGallery(),
      cards: getCards(),
      save: loadSave()
    };
    const code = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    fallbackCopy(code);
    exportBtn.textContent = "备份码已复制";
    setTimeout(function () { exportBtn.textContent = "导出备份码"; }, 1800);
  }
  function applyBackupCode(raw) {
    const trimmed = String(raw || "").trim();
    if (!trimmed) {
      if (importStatus) importStatus.textContent = "请先粘贴备份码。";
      return false;
    }
    try {
      const data = JSON.parse(decodeURIComponent(escape(atob(trimmed))));
      if (!data || typeof data !== "object") throw new Error("bad");
      if (data.gallery && typeof data.gallery === "object") {
        localStorage.setItem(K_GALLERY, JSON.stringify(data.gallery));
      }
      if (data.cards && typeof data.cards === "object") {
        localStorage.setItem(K_CARDS, JSON.stringify(data.cards));
      }
      if (data.save && validSave(data.save)) {
        localStorage.setItem(K_SAVE, JSON.stringify(data.save));
      }
      renderGallery();
      renderCards();
      updateContinueBtn();
      if (importStatus) importStatus.textContent = "恢复成功！图鉴与存档已同步。";
      importBtn.textContent = "已恢复";
      setTimeout(function () {
        importBtn.textContent = "导入恢复";
        if (importBox) importBox.classList.add("hidden");
        if (importStatus) importStatus.textContent = "";
      }, 1500);
      return true;
    } catch (e) {
      if (importStatus) importStatus.textContent = "备份码无效或已损坏，请检查是否复制完整。";
      return false;
    }
  }
  function toggleImportBox() {
    if (!importBox) return;
    const willOpen = importBox.classList.contains("hidden");
    importBox.classList.toggle("hidden", !willOpen);
    if (importStatus) importStatus.textContent = "";
    if (willOpen && importInput) {
      importInput.value = "";
      importInput.focus();
    }
  }

  // ---------- 首次印章微引导 ----------
  function showToolbarGuideIfNeeded() {
    if (!toolbarGuide) return;
    let seen = false;
    try { seen = !!localStorage.getItem(K_GUIDE); } catch (e) {}
    if (seen) { toolbarGuide.classList.add("hidden"); return; }
    toolbarGuide.classList.remove("hidden");
  }
  function dismissToolbarGuide() {
    if (!toolbarGuide || toolbarGuide.classList.contains("hidden")) return;
    toolbarGuide.classList.add("hidden");
    try { localStorage.setItem(K_GUIDE, "1"); } catch (e) {}
  }

  // ---------- 面板控制（含焦点管理） ----------
  let lastFocus = null;
  function activePanel() {
    if (!settingsPanel.classList.contains("hidden")) return settingsPanel;
    if (!historyPanel.classList.contains("hidden")) return historyPanel;
    return null;
  }
  function focusables(panel) {
    return Array.prototype.slice.call(panel.querySelectorAll("button:not(:disabled), input:not(:disabled)"))
      .filter(function (el) { return el.offsetParent !== null; });
  }
  function openPanel(panel) {
    dismissToolbarGuide();
    if (!activePanel()) lastFocus = document.activeElement;
    settingsPanel.classList.add("hidden");
    historyPanel.classList.add("hidden");
    panel.classList.remove("hidden");
    document.body.classList.add("panel-open");
    const f = focusables(panel);
    const primary = panel.querySelector(".btn-primary") || f[0];
    if (primary) primary.focus();
  }
  function closePanels() {
    const had = !!activePanel();
    settingsPanel.classList.add("hidden");
    historyPanel.classList.add("hidden");
    document.body.classList.remove("panel-open");
    if (importBox) importBox.classList.add("hidden");
    if (importStatus) importStatus.textContent = "";
    if (had && lastFocus && lastFocus.offsetParent !== null && lastFocus.focus) lastFocus.focus();
    if (had) lastFocus = null;
  }
  function trapTab(e, panel) {
    const f = focusables(panel);
    if (!f.length) { e.preventDefault(); return; }
    const first = f[0], last = f[f.length - 1];
    if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); return; }
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function toggleSettings() {
    if (settingsPanel.classList.contains("hidden")) {
      applySettingsUI();
      renderSlots();
      openPanel(settingsPanel);
    } else {
      closePanels();
    }
  }
  function toggleHistory() {
    if (historyPanel.classList.contains("hidden")) {
      renderHistory();
      openPanel(historyPanel);
    } else {
      closePanels();
    }
  }
  function toggleAuto() {
    dismissToolbarGuide();
    settings.auto = !settings.auto;
    saveSettings();
    applySettingsUI();
    if (settings.auto) {
      if (gameScreen.classList.contains("seal-locked")) {
        unsealEnvelope();
        return;
      }
      const hint = optionsEl.querySelector(".btn-ghost:not(:disabled)");
      if (hint && hint.textContent.indexOf("继续") >= 0) hint.click();
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
    showToolbarGuideIfNeeded();

    if (fresh) {
      resetState();
      variantMap = buildVariantMap();
      playNode("prologue");
    } else {
      const s = loadSave();
      resetState();
      if (s) {
        currentNodeId = s.nodeId;
        choiceIndex = s.choiceIndex || 0;
        scores = s.scores;
        flags = s.flags;
        affinity = s.affinity;
        variantMap = s.variantMap || {};
        log = s.history;
        undoStack = s.undoStack || [];
        playNode(s.nodeId, true);
      } else {
        variantMap = buildVariantMap();
        playNode("prologue");
      }
    }
  }

  function resetState() {
    currentNodeId = "prologue";
    choiceIndex = 0;
    scores = Engine.newScores();
    flags = {};
    affinity = Engine.newAffinity();
    variantMap = {};
    currentEnding = null;
    undoStack = [];
    log = [];
    clearTyping();
    clearAuto();
    clearNext();
    storyEl.textContent = "";
    storyEl.onclick = null;
    endingTextEl.textContent = "";
    endingTextEl.onclick = null;
    pendingPrologueStart = null;
    pendingChoiceSnap = null;
    if (endingSkipHint) endingSkipHint.classList.add("hidden");
    if (waxEnvelope) {
      waxEnvelope.classList.add("hidden");
      waxEnvelope.classList.remove("unsealed");
    }
    gameScreen.classList.remove("seal-locked");
    if (mbtiBox) {
      mbtiBox.classList.remove("mbti-show", "is-flipped");
    }
    optionsEl.innerHTML = "";
    chapterEl.textContent = "";
    progressEl.innerHTML = "";
    undoBar.classList.add("hidden");
    document.body.classList.remove("tint-blue", "tint-gold");
    document.body.dataset.lighting = "foyer";
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
    document.body.classList.remove("tint-blue", "tint-gold");
    document.body.dataset.lighting = "foyer";
    updateContinueBtn();
    renderGallery();
    renderCards();
  }

  // ---------- 键盘操作 ----------
  function onKeydown(e) {
    const panelOpen = !settingsPanel.classList.contains("hidden") || !historyPanel.classList.contains("hidden");
    if (e.key === "Tab" && panelOpen) { trapTab(e, activePanel()); return; }
    if (e.key === "Escape") {
      if (panelOpen) { closePanels(); return; }
      if (!gameScreen.classList.contains("hidden")) { toggleSettings(); return; }
      return;
    }
    if (panelOpen) return;

    const inResult = !resultScreen.classList.contains("hidden");
    if (inResult && (e.key === " " || e.code === "Space")) {
      if (isTyping) {
        e.preventDefault();
        endingTextEl.click();
        return;
      }
      if (mbtiBox && mbtiBox.classList.contains("mbti-show") && !mbtiBox.classList.contains("is-flipped")) {
        e.preventDefault();
        flipMbtiCard(true);
        return;
      }
    }

    const inGame = !gameScreen.classList.contains("hidden");
    if (!inGame) return;

    if (e.key === " " || e.code === "Space") {
      if (gameScreen.classList.contains("seal-locked")) {
        e.preventDefault();
        unsealEnvelope();
        return;
      }
    }

    if (/^[1-4]$/.test(e.key)) {
      const cards = optionsEl.querySelectorAll(".option-card:not(:disabled)");
      const idx = parseInt(e.key, 10) - 1;
      if (cards[idx]) { cards[idx].click(); }
      return;
    }
    if (e.key === " " || e.code === "Space") {
      e.preventDefault();
      if (isTyping) { storyEl.click(); return; }
      const hint = optionsEl.querySelector(".btn-ghost:not(:disabled)");
      if (hint) hint.click();
      return;
    }
    if (e.key === "a" || e.key === "A") { toggleAuto(); return; }
    if (e.key === "h" || e.key === "H") { toggleHistory(); return; }
    if (e.key === "z" || e.key === "Z") { doUndo(); return; }
  }

  // ---------- 事件绑定 ----------
  startBtn.addEventListener("click", function () {
    if (loadSave() && !window.confirm("开始新的晚宴会覆盖当前存档，确定吗？")) return;
    try { localStorage.removeItem(K_SAVE); } catch (e) {}
    startGame(true);
  });
  continueBtn.addEventListener("click", function () { startGame(false); });
  if (titleRainBtn) {
    titleRainBtn.addEventListener("click", function () {
      settings.rain = !settings.rain;
      saveSettings();
      applySettingsUI();
    });
  }
  againBtn.addEventListener("click", function () { startGame(true); });
  shareBtn.addEventListener("click", shareResult);
  cardBtn.addEventListener("click", saveCard);
  if (endingSkipHint) {
    endingSkipHint.addEventListener("click", function () {
      if (isTyping) endingTextEl.click();
    });
  }
  if (waxSealBtn) {
    waxSealBtn.addEventListener("click", unsealEnvelope);
  }
  if (mbtiFront) {
    mbtiFront.addEventListener("click", function () { flipMbtiCard(true); });
    mbtiFront.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        flipMbtiCard(true);
      }
    });
  }
  if (mbtiFlipBackBtn) {
    mbtiFlipBackBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      flipMbtiCard(false);
    });
  }

  // ---------- 实时烛光随鼠标/指尖摇曳微交互（rAF 节流） ----------
  let candleRaf = null;
  let pointerX = 0;
  let pointerY = 0;
  function updateCandleLight() {
    candleRaf = null;
    const rect = appEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const xPct = Math.max(0, Math.min(100, ((pointerX - rect.left) / rect.width) * 100));
    const yPct = Math.max(0, Math.min(100, ((pointerY - rect.top) / rect.height) * 100));
    appEl.style.setProperty("--spot-x", xPct.toFixed(1) + "%");
    appEl.style.setProperty("--spot-y", yPct.toFixed(1) + "%");
    appEl.style.setProperty("--spot-opacity", "1");
    const sway = ((xPct - 50) / 50) * 7;
    document.body.style.setProperty("--candle-sway-x", sway.toFixed(1) + "px");
  }
  function onPointerTrack(e) {
    pointerX = e.clientX;
    pointerY = e.clientY;
    if (!candleRaf) {
      candleRaf = requestAnimationFrame(updateCandleLight);
    }
  }
  appEl.addEventListener("pointermove", onPointerTrack, { passive: true });
  appEl.addEventListener("pointerdown", onPointerTrack, { passive: true });
  appEl.addEventListener("pointerleave", function () {
    appEl.style.setProperty("--spot-opacity", "0");
    document.body.style.setProperty("--candle-sway-x", "0px");
  });

  settingsBtn.addEventListener("click", toggleSettings);
  settingsClose.addEventListener("click", closePanels);
  quitBtn.addEventListener("click", quitToTitle);
  historyBtn.addEventListener("click", toggleHistory);
  historyClose.addEventListener("click", closePanels);
  autoBtn.addEventListener("click", toggleAuto);

  speedSeg.querySelectorAll("button").forEach(function (b) {
    b.addEventListener("click", function () {
      settings.speed = b.dataset.speed;
      saveSettings();
      applySettingsUI();
      if (settings.speed === "instant" && gameScreen.classList.contains("seal-locked")) {
        unsealEnvelope();
      }
      AudioEngine.playSfx("click");
    });
  });
  if (fontSeg) {
    fontSeg.querySelectorAll("button").forEach(function (b) {
      b.addEventListener("click", function () {
        settings.font = b.dataset.font;
        saveSettings();
        applySettingsUI();
        AudioEngine.playSfx("click");
      });
    });
  }
  if (contrastToggle) {
    contrastToggle.addEventListener("click", function () {
      settings.contrast = !settings.contrast;
      saveSettings();
      applySettingsUI();
      AudioEngine.playSfx("click");
    });
  }
  if (saveSlotsEl) {
    saveSlotsEl.querySelectorAll(".slot-item").forEach(function (row) {
      const idx = parseInt(row.dataset.slot, 10);
      const sBtn = row.querySelector(".slot-save");
      const lBtn = row.querySelector(".slot-load");
      sBtn.addEventListener("click", function () { saveToSlot(idx, sBtn); });
      lBtn.addEventListener("click", function () { loadFromSlot(idx, lBtn); });
    });
  }
  sfxToggle.addEventListener("click", function () {
    settings.sfx = !settings.sfx;
    saveSettings();
    applySettingsUI();
    if (settings.sfx) AudioEngine.playSfx("chime");
  });
  rainToggle.addEventListener("click", function () {
    settings.rain = !settings.rain;
    saveSettings();
    applySettingsUI();
  });
  if (volumeRange) {
    volumeRange.addEventListener("input", function () {
      settings.volume = Math.max(0, Math.min(1, parseInt(volumeRange.value, 10) / 100));
      saveSettings();
      AudioEngine.setConfig({ volume: settings.volume });
    });
  }
  skipToggle.addEventListener("click", function () {
    settings.skipRead = !settings.skipRead;
    saveSettings();
    applySettingsUI();
  });
  autoToggle.addEventListener("click", toggleAuto);
  if (exportBtn) exportBtn.addEventListener("click", exportBackup);
  if (importBtn) importBtn.addEventListener("click", toggleImportBox);
  if (importConfirmBtn) {
    importConfirmBtn.addEventListener("click", function () {
      applyBackupCode(importInput ? importInput.value : "");
    });
  }
  if (importInput) {
    importInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        applyBackupCode(importInput.value);
      }
    });
  }

  undoBtn.addEventListener("click", doUndo);
  resetGalleryBtn.addEventListener("click", function () {
    if (!window.confirm("确定要清空结局图鉴与 16 型名片夹吗？")) return;
    try {
      localStorage.removeItem(K_GALLERY);
      localStorage.removeItem(K_CARDS);
      localStorage.removeItem(K_RUNS);
    } catch (e) {}
    renderGallery();
    renderCards();
    updateContinueBtn();
    resetGalleryBtn.classList.add("hidden");
  });

  document.addEventListener("keydown", onKeydown);

  // 首次用户手势恢复被挂起的音频上下文
  function unlockAudio() {
    document.removeEventListener("pointerdown", unlockAudio);
    document.removeEventListener("keydown", unlockAudio);
    AudioEngine.unlock();
  }
  document.addEventListener("pointerdown", unlockAudio);
  document.addEventListener("keydown", unlockAudio);

  // 页面切到后台时暂停 Auto 计时器与雨声
  document.addEventListener("visibilitychange", function () {
    AudioEngine.onVisibilityChange(document.hidden);
    if (document.hidden) clearAuto();
  });

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
