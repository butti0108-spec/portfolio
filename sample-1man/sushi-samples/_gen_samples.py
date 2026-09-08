# -*- coding: utf-8 -*-
import json
import os
from datetime import datetime, timezone

ROOT = os.path.dirname(os.path.abspath(__file__))

PRESETS = {
    "green": {
        "pageBg": "#e8f2e6",
        "pageBgSoft": "#d2e6ce",
        "heroInk": "#111111",
        "bodyInk": "#212121",
        "bodyMuted": "#555555",
        "chromeBg": "#1f3d18",
        "chromeInk": "#f4fff6",
        "accent": "#3d8a48",
        "cardBg": "#ffffff",
        "valuesBg": "#ffffff",
        "contactBg": "#2d6a36",
        "contactInk": "#f4fff6",
    },
    "clinic": {
        "pageBg": "#ffffff",
        "pageBgSoft": "#f3f6f8",
        "heroInk": "#1a4d8c",
        "bodyInk": "#212121",
        "bodyMuted": "#555555",
        "chromeBg": "#1a4d8c",
        "chromeInk": "#ffffff",
        "accent": "#1a4d8c",
        "cardBg": "#ffffff",
        "valuesBg": "#ffffff",
        "contactBg": "#1a4d8c",
        "contactInk": "#ffffff",
    },
    "cafe": {
        "pageBg": "#f5efe4",
        "pageBgSoft": "#ebe1d0",
        "heroInk": "#fff6e8",
        "bodyInk": "#3e2723",
        "bodyMuted": "#6a5340",
        "chromeBg": "#5c4033",
        "chromeInk": "#fff6e8",
        "accent": "#c45c26",
        "cardBg": "#fff8ee",
        "valuesBg": "#fff8ee",
        "contactBg": "#5c4033",
        "contactInk": "#fff6e8",
    },
    "ink": {
        "pageBg": "#2e3333",
        "pageBgSoft": "#3a4040",
        "heroInk": "#ffffff",
        "bodyInk": "#f5f5f5",
        "bodyMuted": "#c8c8c8",
        "chromeBg": "#111111",
        "chromeInk": "#ffffff",
        "accent": "#d4af37",
        "cardBg": "#3a4040",
        "valuesBg": "#3a4040",
        "contactBg": "#111111",
        "contactInk": "#ffffff",
    },
    "brick": {
        "pageBg": "#fbf4ef",
        "pageBgSoft": "#f0e0d4",
        "heroInk": "#fff8f2",
        "bodyInk": "#3b2419",
        "bodyMuted": "#6b4a3a",
        "chromeBg": "#8b4513",
        "chromeInk": "#fff8f2",
        "accent": "#d35400",
        "cardBg": "#fffaf6",
        "valuesBg": "#fffaf6",
        "contactBg": "#8b4513",
        "contactInk": "#fff8f2",
    },
    "sakura": {
        "pageBg": "#fff5f8",
        "pageBgSoft": "#ffe4ec",
        "heroInk": "#5c2a3a",
        "bodyInk": "#3a2a30",
        "bodyMuted": "#7a5a65",
        "chromeBg": "#d4789c",
        "chromeInk": "#ffffff",
        "accent": "#c45c7a",
        "cardBg": "#ffffff",
        "valuesBg": "#ffffff",
        "contactBg": "#d4789c",
        "contactInk": "#ffffff",
    },
}

FONTS = {
    "mincho": {
        "display": "Shippori Mincho",
        "catch": "Shippori Mincho",
        "body": "Zen Kaku Gothic New",
    },
    "gothic": {
        "display": "Zen Kaku Gothic New",
        "catch": "Zen Kaku Gothic New",
        "body": "Noto Sans JP",
    },
    "softGothic": {
        "display": "Sawarabi Gothic",
        "catch": "Sawarabi Gothic",
        "body": "Zen Kaku Gothic New",
    },
    "round": {
        "display": "Zen Maru Gothic",
        "catch": "Kiwi Maru",
        "body": "M PLUS Rounded 1c",
    },
    "bold": {
        "display": "Dela Gothic One",
        "catch": "Dela Gothic One",
        "body": "Zen Kaku Gothic New",
    },
    "brush": {
        "display": "Yuji Syuku",
        "catch": "Yuji Syuku",
        "body": "Sawarabi Gothic",
    },
}

