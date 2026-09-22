/**
 * copy-dict engine — sample-1man 内の部品辞典から文章候補を組立
 * 実行時は同オリジンの copy-dict/ のみ参照（外倉庫なし）
 */
(function (global) {
  "use strict";

  var BASE = "copy-dict/";
  var cache = {
    meta: null,
    presets: null,
    index: null,
    scenes: {}
  };

  /* 制作フロー内の使用済み部品（ローカルのみ。クラウド同期なし） */
  var sessionUsedPartIds = {};
  var saltTick = 0;

  function resetSessionUsedParts() {
    sessionUsedPartIds = {};
    saltTick = 0;
  }

  function noteUsedPartIds(ids) {
    (ids || []).forEach(function (id) {
      if (id) sessionUsedPartIds[id] = true;
    });
  }

  function freshSalt(extra) {
    saltTick += 1;
    return (
      "s" +
      saltTick +
      "|" +
      Date.now() +
      "|" +
      Math.random().toString(36).slice(2, 10) +
      (extra ? "|" + extra : "")
    );
  }

  function fetchJson(path) {
    return fetch(path, { cache: "no-cache" }).then(function (r) {
      if (!r.ok) throw new Error("copy-dict fetch " + path + " " + r.status);
      return r.json();
    });
  }

  function ensureMeta() {
    if (cache.meta) return Promise.resolve(cache.meta);
    return fetchJson(BASE + "meta.json").then(function (j) {
      cache.meta = j;
      return j;
    });
  }

  function ensurePresets() {
    if (cache.presets) return Promise.resolve(cache.presets);
    return fetchJson(BASE + "presets.json").then(function (j) {
      cache.presets = j;
      return j;
    });
  }

  function ensureIndex() {
    if (cache.index) return Promise.resolve(cache.index);
    return fetchJson(BASE + "scenes/_index.json").then(function (j) {
      cache.index = j;
      return j;
    });
  }

  function sceneFromSampleKey(sampleKey) {
    var key = String(sampleKey || "").trim();
    if (!key) return null;
    var token = key.split("-")[0];
    /* easy-copy-dict SCENE_AFFINITY と揃える別名 */
    if (token === "inn") return "hotel";
    return token || null;
  }

  /**
   * 寄せ先: 人の選択・入力 ＞ 用途 ＞ 見本の初期ヒント
   * shop など用途が scene を持たないときは sampleKey を足場にする
   */
  function resolveScene(opts) {
    opts = opts || {};
    var purpose = opts.sitePurpose || opts.purpose || null;
    var map = (cache.meta && cache.meta.purposeScenes) || {
      personal: "studio",
      company: "cowork",
      shop: null,
      works: "gallery",
      service: "salon"
    };
    if (purpose && Object.prototype.hasOwnProperty.call(map, purpose) && map[purpose]) {
      return map[purpose];
    }
    if (opts.sceneTag) return opts.sceneTag;
    var fromSample = sceneFromSampleKey(opts.sampleKey);
    if (fromSample) return fromSample;
    return (cache.meta && cache.meta.fallbackScene) || "cafe";
  }

  function loadScene(sceneId) {
    var id = sceneId || "cafe";
    if (cache.scenes[id]) return Promise.resolve(cache.scenes[id]);
    return ensureIndex()
      .then(function (idx) {
        var file = (idx.scenes && idx.scenes[id]) || null;
        var fallback = idx.fallback || "cafe";
        if (!file) {
          id = fallback;
          file = idx.scenes && idx.scenes[fallback];
        }
        if (!file) throw new Error("no scene file");
        return fetchJson(BASE + "scenes/" + file).then(function (j) {
          cache.scenes[id] = j;
          return j;
        });
      })
      .catch(function () {
        return { scene: id, parts: [] };
      });
  }

  function keywordToAxisHints(meta, keywordIds) {
    var map = {};
    (meta.keywords || []).forEach(function (k) {
      map[k.id] = k.axisHint;
    });
    var hints = [];
    (keywordIds || []).forEach(function (id) {
      if (map[id]) hints.push(map[id]);
    });
    return hints;
  }

  function allAxisIds(meta) {
    return (meta.axes || []).map(function (a) {
      return a.id;
    });
  }

  function pickDistinctAxes(preferred, pool, count, rng) {
    var out = [];
    var used = {};
    preferred = preferred || [];
    pool = pool || [];
    function add(id) {
      if (!id || used[id]) return;
      used[id] = true;
      out.push(id);
    }
    preferred.forEach(add);
    var rest = pool.filter(function (a) {
      return !used[a];
    });
    shuffleInPlace(rest, rng);
    rest.forEach(function (a) {
      if (out.length >= count) return;
      add(a);
    });
    while (out.length < count && pool.length) {
      add(pool[out.length % pool.length]);
      if (out.length > 20) break;
    }
    return out.slice(0, count);
  }

  function mulberry32(a) {
    return function () {
      var t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hashSeed(str) {
    var h = 2166136261;
    var s = String(str || "");
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function shuffleInPlace(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  function weightedPick(list, rng) {
    if (!list || !list.length) return null;
    var total = 0;
    list.forEach(function (p) {
      total += Number(p.weight) > 0 ? Number(p.weight) : 1;
    });
    var r = rng() * total;
    for (var i = 0; i < list.length; i++) {
      r -= Number(list[i].weight) > 0 ? Number(list[i].weight) : 1;
      if (r <= 0) return list[i];
    }
    return list[list.length - 1];
  }

  function filterParts(parts, opts) {
    var sectionId = opts.sectionId;
    var axisId = opts.axisId;
    var keywordIds = opts.keywordIds || [];
    var slot = opts.slot;
    return (parts || []).filter(function (p) {
      if (slot && p.slot !== slot) return false;
      if (sectionId && (p.sectionIds || []).indexOf(sectionId) < 0) return false;
      if (axisId && (p.axisIds || []).indexOf(axisId) < 0) return false;
      if (keywordIds.length) {
        var hit = (p.keywordIds || []).some(function (k) {
          return keywordIds.indexOf(k) >= 0;
        });
        /* keyword miss is soft: allow if no keywordIds on part */
        if ((p.keywordIds || []).length && !hit) return false;
      }
      var text = String(p.text || "");
      if (!text.trim()) return false;
      if (/おもてなし/.test(text)) return false;
      return true;
    });
  }

  function assembleSentence(parts, sectionId, axisId, keywordIds, rng, usedIds) {
    usedIds = usedIds || {};
    function pickSlot(slot) {
      function poolFor(strictAvoidSession) {
        var base = filterParts(parts, {
          sectionId: sectionId,
          axisId: axisId,
          keywordIds: keywordIds,
          slot: slot
        });
        if (!base.length) {
          base = filterParts(parts, {
            sectionId: sectionId,
            axisId: axisId,
            slot: slot
          });
        }
        if (!base.length) {
          base = filterParts(parts, { sectionId: sectionId, slot: slot });
        }
        if (!base.length) {
          base = filterParts(parts, { slot: slot });
        }
        return base.filter(function (p) {
          if (usedIds[p.id]) return false;
          if (strictAvoidSession && sessionUsedPartIds[p.id]) return false;
          return true;
        });
      }
      /* まず制作中の使用済みを避け、枯れたら緩和 */
      var pool = poolFor(true);
      if (!pool.length) pool = poolFor(false);
      var pick = weightedPick(pool, rng);
      if (pick) {
        usedIds[pick.id] = true;
        sessionUsedPartIds[pick.id] = true;
      }
      return pick;
    }
    var open = pickSlot("open");
    var mid = pickSlot("mid");
    var close = pickSlot("close");
    var bits = [];
    if (open) bits.push(String(open.text).replace(/[。．.]+$/, ""));
    if (mid) bits.push(String(mid.text).replace(/[。．.]+$/, ""));
    if (close) {
      var c = String(close.text);
      bits.push(c);
    }
    var text = bits.join("。");
    if (text && !/[。！？]$/.test(text)) text += "。";
    /* quality: avoid empty / too short */
    if (!text || text.length < 8) {
      text = fallbackLine(sectionId, axisId);
    }
    return {
      text: text,
      axisId: axisId,
      partIds: [open && open.id, mid && mid.id, close && close.id].filter(Boolean)
    };
  }

  function fallbackLine(sectionId, axisId) {
    var bySec = {
      hero: "お店の魅力を、わかりやすくお伝えします。",
      about: "お店のことを、丁寧にご案内します。",
      works: "おすすめを、わかりやすくまとめました。",
      contact: "ご質問は、お気軽にご連絡ください。"
    };
    return bySec[sectionId] || "内容を整えています。";
  }

  function axisLabel(meta, axisId) {
    var a = (meta.axes || []).find(function (x) {
      return x.id === axisId;
    });
    return (a && a.label) || axisId || "候補";
  }

  /**
   * @returns Promise<{ candidates: [{label,text,axisId}], sceneId, axes }>
   */
  function generateThree(opts) {
    opts = opts || {};
    var sampleKey = opts.sampleKey || "";
    var sectionId = opts.sectionId || "hero";
    var keywordIds = Array.isArray(opts.keywordIds) ? opts.keywordIds.slice() : [];
    var presetAxes = opts.presetAxes || null; /* { hero: axisId, ... } for omakase */
    /* 生成のたびに salt を必ず更新（呼び出し側 salt があっても時刻・tick を混ぜる） */
    var salt = freshSalt(opts.salt || "");

    return ensureMeta()
      .then(function () {
        var sceneHint = resolveScene(opts);
        return loadScene(sceneHint).then(function (sceneDoc) {
          return { sceneHint: sceneHint, sceneDoc: sceneDoc };
        });
      })
      .then(function (pack) {
        var sceneHint = pack.sceneHint;
        var scene = pack.sceneDoc || { parts: [] };
        var parts = scene.parts || [];
        var meta = cache.meta;
        var rng = mulberry32(
          hashSeed(
            sampleKey +
              "|" +
              (opts.sitePurpose || "") +
              "|" +
              sectionId +
              "|" +
              keywordIds.join(",") +
              "|" +
              salt
          )
        );
        var preferred = [];
        if (presetAxes && presetAxes[sectionId]) preferred.push(presetAxes[sectionId]);
        preferred = preferred.concat(keywordToAxisHints(meta, keywordIds));
        var axes = pickDistinctAxes(preferred, allAxisIds(meta), 3, rng);
        var usedIds = {};
        var candidates = axes.map(function (axisId) {
          var built = assembleSentence(parts, sectionId, axisId, keywordIds, rng, usedIds);
          return {
            label: axisLabel(meta, axisId),
            text: built.text,
            axisId: axisId,
            partIds: built.partIds
          };
        });
        /* ensure unique texts — if collide, reassemble with salt bump */
        var seenText = {};
        candidates.forEach(function (c, i) {
          if (seenText[c.text]) {
            var rebuilt = assembleSentence(
              parts,
              sectionId,
              c.axisId,
              keywordIds,
              mulberry32(hashSeed(salt + "|retry|" + i + "|" + freshSalt("retry"))),
              usedIds
            );
            c.text = rebuilt.text;
            c.partIds = rebuilt.partIds;
          }
          seenText[c.text] = true;
        });
        return {
          sceneId: scene.scene || sceneHint,
          axes: axes,
          candidates: candidates,
          salt: salt
        };
      })
      .catch(function () {
        /* absolute fallback — never blank */
        var axes = ["ease", "bright", "craft"];
        var sceneHint = "cafe";
        try {
          sceneHint = resolveScene(opts);
        } catch (e) {}
        return {
          sceneId: sceneHint,
          axes: axes,
          candidates: axes.map(function (a) {
            return {
              label: a,
              text: fallbackLine(sectionId, a),
              axisId: a,
              partIds: []
            };
          }),
          salt: salt
        };
      });
  }

  function pickOmakasePreset(rng) {
    return ensurePresets().then(function (doc) {
      var list = doc.presets || [];
      if (!list.length) {
        return {
          id: "flow-clear",
          axes: { hero: "clear", about: "warm", works: "invite", contact: "clear" }
        };
      }
      return weightedPick(list, rng || Math.random);
    });
  }

  global.Sample1manCopyDict = {
    sceneFromSampleKey: sceneFromSampleKey,
    resolveScene: resolveScene,
    loadScene: loadScene,
    generateThree: generateThree,
    pickOmakasePreset: pickOmakasePreset,
    ensureMeta: ensureMeta,
    resetSessionUsedParts: resetSessionUsedParts,
    noteUsedPartIds: noteUsedPartIds,
    freshSalt: freshSalt
  };
})(typeof window !== "undefined" ? window : globalThis);
