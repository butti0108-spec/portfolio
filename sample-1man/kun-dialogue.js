/**
 * クンの会話台本。お店の試作3問だけ。
 * 文章辞書（easy-copy-dict / copy-dict）とは別ファイル。
 */
(function (global) {
  "use strict";

  global.KunDialogue = {
    industry: "shop",
    industryLabel: "お店",
    questions: [
      {
        id: "mood",
        ask: "お店の雰囲気は、どれに近いですか？",
        manual: "easy-color-stage",
        manualLead: "色の画面で、直接選べます。",
        choices: [
          { id: "calm", label: "落ち着いた", reply: "落ち着いた色にしました。", apply: { preset: "cafe" } },
          { id: "bright", label: "明るい", reply: "明るい色にしました。", apply: { preset: "sakura" } },
          { id: "night", label: "夜の店", reply: "夜の色にしました。", apply: { preset: "ink" } },
          { id: "self", label: "自分で変える", manual: true },
          { id: "other", label: "ほかの言葉", free: true }
        ],
        freeMatch: [
          { words: ["緑", "みどり"], preset: "green", label: "緑の色" },
          { words: ["青", "あお", "海"], preset: "ocean", label: "青の色" },
          { words: ["桜", "ピンク", "桃"], preset: "sakura", label: "桜の色" },
          { words: ["茶", "カフェ", "暖"], preset: "cafe", label: "落ち着いた茶色" },
          { words: ["黒", "夜", "暗"], preset: "ink", label: "夜の色" },
          { words: ["梅", "紫"], preset: "plum", label: "梅の色" }
        ]
      },
      {
        id: "hours",
        ask: "営業時間は、載せますか？",
        manual: "easy-basics",
        manualLead: "並びの画面で、載せる欄を直接選べます。",
        choices: [
          { id: "on", label: "載せる", reply: "営業時間を出しました。", apply: { block: "hours", visible: true } },
          { id: "off", label: "載せない", reply: "営業時間は出していません。", apply: { block: "hours", visible: false } },
          { id: "self", label: "自分で並びを変える", manual: true },
          { id: "other", label: "ほかの言葉", free: true }
        ],
        freeMatch: [
          { words: ["載せない", "いらない", "隠", "なし", "出さない"], block: "hours", visible: false, label: "営業時間を出さない" },
          { words: ["載せる", "出す", "営業", "時間", "ほしい", "欲しい"], block: "hours", visible: true, label: "営業時間を出す" }
        ]
      },
      {
        id: "catch",
        ask: "キャッチの言葉は、どれにしますか？",
        manual: "easy-copy-omakase",
        manualLead: "文章の画面で、直接書けます。",
        choices: [
          { id: "quiet", label: "静かな時間を、ここで。", reply: "その言葉をキャッチにしました。", apply: { field: "hero_title", text: "静かな時間を、ここで。" } },
          { id: "today", label: "今日の一杯を、どうぞ。", reply: "その言葉をキャッチにしました。", apply: { field: "hero_title", text: "今日の一杯を、どうぞ。" } },
          { id: "night", label: "夜は、ゆっくりどうぞ。", reply: "その言葉をキャッチにしました。", apply: { field: "hero_title", text: "夜は、ゆっくりどうぞ。" } },
          { id: "self", label: "自分で書く", manual: true },
          { id: "other", label: "ほかの言葉", free: true }
        ],
        acceptFreeText: true
      }
    ]
  };
})(typeof window !== "undefined" ? window : globalThis);
