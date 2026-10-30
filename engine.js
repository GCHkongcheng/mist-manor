/* ============================================================
   迷雾庄园 · 纯逻辑引擎（浏览器与 Node 共用，无 DOM 依赖）
   game.js 与 test.js 同时使用这里的函数，避免测试复刻逻辑而与真实代码漂移。
   ============================================================ */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Engine = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var VALID_MBTI = {
    INTJ: "建筑师", INTP: "逻辑学家", ENTJ: "指挥官", ENTP: "辩论家",
    INFJ: "提倡者", INFP: "调停者", ENFJ: "主人公", ENFP: "竞选者",
    ISTJ: "物流师", ISFJ: "守卫者", ESTJ: "总经理", ESFJ: "执政官",
    ISTP: "鉴赏家", ISFP: "探险家", ESTP: "企业家", ESFP: "表演者"
  };

  var ENDING_META = {
    A: { key: "A", id: "endingA", shortTitle: "真相之夜", fullTitle: "结局一 · 真相之夜", routeText: "随主人步入了书房" },
    B: { key: "B", id: "endingB", shortTitle: "门后",     fullTitle: "结局二 · 门后",     routeText: "独自推开了长廊尽头的蓝光之门" },
    C: { key: "C", id: "endingC", shortTitle: "过客",     fullTitle: "结局三 · 过客",     routeText: "道过晚安回二楼客房歇息" },
    D: { key: "D", id: "endingD", shortTitle: "归还",     fullTitle: "结局四 · 归还",     routeText: "同主人与沈先生一道走向了后园井台" }
  };

  // 本局专属晚宴轨迹印记表（下标 0~18 对应 36 进制字符 0~i）
  var FOOTPRINT_LABELS = [
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
    { flag: "flag_stone",     label: "井畔立碑为记" },
    { flag: "flag_secret_canvas", label: "炙烤画布显影当票" },
    { flag: "flag_secret_map",    label: "烛照地图透视墨痕" },
    { flag: "flag_secret_diary",  label: "烘出日志百年绝笔" },
    { flag: "flag_candle_blown",  label: "吹熄烛火窥见镜渊" }
  ];

  // 烛光显影术配置：ch2/ch4/A0 为「烛火炙烤柠檬汁密信」，B1 为「吹熄蜡烛·镜渊显影」
  var CANDLE_SECRETS = {
    ch2: {
      mode: "roast",
      flag: "flag_secret_canvas",
      hint: "画布右下角衬布似有柠檬汁写就的隐形字迹 · 将烛光移至此处停留（或长按）炙烤显影",
      title: "烛火显影 · 画布暗层",
      cipher: "PAWN TICKET · No. 1887-XI-03 · REDEEMED BY: SHEN",
      revealText: "烛火的热度将画布背面的柠檬汁密迹烘成焦褐色——那是一行百年前的当票编号：「1887-11-03 · 赎当人：沈」。原来那枚银匙在落水当晚便被赎回，整整保存了一百年。",
      endingEcho: "你更忘不了门厅画布背面被烛火烘出的那行当票编号——原来百年前那个冬夜，少年离开前做的最后一件事，是倾尽所有赎回了那枚银匙。"
    },
    ch4: {
      mode: "roast",
      flag: "flag_secret_map",
      hint: "地图西翼涂黑处背面有浅浅凹痕 · 将烛光移至此处停留（或长按）烘烤透视",
      title: "烛火显影 · 墨迹之下",
      cipher: "WEST WING · ADELINE'S STAR ROOM · DO NOT LOCK",
      revealText: "暖金烛焰从背面照透泛黄羊皮纸，浓黑的墨团底下浮出一行娟秀的旧体小字：「Adeline's Star Room · 勿锁」。被涂黑的从来不是禁地，是一位父亲不忍落锁的女儿旧卧室。",
      endingEcho: "你也终于读懂了地图涂黑处背面被烛火照透的那行「勿锁」——那扇门从来不是为了关住什么，而是怕她回家时推不开门。"
    },
    A0: {
      mode: "roast",
      flag: "flag_secret_diary",
      hint: "1887 皮面日志扉页夹层似有密写药水 · 将烛光移至此处停留（或长按）炙烤显影",
      title: "烛火显影 · 扉页绝笔",
      cipher: "IF THE BOY NAMED SHEN RETURNS — FORGIVE HIM. ADELINE HELD HIS SLEEVE.",
      revealText: "扉页夹层受热显出老庄园主百年前用密写药水留下的绝笔：「若那姓沈的少年或他的后人归来，勿追责。艾德琳最后握着的是他的衣角，她不怪他。」",
      endingEcho: "而书房日志扉页被你用烛火烘出的那行百年前的宽恕绝笔，让这一夜所有的沉重都化作了温柔的落地。"
    },
    B1: {
      mode: "blow",
      flag: "flag_candle_blown",
      hint: "所有的镜子里都没有烛台本身——因为人间的烛火反而遮住了镜中的光。",
      btnLabel: "吹熄手中烛火 · 屏息凝望镜渊",
      micLabel: "或轻吹麦克风熄烛",
      title: "烛灭之后 · 镜渊回响",
      cipher: "ONLY WHEN THE CANDLE DIES DOES THE MIRROR REMEMBER.",
      revealText: "当最后一缕烛火被你吹熄，黑暗吞没回廊。两秒后，幽蓝的磷光在镜渊深处苏醒——无数面镜子里的艾德琳同时抬起手，镜面结霜成字：「烛火只照见活人的路；唯有替我吹熄烛火的人，看得见我等了一百年的晨光。」",
      endingEcho: "而在镜厅吹熄烛火的那两秒极暗里，你见到了所有执烛者都未曾见过的景象——无数面镜子里的她同时向你颔首道谢。"
    }
  };

  function newScores() { return { E:0, I:0, S:0, N:0, T:0, F:0, J:0, P:0 }; }
  function newAffinity() { return { master: 0, shen: 0 }; }

  // 隐藏选项可见性：好感度需达到 requires 要求
  function optionVisible(opt, affinity) {
    if (!opt.requires) return true;
    if (opt.requires.master && affinity.master < opt.requires.master) return false;
    if (opt.requires.shen && affinity.shen < opt.requires.shen) return false;
    return true;
  }

  // 根据同席邀请人数据，为特定公共节点生成「前客余温」叙事回响
  function buildInviterEcho(nodeId, inviter) {
    if (!inviter || !inviter.code || !VALID_MBTI[inviter.code]) return "";
    var roleTag = inviter.code + " · " + VALID_MBTI[inviter.code];
    var fl = inviter.flags || {};
    if (nodeId === "ch2") {
      if (fl.flag_detail || (!fl.flag_sigh && inviter.code.charAt(1) === "S")) {
        return "〔前客余温〕你走近画框时，留意到右下角的浮尘曾被人用指尖轻轻揩去——那是为你留座的友人 **" + roleTag + "** 早一步驻足留下的痕迹。";
      }
      return "〔前客余温〕侍者引你经过画前时低声道：「早些时候，引荐你入席的那位 **" + roleTag + "** 也在此凝望良久，说听见了画布后的风声。」";
    }
    if (nodeId === "ch5") {
      if (fl.flag_mercy || (!fl.flag_logic && inviter.code.charAt(2) === "F")) {
        return "〔前客余温〕满座寂静中，你想起友人 **" + roleTag + "** 在请柬背面留下的叮嘱：若席间有人失手，请替他多留一分体面。";
      }
      return "〔前客余温〕满座寂静中，你想起友人 **" + roleTag + "** 在请柬背面留下的提点：庄园器物皆有定数，遇事不妨先替主人看清分寸。";
    }
    if (nodeId === "ch6") {
      var em = ENDING_META[inviter.endingKey] || ENDING_META.A;
      return "〔前客余温〕维恩先生目光落在你身上时，唇角微扬：「顺带一提，为你留座的那位 **" + roleTag + "**，昨夜在这道分岔口" + em.routeText + "。至于今夜——路在你自己脚下。」";
    }
    return "";
  }

  // 解析节点当前生效的题干与选项（支持重玩平行题库 altText / altOptions，且拼入 preVariants 即时回响与可选的 inviter 前客余温）
  function resolveNode(node, flags, variantMap, inviter) {
    var useAlt = !!(variantMap && variantMap[node.id] && node.altText && node.altOptions);
    var baseText = useAlt ? node.altText : (node.text || "");
    var prefix = [];
    if (Array.isArray(node.preVariants) && flags) {
      node.preVariants.forEach(function (pv) {
        if (flags[pv.flag] && pv.text) prefix.push(pv.text);
      });
    }
    var fullText = prefix.length ? (prefix.join("\n") + "\n\n" + baseText) : baseText;
    if (inviter) {
      var echo = buildInviterEcho(node.id, inviter);
      if (echo) fullText = fullText + "\n\n" + echo;
    }
    var options = useAlt ? node.altOptions : (node.options || []);
    return { text: fullText, options: options, isAlt: useAlt };
  }

  // 应用一个选项的全部效果（原地修改 scores / flags / affinity）。
  // 返回该选项是否为计分选择（用于推进进度）。
  function applyOption(scores, flags, affinity, opt) {
    if (opt.scores) Object.keys(opt.scores).forEach(function (k) { scores[k] += opt.scores[k]; });
    // 平局裁判：小支点 0.5 分倾向加权（不计分、不进进度条）
    if (opt.nudge) Object.keys(opt.nudge).forEach(function (k) { scores[k] += opt.nudge[k]; });
    if (opt.flags) opt.flags.forEach(function (f) { flags[f] = true; });
    if (opt.affinity) Object.keys(opt.affinity).forEach(function (k) { affinity[k] += opt.affinity[k]; });
    return !!opt.scores;
  }

  // 四维度多数表决得到 MBTI 代号
  function computeCode(s) {
    return (s.E > s.I ? "E" : "I") + (s.S > s.N ? "S" : "N") +
           (s.T > s.F ? "T" : "F") + (s.J > s.P ? "J" : "P");
  }

  // 结局正文拼装：主体 + 命中旗标的变体 + 烛光显影专属回收段 + 收束段
  function buildEndingText(node, flags) {
    var parts = [node.body];
    var f = flags || {};
    node.variants.forEach(function (v) {
      if (f[v.flag] && v.text) parts.push(v.text);
    });
    if (f.flag_secret_canvas && CANDLE_SECRETS.ch2.endingEcho) {
      parts.push(CANDLE_SECRETS.ch2.endingEcho);
    }
    if (f.flag_secret_map && CANDLE_SECRETS.ch4.endingEcho) {
      parts.push(CANDLE_SECRETS.ch4.endingEcho);
    }
    if (node.id === "endingA" && f.flag_secret_diary && CANDLE_SECRETS.A0.endingEcho) {
      parts.push(CANDLE_SECRETS.A0.endingEcho);
    }
    if (node.id === "endingB" && f.flag_candle_blown && CANDLE_SECRETS.B1.endingEcho) {
      parts.push(CANDLE_SECRETS.B1.endingEcho);
    }
    parts.push(node.baseText);
    return parts.join("\n");
  }

  // 提炼本局专属晚宴轨迹印记（优先取线内特征旗标 + 公共线代表旗标，最多 3 枚）
  function buildFootprints(flags) {
    var picked = [];
    var f = flags || {};
    for (var i = FOOTPRINT_LABELS.length - 1; i >= 0; i--) {
      if (f[FOOTPRINT_LABELS[i].flag]) {
        picked.unshift(FOOTPRINT_LABELS[i].label);
        if (picked.length >= 3) break;
      }
    }
    return picked;
  }

  function normalizeEndingKey(endingIdOrKey) {
    var raw = String(endingIdOrKey || "A").trim().toUpperCase();
    if (raw.indexOf("ENDING") === 0) raw = raw.slice(6);
    return ENDING_META[raw] ? raw : "A";
  }

  // 编码邀请种子：格式如 "INTJ-A-13a" 或 "INTJ-A"
  function encodeInviteSeed(mbtiCode, endingIdOrKey, flags) {
    var code = String(mbtiCode || "").trim().toUpperCase();
    if (!VALID_MBTI[code]) return "";
    var eKey = normalizeEndingKey(endingIdOrKey);
    var f = flags || {};
    var idxChars = [];
    for (var i = FOOTPRINT_LABELS.length - 1; i >= 0; i--) {
      if (f[FOOTPRINT_LABELS[i].flag]) {
        idxChars.unshift(i.toString(36));
        if (idxChars.length >= 3) break;
      }
    }
    return idxChars.length ? (code + "-" + eKey + "-" + idxChars.join("")) : (code + "-" + eKey);
  }

  // 解析邀请种子：支持完整 URL、#invite=...、?invite=... 或裸种子 "INTJ-A-13a" / "INTJ-A" / "INTJ"
  function parseInviteSeed(input) {
    if (!input || typeof input !== "string") return null;
    var s = input.trim();
    if (!s) return null;
    try { s = decodeURIComponent(s); } catch (e) {}
    var mParam = s.match(/(?:[#?&]invite=|^invite=)([A-Za-z0-9_-]+)/i);
    var token = mParam ? mParam[1] : s.replace(/^[#?]+/, "");
    token = token.trim();
    var m = token.match(/^([A-Za-z]{4})(?:[-_.]([A-Da-d])(?:[-_.]([0-9A-Za-z]{1,6}))?)?$/);
    if (!m) return null;
    var code = m[1].toUpperCase();
    if (!VALID_MBTI[code]) return null;
    var eKey = m[2] ? m[2].toUpperCase() : "A";
    if (!ENDING_META[eKey]) eKey = "A";
    var fpStr = m[3] ? m[3].toLowerCase() : "";
    var flags = {};
    var footprints = [];
    for (var i = 0; i < fpStr.length && footprints.length < 3; i++) {
      var idx = parseInt(fpStr.charAt(i), 36);
      if (!isNaN(idx) && idx >= 0 && idx < FOOTPRINT_LABELS.length) {
        var item = FOOTPRINT_LABELS[idx];
        if (!flags[item.flag]) {
          flags[item.flag] = true;
          footprints.push(item.label);
        }
      }
    }
    var meta = ENDING_META[eKey];
    var canonicalSeed = footprints.length ? encodeInviteSeed(code, eKey, flags) : (code + "-" + eKey);
    return {
      code: code,
      name: VALID_MBTI[code],
      endingKey: eKey,
      endingId: meta.id,
      endingShortTitle: meta.shortTitle,
      endingTitle: meta.fullTitle,
      routeText: meta.routeText,
      flags: flags,
      footprints: footprints,
      seed: canonicalSeed
    };
  }

  // 计算双人同席羁绊合盘（16×16 人格关系原型 × 4×4 结局交汇跋文）
  function computeBond(inviter, player) {
    var inv = (inviter && inviter.code && VALID_MBTI[inviter.code]) ? inviter : parseInviteSeed(String(inviter || ""));
    var plr = (player && player.code && VALID_MBTI[player.code]) ? player : parseInviteSeed(String(player || ""));
    if (!inv || !plr) return null;

    var c1 = inv.code, c2 = plr.code;
    var e1 = normalizeEndingKey(inv.endingKey || inv.endingId);
    var e2 = normalizeEndingKey(plr.endingKey || plr.endingId);
    var m1 = ENDING_META[e1], m2 = ENDING_META[e2];

    var sameE = c1.charAt(0) === c2.charAt(0);
    var sameS = c1.charAt(1) === c2.charAt(1);
    var sameT = c1.charAt(2) === c2.charAt(2);
    var sameJ = c1.charAt(3) === c2.charAt(3);
    var sameCount = (sameE ? 1 : 0) + (sameS ? 1 : 0) + (sameT ? 1 : 0) + (sameJ ? 1 : 0);

    var title = "";
    var resonance = "";
    var desc = "";

    if (sameCount === 4) {
      title = "镜中双影";
      resonance = "灵魂同频 · 99%";
      desc = "你们不必开口便知对方下一步落子何处。长廊尽头的镜厅里，你们是彼此唯一不失真的倒影。";
    } else if (sameCount === 0) {
      title = "烛火与夜风";
      resonance = "极性互补 · 96%";
      desc = "一个在暗处丈量百年的秩序，一个在席间点燃当下的微光。你们截然相反，却恰好照亮了彼此看不见的半座庄园。";
    } else if (sameS && !sameT) {
      title = "执烛与读碑";
      resonance = "理感相济 · 94%";
      desc = "你们望向同一片迷雾深处：一人执烛辨认冰冷的碑文，一人伸手接住旧日的叹息。真相与慈悲在你们之间得以两全。";
    } else if (!sameE && sameS && sameT && sameJ) {
      title = "表里守夜人";
      resonance = "内外呼应 · 95%";
      desc = "你们拥有完全一致的判断准星，只是一个在烛火明处周旋应答，一个在廊柱暗处静观全局，是最默契的同席搭档。";
    } else if (sameS && sameT && !sameJ) {
      title = "经纬同盟";
      resonance = "视野共鸣 · 92%";
      desc = "你们以同一种语言拆解这座老宅的谜题：一人负责收束线索定下章法，一人负责推开那些计划之外虚掩的门。";
    } else if (!sameS && sameT) {
      title = "怀表与星图";
      resonance = "远近互证 · 90%";
      desc = "一人低头摩挲1887年的裂纹与物证，一人抬头凝望画布背后的百年隐喻。有形之物与无形之思，在你们席间拼合完整。";
    } else if (!sameE && sameJ) {
      title = "推门与守望";
      resonance = "动静相宜 · 91%";
      desc = "一人敢于率先叩响沉重的铜环，一人懂得在退后半步处留一盏回程的灯。你们一个向外破局，一个向内扎根。";
    } else {
      title = "十字廊桥的偶遇";
      resonance = "错位共鸣 · 88%";
      desc = "你们带着截然不同的怀表与步频走进同一场雨夜，却在宴散时分，替对方补上了今晚缺失的那一页故事。";
    }

    var routeTitle = "";
    var routeDesc = "";
    if (e1 === e2) {
      if (e1 === "D") {
        routeTitle = "双生归还";
        routeDesc = "百年的井台很少等到知情者，而你们两人都走到了这里。野蔷薇开时，门廊下并排立着你们的影子。";
      } else if (e1 === "A") {
        routeTitle = "同卷编年";
        routeDesc = "你们一前一后走进同一间书房，在同一册 1887 年的日志扉页上，留下了两行并排的批注。";
      } else if (e1 === "B") {
        routeTitle = "镜廊重逢";
        routeDesc = "那扇只为夜行者虚掩的蓝光之门，先后映出过你们两人的面容。你们都曾听见她转过身时的雪落声。";
      } else {
        routeTitle = "同枕听雨";
        routeDesc = "你们都选择把秘密留给老宅，只带走一夜好眠。守夜人替你们掖好被角时，在门外轻轻道了两声晚安。";
      }
    } else {
      var pair = [e1, e2].sort().join("");
      if (pair === "AB") {
        routeTitle = "史官与造梦者";
        routeDesc = "一个在书房读懂了她落水的始末，一个在镜厅见到了她百年后的回声——当你们离席对坐，艾德琳的故事才真正完整。";
      } else if (pair === "AD") {
        routeTitle = "孤本与终章";
        routeDesc = "一个在书房替旧日校对真相，一个在后园替故人挂回银匙。你们一个记下了历史，一个走完了历史。";
      } else if (pair === "BD") {
        routeTitle = "镜影与井台";
        routeDesc = "一个在蓝光深处握住她冰凉的指尖，一个在后园井畔送她乘雾远行。你们在门里门外，完成了一场接力式的告别。";
      } else if (pair === "CD") {
        routeTitle = "安眠与守岁";
        routeDesc = "一个在二楼客房安睡听雨，一个在后园井台彻夜送别——有人替你负重守夜，才有人能做一场毫无阴翳的好梦。";
      } else {
        routeTitle = "探秘者与过客";
        routeDesc = "一个替两个人在暗夜里走完了最深的回廊，一个替两个人在晨光里接住了门廊热茶的温度。";
      }
    }

    return {
      inviter: {
        code: c1,
        name: VALID_MBTI[c1],
        endingKey: e1,
        endingShortTitle: m1.shortTitle
      },
      player: {
        code: c2,
        name: VALID_MBTI[c2],
        endingKey: e2,
        endingShortTitle: m2.shortTitle
      },
      sameCount: sameCount,
      title: title,
      resonance: resonance,
      desc: desc,
      routeTitle: routeTitle,
      routeDesc: routeDesc
    };
  }

  function getCandleSecret(nodeId) {
    return (nodeId && CANDLE_SECRETS[nodeId]) ? CANDLE_SECRETS[nodeId] : null;
  }

  // 命运证物陈列匣：8 件可收集古董器物（由晚宴旗标与烛光显影旗标解锁）
  var RELIC_CABINET = [
    {
      id: "relic_photo",
      name: "泛黄旧合影",
      shortName: "旧合影",
      flags: ["flag_photo", "flag_tour", "flag_ade_name"],
      origin: "走廊 · 1887 泛黄旧照",
      desc: "相纸背面用铅笔写着「Adeline & S., 1887」。少女袖口别着银匙，青年的目光望向画框之外。"
    },
    {
      id: "relic_frame",
      name: "1887 覆面银框",
      shortName: "覆面银框",
      flags: ["flag_frame", "flag_detail", "flag_secret_canvas"],
      origin: "门厅 · 1887 画款与银相框",
      desc: "纯银相框边缘刻着维恩家族的蔷薇纹，画布右下角留着 1887 年冬夜的落款与赎当暗记。"
    },
    {
      id: "relic_guest",
      name: "画家后人席卡",
      shortName: "后人席卡",
      flags: ["flag_guest", "flag_chat", "flag_tale"],
      origin: "长桌 · 与画家后人沈先生交谈",
      desc: "沈先生祖父留下的旧席位卡，边角已被摩挲得起毛。百年前那位年轻画师离席时，带走了半生愧疚。"
    },
    {
      id: "relic_map",
      name: "折角西翼平面图",
      shortName: "折角地图",
      flags: ["flag_map", "flag_black", "flag_plan", "flag_secret_map"],
      origin: "走廊 · 被涂黑的庄园平面图",
      desc: "维多利亚时期的羊皮纸蓝图，西翼尽头的房间被浓墨覆去，唯有迎着烛火才能看见底下的「勿锁」。"
    },
    {
      id: "relic_shatter",
      name: "金缮白瓷残片",
      shortName: "金缮碎瓷",
      flags: ["flag_mercy", "flag_logic"],
      origin: "晚宴 · 碎瓷之夜的回响",
      desc: "绘有蓝边鸢尾花的骨瓷碎片，断面已被金漆细细锔合。它记得席间那场骤然降临的寂静，也记得你的分寸。"
    },
    {
      id: "relic_chronicle",
      name: "1887 皮面编年稿",
      shortName: "手写编年稿",
      flags: ["flag_chronicle", "flag_ledger", "flag_secret_diary"],
      origin: "书房 · 停笔于冬夜的日志",
      desc: "深棕山羊皮封面的庄园编年史，1887 年 11 月 3 日那一页夹着干枯的水草与老庄园主的宽恕绝笔。"
    },
    {
      id: "relic_mirror",
      name: "结霜蓝玻璃镜片",
      shortName: "蓝玻镜片",
      flags: ["flag_room", "flag_dream", "flag_candle_blown"],
      origin: "镜厅 · 映出纸星的古镜残片",
      desc: "背面镀着古老水银的六角镜片，只有在吹熄烛火的极暗里，镜面上才会浮现出纸折星星的倒影。"
    },
    {
      id: "relic_spoon",
      name: "井台百年银匙",
      shortName: "1887 银匙",
      flags: ["flag_return", "flag_keep", "flag_find", "flag_hook", "flag_rose"],
      origin: "终章 · 刻有家徽的纯银茶匙",
      desc: "柄端镌着字母 A 的百年银匙。它在井底、荒草与口袋间辗转了一个世纪，终于等到了今夜的归还。"
    }
  ];

  // 古董三件套共鸣：集齐「泛黄旧合影」+「1887 覆面银框」+「画家后人席卡」解锁八音盒旋律与艾德琳未寄出的短笺
  var RELIC_RESONANCE = {
    id: "adeline_letter",
    requiredRelics: ["relic_photo", "relic_frame", "relic_guest"],
    title: "古董共鸣 · 八音盒与艾德琳未寄出的短笺",
    subtitle: "当「泛黄旧合影」「1887 覆面银框」与「画家后人席卡」在陈列匣中拼合，银框底座的暗簧轻响，老式八音盒的旋律伴随一卷百年前的信笺缓缓展开——",
    letterTitle: "《致母亲 · 1887 年 11 月 3 日夜（未寄出）》",
    letterBody:
      "母亲大人膝下：\n\n" +
      "今夜门厅的肖像画终于落笔了。那位姓沈的年轻画师把我的黑裙画得很端庄，可他以为我没看见——他在画布右下角偷偷多添了一缕月光。\n\n" +
      "父亲总怕我着凉，把西翼的星图房烘得太暖；可我只想去后园井台看一眼今年的第一场初雪。那枚刻着家徽的银匙，我借给沈先生调色用了。倘若明日风雪太大、他不得不乘早班马车远行，请您和哥哥千万别怪罪他——是我央他陪我多看了一会儿雪。\n\n" +
      "不必锁门，我听见八音盒响，便知道回家了。\n\n" +
      "女 艾德琳 谨上"
  };

  function matchRelicsFromFlags(flags) {
    var f = flags || {};
    var unlocked = [];
    RELIC_CABINET.forEach(function (r) {
      for (var i = 0; i < r.flags.length; i++) {
        if (f[r.flags[i]]) {
          unlocked.push(r.id);
          break;
        }
      }
    });
    return unlocked;
  }

  // 潜意识行为侧写（Micro-Telemetry）：根据犹豫时长、光标游移、打字打断、悔棋次数与烛光探索生成「表里双生人格」与维恩暗批
  function computeShadowProfile(mbtiCode, telemetry) {
    var surface = String(mbtiCode || "INTJ").trim().toUpperCase();
    if (!VALID_MBTI[surface]) surface = "INTJ";
    var t = telemetry || {};
    var hoverSwitches = t.hoverSwitches || 0;
    var undoCount = t.undoCount || 0;
    var skipCount = t.skipCount || 0;
    var hesitateCount = t.hesitateCount || 0;
    var quickCount = t.quickCount || 0;
    var totalThinkMs = t.totalThinkMs || 0;
    var candleCount = t.candleCount || 0;

    var c0 = surface.charAt(0);
    var c1 = surface.charAt(1);
    var c2 = surface.charAt(2);
    var c3 = surface.charAt(3);

    var s0 = c0, s1 = c1, s2 = c2, s3 = c3;
    var note = "";

    if (undoCount >= 1 && hoverSwitches >= 3) {
      // 悔棋 + 反复游移：典型外显果决/理性，潜意识柔软谨慎（如表象 ENTJ · 潜影 INFP）
      s0 = "I";
      s1 = "N";
      s2 = "F";
      s3 = "P";
      if (s0 + s1 + s2 + s3 === surface) { s2 = "T"; s3 = "J"; }
      note = "你在席间给出了最果决的判词，但落座前指尖 " + hoverSwitches + " 次游移、" + undoCount + " 次拨回怀表改道——你比自己表现出的更怕辜负他人。";
    } else if (undoCount >= 1) {
      s2 = c2 === "T" ? "F" : "T";
      s3 = c3 === "J" ? "P" : "J";
      note = "你整晚步履从容，却在分岔口悄悄撤回了 " + undoCount + " 次落子——正是那一次回眸，泄露了你理性盔甲下的心软与牵挂。";
    } else if (hoverSwitches >= 5) {
      s0 = c0 === "E" ? "I" : c0;
      s2 = "F";
      s3 = "P";
      if (s0 + s1 + s2 + s3 === surface) s1 = c1 === "S" ? "N" : "S";
      note = "落子前你的目光在选项间来回权衡了 " + hoverSwitches + " 次——你习惯以笃定的姿态示人，心底却替每一条未走的路都留了余地。";
    } else if (candleCount >= 1 && (hesitateCount >= 1 || totalThinkMs >= 18000)) {
      s0 = "I";
      s1 = "N";
      if (s0 + s1 + s2 + s3 === surface) s3 = c3 === "J" ? "P" : "J";
      note = "你不仅在席间字斟句酌，更执烛烘出了老宅藏匿百年的暗层密文——言谈间你克制守礼，灵魂深处却是个不肯放过任何真相的守夜人。";
    } else if (hesitateCount >= 2 || totalThinkMs >= 32000) {
      s0 = "I";
      s2 = c2 === "T" ? "F" : "T";
      if (s0 + s1 + s2 + s3 === surface) s1 = "N";
      note = "每次侍者奉上托盘，你都驻足良久才落子——你在明处温和顺应着晚宴的礼数，暗处却有一座独自推演万千心事的孤岛。";
    } else if (skipCount >= 4 || quickCount >= 7) {
      s0 = "E";
      s2 = "T";
      s3 = "J";
      if (s0 + s1 + s2 + s3 === surface) s0 = c0 === "E" ? "I" : "E";
      note = "你几乎不待侍者把话说完便已挥袖决断——纵使你的判词温存周全，潜意识深处却藏着一把快刀斩乱麻的凌厉锋芒。";
    } else if (candleCount >= 1) {
      s1 = "N";
      s3 = c3 === "J" ? "P" : "J";
      if (s0 + s1 + s2 + s3 === surface) s0 = c0 === "E" ? "I" : "E";
      note = "大多数客人只看得到桌面上的银器，你却偏偏把烛火移向了画布与镜渊的暗处——你平静的表象下，藏着一颗敏锐而叛逆的探秘之心。";
    } else {
      // 步频沉稳、零悔棋、低游移：给出镜像潜影，批注强调表里合一的笃定
      s0 = c0 === "E" ? "I" : "E";
      s3 = c3 === "J" ? "P" : "J";
      note = "从推开铁门到宴散离席，你的指尖未曾悔棋、步频始终如一——哪怕在庄园最幽暗的烛影里，你的潜意识也与正面的自己忠实同频。";
    }

    var shadow = s0 + s1 + s2 + s3;
    if (!VALID_MBTI[shadow]) shadow = "INFP";

    return {
      surfaceCode: surface,
      surfaceName: VALID_MBTI[surface],
      shadowCode: shadow,
      shadowName: VALID_MBTI[shadow],
      tag: "表象 " + surface + " · 潜影 " + shadow,
      note: note
    };
  }

  return {
    VALID_MBTI: VALID_MBTI,
    ENDING_META: ENDING_META,
    FOOTPRINT_LABELS: FOOTPRINT_LABELS,
    CANDLE_SECRETS: CANDLE_SECRETS,
    RELIC_CABINET: RELIC_CABINET,
    RELIC_RESONANCE: RELIC_RESONANCE,
    getCandleSecret: getCandleSecret,
    matchRelicsFromFlags: matchRelicsFromFlags,
    computeShadowProfile: computeShadowProfile,
    newScores: newScores,
    newAffinity: newAffinity,
    optionVisible: optionVisible,
    buildInviterEcho: buildInviterEcho,
    resolveNode: resolveNode,
    applyOption: applyOption,
    computeCode: computeCode,
    buildEndingText: buildEndingText,
    buildFootprints: buildFootprints,
    encodeInviteSeed: encodeInviteSeed,
    parseInviteSeed: parseInviteSeed,
    computeBond: computeBond
  };
});