SAMPLES = [
    ("01", "cafe-warm-a", "カフェ・横長・ベージュ暖色・明朝", "a", "cafe", "mincho", "木漏れ日カフェ", "やさしい時間を、みなさまに"),
    ("02", "cafe-split-b", "カフェ・左右割・緑・丸ゴ", "b", "green", "round", "ミドリ喫茶", "緑のなかで一休み"),
    ("03", "cafe-mix-ink-c", "カフェ・混合・墨・太ゴ見出し", "c", "ink", "bold", "墨ノ珈琲", "夜のための一杯"),
    ("04", "salon-clinic-a", "サロン・横長・紺きれいめ・明朝", "a", "clinic", "mincho", "藍のサロン", "整える、静かな時間"),
    ("05", "salon-sakura-b", "サロン・左右・桜ピンク・丸", "b", "sakura", "round", "桜並木サロン", "やわらかく、きれいに"),
    ("06", "bakery-brick-a", "パン屋・横長・オレンジ・やわゴ", "a", "brick", "softGothic", "レンガベーカリー", "焼きたてを、毎日"),
    ("07", "bakery-cafe-c", "パン屋・混合・ベージュ・明朝", "c", "cafe", "mincho", "小麦の庭", "朝の香りから始まる"),
    ("08", "bar-ink-b", "バー・左右・墨・筆風", "b", "ink", "brush", "夜咄バー", "静かな夜の会話"),
    ("09", "bar-brick-a", "バー・横長・レンガ暖色・太ゴ", "a", "brick", "bold", "暖炉BAR", "あたたかい席で"),
    ("10", "clinic-green-a", "診療所風・横長・緑・角ゴ", "a", "green", "gothic", "みどり診療案内", "安心して通える場所"),
    ("11", "clinic-clinic-b", "診療所風・左右・紺・明朝", "b", "clinic", "mincho", "紺碧クリニック", "丁寧な説明を大切に"),
    ("12", "florist-sakura-a", "花屋・横長・桜・丸", "a", "sakura", "round", "花便り", "季節の花を玄関に"),
    ("13", "florist-green-c", "花屋・混合・緑・明朝", "c", "green", "mincho", "葉音フラワー", "緑と花のアレンジ"),
    ("14", "ramen-brick-b", "ラーメン・左右・オレンジ・太ゴ", "b", "brick", "bold", "炎麺", "熱々を、一気に"),
    ("15", "ramen-ink-a", "ラーメン・横長・墨・筆", "a", "ink", "brush", "暖簾そば処", "湯気の向こうへ"),
    ("16", "yoga-green-a", "ヨガ・横長・緑・やわゴ", "a", "green", "softGothic", "呼吸の庭", "からだをほどく時間"),
    ("17", "yoga-sakura-b", "ヨガ・左右・桜・丸", "b", "sakura", "round", "さくらヨガ", "やさしく動く"),
    ("18", "studio-clinic-c", "写真館・混合・紺・明朝", "c", "clinic", "mincho", "余白フォト", "残したい一瞬を"),
    ("19", "studio-ink-a", "写真館・横長・墨・太ゴ", "a", "ink", "bold", "SHADOW STUDIO", "光と影で残す"),
    ("20", "pet-cafe-b", "ペット・左右・ベージュ・丸", "b", "cafe", "round", "しっぽカフェ", "わんもねこも歓迎"),
    ("21", "pet-sakura-a", "ペット・横長・桜・やわゴ", "a", "sakura", "softGothic", "おさんぽ舎", "一緒に歩く毎日"),
    ("22", "cowork-clinic-b", "コワーキング・左右・紺・角ゴ", "b", "clinic", "gothic", "FOCUS LOUNGE", "集中できる席"),
    ("23", "cowork-green-a", "コワーキング・横長・緑・明朝", "a", "green", "mincho", "木陰ワーク", "植物のある仕事場"),
    ("24", "sweets-sakura-c", "スイーツ・混合・桜・丸", "c", "sakura", "round", "桜スイーツ", "甘い休憩を"),
    ("25", "sweets-cafe-a", "スイーツ・横長・ベージュ・明朝", "a", "cafe", "mincho", "午後の菓子屋", "紅茶と一緒に"),
    ("26", "izakaya-brick-c", "居酒屋・混合・レンガ・筆", "c", "brick", "brush", "赤提灯や", "今日の一杯を"),
    ("27", "izakaya-ink-b", "居酒屋・左右・墨・太ゴ", "b", "ink", "bold", "黒木屋", "炭火と会話"),
    ("28", "gallery-ink-a", "ギャラリー・横長・墨・明朝", "a", "ink", "mincho", "余白ギャラリー", "作品と静かに"),
    ("29", "gallery-clinic-c", "ギャラリー・混合・紺・角ゴ", "c", "clinic", "gothic", "WHITE WALL", "白い壁にのせる"),
    ("30", "hotel-cafe-b", "宿・左右・ベージュ・明朝", "b", "cafe", "mincho", "朝霧の宿", "ゆっくり泊まる"),
]


def esc(s: str) -> str:
    return (
        s.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
    )


