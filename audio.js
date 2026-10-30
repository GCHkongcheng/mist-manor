/* ============================================================
   迷雾庄园 · WebAudio 音效与雨声氛围模块（零外部音频资源）
   包含：单一共享 AudioContext、木质点击/多泛音碎瓷/琶音揭晓合成音效、
        双滤波器雨声、音量控制、后台自动暂停
   ============================================================ */
(function (root) {
  "use strict";

  var ctx = null;
  var noiseBuf = null;
  var rainGain = null;
  var rainBuilt = false;
  var rainFadeTimer = null;
  var enabledSfx = false;
  var enabledRain = false;
  var masterVolume = 0.8; // 0.0 ~ 1.0

  function getCtx() {
    if (!ctx) {
      var Ctor = window.AudioContext || window.webkitAudioContext;
      if (Ctor) ctx = new Ctor();
    }
    if (ctx && ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function getNoiseBuffer(ac) {
    if (noiseBuf) return noiseBuf;
    var len = ac.sampleRate * 2;
    noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
    var data = noiseBuf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    return noiseBuf;
  }

  function setConfig(opts) {
    if (typeof opts.sfx === "boolean") enabledSfx = opts.sfx;
    if (typeof opts.volume === "number") {
      masterVolume = Math.max(0, Math.min(1, opts.volume));
      if (ctx && rainGain && enabledRain) {
        var t = ctx.currentTime;
        rainGain.gain.cancelScheduledValues(t);
        rainGain.gain.setTargetAtTime(0.055 * masterVolume, t, 0.2);
      }
    }
    if (typeof opts.rain === "boolean") {
      enabledRain = opts.rain;
      setRain(enabledRain);
    }
  }

  function playTone(ac, freq, type, startTime, dur, peakVol, freqEnd) {
    var osc = ac.createOscillator();
    var g = ac.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, startTime);
    if (freqEnd) {
      osc.frequency.exponentialRampToValueAtTime(freqEnd, startTime + dur);
    }
    var v = Math.max(0.0002, peakVol * masterVolume);
    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(v, startTime + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime + dur);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start(startTime);
    osc.stop(startTime + dur + 0.03);
  }

  function playSfx(kind) {
    if (!enabledSfx || masterVolume <= 0) return;
    try {
      var ac = getCtx();
      if (!ac) return;
      var t = ac.currentTime;

      if (kind === "click") {
        // 温润木质/书页轻叩：基频微降 + 轻泛音
        playTone(ac, 540, "sine", t, 0.045, 0.038, 290);
        playTone(ac, 1080, "triangle", t, 0.022, 0.012, 620);
        return;
      }

      if (kind === "gate") {
        // 推开庄园大门：低沉铁枢摩擦声 + 门厅远处低音迎客钟共鸣
        playTone(ac, 110, "triangle", t, 0.55, 0.048, 68);
        playTone(ac, 220, "sine", t + 0.05, 0.75, 0.032, 218);
        playTone(ac, 329.63, "sine", t + 0.12, 0.85, 0.024);
        var gSrc = ac.createBufferSource();
        gSrc.buffer = getNoiseBuffer(ac);
        var gLp = ac.createBiquadFilter();
        gLp.type = "bandpass";
        gLp.frequency.setValueAtTime(320, t);
        gLp.frequency.exponentialRampToValueAtTime(160, t + 0.48);
        gLp.Q.value = 2.2;
        var gGain = ac.createGain();
        var gVol = Math.max(0.0002, 0.036 * masterVolume);
        gGain.gain.setValueAtTime(0.0001, t);
        gGain.gain.linearRampToValueAtTime(gVol, t + 0.09);
        gGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        gSrc.connect(gLp);
        gLp.connect(gGain);
        gGain.connect(ac.destination);
        gSrc.start(t, 0.4, 0.52);
        return;
      }

      if (kind === "chime") {
        // 拜访名片浮现：纯五度双音钟鸣 (E5 + B5)
        playTone(ac, 659.25, "sine", t, 0.42, 0.042);
        playTone(ac, 987.77, "sine", t + 0.045, 0.48, 0.03);
        return;
      }

      if (kind === "seal") {
        // 火漆启封：清脆蜡封崩裂声 + 信纸展开摩挲声
        playTone(ac, 420, "triangle", t, 0.055, 0.045, 180);
        playTone(ac, 1480, "sine", t + 0.015, 0.07, 0.025, 920);
        var sSrc = ac.createBufferSource();
        sSrc.buffer = getNoiseBuffer(ac);
        var sBp = ac.createBiquadFilter();
        sBp.type = "bandpass";
        sBp.frequency.setValueAtTime(1400, t + 0.03);
        sBp.Q.value = 1.2;
        var sGain = ac.createGain();
        var sVol = Math.max(0.0002, 0.04 * masterVolume);
        sGain.gain.setValueAtTime(0.0001, t + 0.03);
        sGain.gain.linearRampToValueAtTime(sVol, t + 0.08);
        sGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        sSrc.connect(sBp);
        sBp.connect(sGain);
        sGain.connect(ac.destination);
        sSrc.start(t + 0.03, 0.2, 0.26);
        return;
      }

      if (kind === "flip") {
        // 名片翻转：轻盈纸卡翻转风声 + 柔和双音回响
        playTone(ac, 360, "sine", t, 0.08, 0.028, 680);
        playTone(ac, 659.25, "sine", t + 0.06, 0.38, 0.036);
        playTone(ac, 880, "sine", t + 0.11, 0.45, 0.028);
        return;
      }

      if (kind === "reveal") {
        // 结局揭晓：维多利亚庄园风琶音和弦 (A4 - C#5 - E5 - A5)
        var notes = [440, 554.37, 659.25, 880];
        notes.forEach(function (f, idx) {
          playTone(ac, f, "sine", t + idx * 0.065, 0.72, 0.036 - idx * 0.005);
        });
        return;
      }

      if (kind === "sizzle") {
        // 烛火炙烤羊皮纸显影：温热火苗轻炙声 + 柠檬汁焦褐微响
        var szSrc = ac.createBufferSource();
        szSrc.buffer = getNoiseBuffer(ac);
        var szBp = ac.createBiquadFilter();
        szBp.type = "bandpass";
        szBp.frequency.setValueAtTime(1950, t);
        szBp.frequency.exponentialRampToValueAtTime(920, t + 0.24);
        szBp.Q.value = 1.6;
        var szGain = ac.createGain();
        var szVol = Math.max(0.0002, 0.032 * masterVolume);
        szGain.gain.setValueAtTime(0.0001, t);
        szGain.gain.linearRampToValueAtTime(szVol, t + 0.04);
        szGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
        szSrc.connect(szBp);
        szBp.connect(szGain);
        szGain.connect(ac.destination);
        szSrc.start(t, Math.random() * 0.8, 0.28);
        playTone(ac, 523.25, "sine", t + 0.03, 0.28, 0.024, 659.25);
        return;
      }

      if (kind === "blow") {
        // 吹熄蜡烛：柔和呼气风声 + 烛芯熄灭轻响 + 1.4s 后幽蓝镜渊空灵泛音
        var blSrc = ac.createBufferSource();
        blSrc.buffer = getNoiseBuffer(ac);
        var blLp = ac.createBiquadFilter();
        blLp.type = "bandpass";
        blLp.frequency.setValueAtTime(480, t);
        blLp.frequency.exponentialRampToValueAtTime(170, t + 0.55);
        blLp.Q.value = 1.1;
        var blGain = ac.createGain();
        var blVol = Math.max(0.0002, 0.055 * masterVolume);
        blGain.gain.setValueAtTime(0.0001, t);
        blGain.gain.linearRampToValueAtTime(blVol, t + 0.08);
        blGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.58);
        blSrc.connect(blLp);
        blLp.connect(blGain);
        blGain.connect(ac.destination);
        blSrc.start(t, 0.15, 0.6);
        // 镜渊浮现时的幽蓝泛音和弦
        playTone(ac, 587.33, "sine", t + 1.35, 0.9, 0.028);
        playTone(ac, 880, "sine", t + 1.48, 1.05, 0.022);
        return;
      }

      if (kind === "musicbox") {
        // 1887 八音盒旋律：清亮高音正弦 + 泛音梳齿拔奏（A 小调维多利亚圆舞曲动机）
        var melody = [
          { f: 880.00, d: 0.00, dur: 0.65 }, // A5
          { f: 1046.50, d: 0.34, dur: 0.60 }, // C6
          { f: 1318.51, d: 0.68, dur: 0.72 }, // E6
          { f: 1174.66, d: 1.06, dur: 0.65 }, // D6
          { f: 1046.50, d: 1.42, dur: 0.65 }, // C6
          { f: 987.77,  d: 1.78, dur: 0.75 }, // B5
          { f: 880.00,  d: 2.18, dur: 1.15 }  // A5
        ];
        melody.forEach(function (n) {
          playTone(ac, n.f, "sine", t + n.d, n.dur, 0.036);
          playTone(ac, n.f * 2, "triangle", t + n.d, n.dur * 0.45, 0.012);
        });
        return;
      }

      if (kind === "shatter") {
        // 碎瓷：高通白噪声瞬态崩裂 + 多枚非谐波清脆碎片散落泛音
        var src = ac.createBufferSource();
        src.buffer = getNoiseBuffer(ac);
        var hp = ac.createBiquadFilter();
        hp.type = "highpass";
        hp.frequency.setValueAtTime(1850, t);
        var ng = ac.createGain();
        var nVol = Math.max(0.0002, 0.075 * masterVolume);
        ng.gain.setValueAtTime(nVol, t);
        ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        src.connect(hp);
        hp.connect(ng);
        ng.connect(ac.destination);
        src.start(t, Math.random() * 1.2, 0.18);

        // 低频坠地闷响
        playTone(ac, 165, "triangle", t, 0.14, 0.055, 72);
        // 清脆瓷片跳动泛音簇
        var shards = [
          { f: 2180, d: 0.005, dur: 0.16, v: 0.032 },
          { f: 3490, d: 0.022, dur: 0.21, v: 0.028 },
          { f: 4870, d: 0.048, dur: 0.18, v: 0.022 },
          { f: 6240, d: 0.082, dur: 0.24, v: 0.018 },
          { f: 2860, d: 0.115, dur: 0.19, v: 0.016 }
        ];
        shards.forEach(function (s) {
          playTone(ac, s.f, "sine", t + s.d, s.dur, s.v, s.f * 0.92);
        });
      }
    } catch (e) {}
  }

  function buildRain(ac) {
    var src = ac.createBufferSource();
    src.buffer = getNoiseBuffer(ac);
    src.loop = true;
    var lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 650;
    lp.Q.value = 0.4;
    var bp = ac.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 2400;
    bp.Q.value = 0.3;
    var bpGain = ac.createGain();
    bpGain.gain.value = 0.25;
    rainGain = ac.createGain();
    rainGain.gain.value = 0;
    src.connect(lp);
    src.connect(bp);
    bp.connect(bpGain);
    bpGain.connect(rainGain);
    lp.connect(rainGain);
    rainGain.connect(ac.destination);
    src.start();
    rainBuilt = true;
  }

  function setRain(on) {
    try {
      if (on && masterVolume > 0) {
        var ac = getCtx();
        if (!ac) return;
        if (!rainBuilt) buildRain(ac);
        if (rainFadeTimer) { clearTimeout(rainFadeTimer); rainFadeTimer = null; }
        var t = ac.currentTime;
        rainGain.gain.cancelScheduledValues(t);
        rainGain.gain.setValueAtTime(rainGain.gain.value, t);
        rainGain.gain.linearRampToValueAtTime(0.055 * masterVolume, t + 1.6);
      } else if (ctx && rainGain) {
        var t2 = ctx.currentTime;
        rainGain.gain.cancelScheduledValues(t2);
        rainGain.gain.setValueAtTime(rainGain.gain.value, t2);
        rainGain.gain.linearRampToValueAtTime(0.0001, t2 + 1.2);
        rainFadeTimer = setTimeout(function () {
          rainFadeTimer = null;
          if (rainGain && !enabledRain) rainGain.gain.value = 0;
        }, 1250);
      }
    } catch (e) {}
  }

  function unlock() {
    try {
      if ((enabledSfx || enabledRain) && ctx && ctx.state === "suspended") {
        ctx.resume();
      }
      if (enabledRain) setRain(true);
    } catch (e) {}
  }

  // 页面切到后台时自动挂起音频上下文，回到前台时按需恢复
  function onVisibilityChange(hidden) {
    try {
      if (!ctx) return;
      if (hidden) {
        if (ctx.state === "running") ctx.suspend();
      } else if ((enabledRain || enabledSfx) && ctx.state === "suspended") {
        ctx.resume();
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
