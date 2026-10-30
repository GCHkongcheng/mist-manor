/* ============================================================
   迷雾庄园 · WebAudio 音效与雨声氛围模块（零外部音频资源）
   包含：点击/揭晓/碎瓷合成音效、双滤波器雨声、音量控制、后台自动暂停
   ============================================================ */
(function (root) {
  "use strict";

  var audioCtx = null;
  var rainCtx = null, rainGain = null, rainFadeTimer = null;
  var enabledSfx = false;
  var enabledRain = false;
  var masterVolume = 0.8; // 0.0 ~ 1.0

  function setConfig(opts) {
    if (typeof opts.sfx === "boolean") enabledSfx = opts.sfx;
    if (typeof opts.volume === "number") {
      masterVolume = Math.max(0, Math.min(1, opts.volume));
      if (rainCtx && rainGain && enabledRain) {
        var t = rainCtx.currentTime;
        rainGain.gain.cancelScheduledValues(t);
        rainGain.gain.setTargetAtTime(0.055 * masterVolume, t, 0.2);
      }
    }
    if (typeof opts.rain === "boolean") {
      enabledRain = opts.rain;
      setRain(enabledRain);
    }
  }

  function playSfx(kind) {
    if (!enabledSfx || masterVolume <= 0) return;
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
      var t = audioCtx.currentTime;
      var osc = audioCtx.createOscillator();
      var gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      var freq = 660, dur = 0.06, vol = 0.035, type = "sine";
      if (kind === "click")   { freq = 740; dur = 0.05; }
      if (kind === "chime")   { freq = 880; dur = 0.35; vol = 0.05; }
      if (kind === "shatter") { freq = 190; dur = 0.22; vol = 0.07; type = "triangle"; }
      if (kind === "reveal")  { freq = 523; dur = 0.6;  vol = 0.055; }
      vol = Math.max(0.0002, vol * masterVolume);
      osc.type = type;
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(vol, t);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.start(t);
      osc.stop(t + dur + 0.05);
    } catch (e) {}
  }

  function buildRain() {
    rainCtx = new (window.AudioContext || window.webkitAudioContext)();
    var len = rainCtx.sampleRate * 2;
    var buf = rainCtx.createBuffer(1, len, rainCtx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    var src = rainCtx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    var lp = rainCtx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 650;
    lp.Q.value = 0.4;
    var bp = rainCtx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 0.3;
    var bpGain = rainCtx.createGain();
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
  }

  function setRain(on) {
    try {
      if (on && masterVolume > 0) {
        if (!rainCtx) buildRain();
        if (rainCtx.state === "suspended") rainCtx.resume();
        if (rainFadeTimer) { clearTimeout(rainFadeTimer); rainFadeTimer = null; }
        var t = rainCtx.currentTime;
        rainGain.gain.cancelScheduledValues(t);
        rainGain.gain.setValueAtTime(rainGain.gain.value, t);
        rainGain.gain.linearRampToValueAtTime(0.055 * masterVolume, t + 1.6);
      } else if (rainCtx && rainGain) {
        var t2 = rainCtx.currentTime;
        rainGain.gain.cancelScheduledValues(t2);
        rainGain.gain.setValueAtTime(rainGain.gain.value, t2);
        rainGain.gain.linearRampToValueAtTime(0.0001, t2 + 1.2);
        rainFadeTimer = setTimeout(function () {
          rainFadeTimer = null;
          if (rainCtx && rainCtx.state === "running" && !enabledRain) rainCtx.suspend();
        }, 1300);
      }
    } catch (e) {}
  }

  function unlock() {
    try {
      if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
      if (enabledRain) setRain(true);
    } catch (e) {}
  }

  // 页面切到后台时自动挂起雨声，回到前台时恢复
  function onVisibilityChange(hidden) {
    try {
      if (hidden) {
        if (rainCtx && rainCtx.state === "running") rainCtx.suspend();
      } else if (enabledRain && rainCtx && rainCtx.state === "suspended") {
        rainCtx.resume();
      }
    } catch (e) {}
  }

  root.AudioEngine = {
    setConfig: setConfig,
    playSfx: playSfx,
    setRain: setRain,
    unlock: unlock,
    onVisibilityChange: onVisibilityChange
  };
})(typeof self !== "undefined" ? self : this);