def main() -> None:
    copy_seeds = []
    manifest = {
        "version": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "samples": [],
    }

    for sid, key, blurb, layout, color_key, font_mood, brand, hero in SAMPLES:
        folder = f"{sid}-{key}"
        dpath = os.path.join(ROOT, folder)
        os.makedirs(dpath, exist_ok=True)
        colors = dict(PRESETS[color_key])
        fonts = FONTS[font_mood]
        about = f"{brand}は、選んだ雰囲気に合わせて丁寧にご案内します。初めての方も安心してご来店ください。"
        draft = {
            "version": 16,
            "sushiSampleId": sid,
            "sushiSampleKey": key,
            "blurb": blurb,
            "savedAt": datetime.now(timezone.utc).isoformat(),
            "uiMode": "self",
            "sitePurpose": "shop",
            "siteColorMode": "detail",
            "layoutPattern": layout,
            "layoutSelected": True,
            "layoutSchema": 2,
            "intakeDone": True,
            "entryBranch": "sample",
            "hubEntrySource": "sample",
            "easyFlowActive": False,
            "presetChosen": True,
            "chosenPresetKey": color_key,
            "draftColors": colors,
            "guidedImageUnlocked": True,
            "guidedTextUnlocked": True,
            "fonts": fonts,
            "fields": {
                "brand_name": brand,
                "hero_title": brand,
                "hero_lead_1": hero,
                "hero_lead_2": "ご来店をお待ちしています",
                "about_heading": f"{brand}について",
                "about_name": brand,
                "about_lead": about,
                "works_heading": "おすすめ",
                "works_lead": "メニューやコースの見出しを並べる",
                "work_1_title": "看板メニュー",
                "work_1_text": "人気の一品をご紹介します",
                "contact_label": "ご連絡",
                "contact_note_1": "ご予約・お問い合わせはこちら",
                "font_display": fonts["display"],
                "font_catch": fonts["catch"],
                "font_body": fonts["body"],
            },
            "confirmed": {
                "purpose": True,
                "layout": True,
                "guide": True,
                "global-preset": True,
            },
            "draftExtras": {"hours": True, "access": False, "address": True},
        }
        with open(os.path.join(dpath, "draft.json"), "w", encoding="utf-8") as f:
            json.dump(draft, f, ensure_ascii=False, indent=2)

        w1 = 280 if layout == "b" else 592
        x2 = 336 if layout == "b" else 24
        y2 = 300 if layout == "b" else 384
        svg = f"""<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="800" viewBox="0 0 640 800">
  <rect width="640" height="800" fill="{colors['pageBg']}"/>
  <rect x="0" y="0" width="640" height="56" fill="{colors['chromeBg']}"/>
  <text x="24" y="36" fill="{colors['chromeInk']}" font-size="18" font-family="sans-serif">{esc(brand)}</text>
  <rect x="24" y="80" width="592" height="200" fill="{colors['chromeBg']}" opacity="0.9"/>
  <text x="40" y="170" fill="{colors['heroInk']}" font-size="26" font-family="serif" font-weight="700">{esc(hero)}</text>
  <rect x="24" y="300" width="{w1}" height="70" fill="{colors['valuesBg']}" stroke="{colors['accent']}" stroke-width="2"/>
  <rect x="{x2}" y="{y2}" width="{w1}" height="70" fill="{colors['cardBg']}" stroke="{colors['accent']}" stroke-width="2"/>
  <rect x="24" y="480" width="592" height="120" fill="{colors['pageBgSoft']}"/>
  <text x="40" y="530" fill="{colors['bodyInk']}" font-size="15" font-family="sans-serif">{esc(about[:40])}</text>
  <rect x="24" y="620" width="592" height="100" fill="{colors['contactBg']}"/>
  <text x="40" y="678" fill="{colors['contactInk']}" font-size="20" font-family="sans-serif">ご連絡</text>
  <text x="24" y="780" fill="{colors['bodyMuted']}" font-size="12">No.{sid} · {esc(key)}</text>
</svg>
"""
        with open(os.path.join(dpath, "preview.svg"), "w", encoding="utf-8") as f:
            f.write(svg)

        copy_seeds.append(
            {
                "id": sid,
                "brand": brand,
                "hero": hero,
                "about": about,
                "moodHint": font_mood,
            }
        )
        manifest["samples"].append(
            {
                "id": sid,
                "key": key,
                "blurb": blurb,
                "layout": layout,
                "colorKey": color_key,
                "fontMood": font_mood,
                "brand": brand,
                "hero": hero,
                "draftPath": f"{folder}/draft.json",
                "previewPath": f"{folder}/preview.svg",
            }
        )

    with open(os.path.join(ROOT, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    with open(os.path.join(ROOT, "copy-seeds.json"), "w", encoding="utf-8") as f:
        json.dump(copy_seeds, f, ensure_ascii=False, indent=2)
    print(f"wrote {len(SAMPLES)} samples to {ROOT}")


if __name__ == "__main__":
    main()
