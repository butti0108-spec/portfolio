/**
 * クン試作の左欄。?kun=1 のときだけ出す。
 * 会話の進みは sample-1man-kun-v1。見本への反映は Sample1manKun 経由。
 */
(function () {
  "use strict";

  var KEY = "sample-1man-kun-v1";
  var bridge = window.Sample1manKun;
  var doc = window.KunDialogue;
  if (!bridge || !bridge.enabled || !doc || !doc.questions) return;

  var panel = document.getElementById("kun-panel");
  var askEl = document.getElementById("kun-ask");
  var replyEl = document.getElementById("kun-reply");
  var choicesEl = document.getElementById("kun-choices");
  var freeForm = document.getElementById("kun-free");
  var freeInput = document.getElementById("kun-free-input");
  var candEl = document.getElementById("kun-candidates");
  var manualNote = document.getElementById("kun-manual-note");
  var returnBtn = document.getElementById("kun-return");
  var exitLink = document.getElementById("kun-exit");
  if (!panel || !askEl || !choicesEl) return;

  var step = 0;
  var phase = "ask";
  var pending = null;
  var wizardReturnIndex = null;

  function question() {
    return doc.questions[step] || null;
  }

  function readStore() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return;
      var data = JSON.parse(raw);
      if (!data || data.version !== 1 || data.industry !== "shop") return;
      if (Number.isFinite(data.step)) step = data.step;
      if (step < 0) step = 0;
      if (step > doc.questions.length) step = doc.questions.length;
      phase = data.phase || "ask";
      pending = data.pending || null;
      if (Number.isFinite(data.wizardReturnIndex)) wizardReturnIndex = data.wizardReturnIndex;
    } catch (e) { /* 会話の保存が壊れていても、制作下書きは触らない */ }
  }

  function writeStore() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        version: 1,
        industry: "shop",
        step: step,
        phase: phase,
        pending: pending,
        wizardReturnIndex: wizardReturnIndex
      }));
    } catch (e) { /* 容量オーバーでも制作は続ける */ }
  }

  function exitHref() {
    var params = new URLSearchParams(location.search);
    params.delete("kun");
    var q = params.toString();
    return "index.html" + (q ? "?" + q : "");
  }

  function showReply(text) {
    if (!replyEl) return;
    if (!text) {
      replyEl.hidden = true;
      replyEl.textContent = "";
      return;
    }
    replyEl.hidden = false;
    replyEl.textContent = text;
  }

  function clearBits() {
    choicesEl.innerHTML = "";
    if (candEl) candEl.innerHTML = "";
    if (freeForm) freeForm.hidden = true;
    if (manualNote) manualNote.hidden = true;
    if (returnBtn) returnBtn.hidden = true;
  }

  function applyEffect(effect) {
    if (!effect) return false;
    if (effect.preset) return !!bridge.applyPreset(effect.preset);
    if (effect.block) return !!bridge.setBlockVisible(effect.block, !!effect.visible);
    if (effect.field) return !!bridge.applyText(effect.field, effect.text || "");
    return false;
  }

  function advance(reply) {
    step += 1;
    phase = step >= doc.questions.length ? "done" : "ask";
    pending = null;
    showReply(reply || "");
    writeStore();
    paint();
  }

  function openManual(q) {
    var opened = bridge.openManual(q.manual);
    if (!opened || !opened.ok) {
      showReply("その画面は、いま開けません。次の質問へ進めます。");
      phase = "ask";
      writeStore();
      paint();
      return;
    }
    wizardReturnIndex = opened.wizardReturnIndex;
    phase = "manual";
    writeStore();
    paint();
  }

  function matchFree(q, text) {
    var raw = String(text || "").trim();
    if (!raw) return null;
    if (q.acceptFreeText) {
      return { field: "hero_title", text: raw, label: raw };
    }
    var list = q.freeMatch || [];
    for (var i = 0; i < list.length; i += 1) {
      var row = list[i];
      var words = row.words || [];
      for (var w = 0; w < words.length; w += 1) {
        if (raw.indexOf(words[w]) >= 0) {
          return {
            preset: row.preset,
            block: row.block,
            visible: row.visible,
            field: row.field,
            text: row.text,
            label: row.label
          };
        }
      }
    }
    return null;
  }

  function paintDone() {
    askEl.textContent = "3つの質問を、見本へ反映しました。";
    choicesEl.innerHTML = "";
    var again = document.createElement("button");
    again.type = "button";
    again.className = "kun-choice";
    again.textContent = "もう一度、最初から選べます";
    again.addEventListener("click", function () {
      step = 0;
      phase = "ask";
      pending = null;
      showReply("");
      writeStore();
      paint();
    });
    choicesEl.appendChild(again);
  }

  function paintAsk(q) {
    askEl.textContent = q.ask;
    q.choices.forEach(function (choice) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "kun-choice";
      btn.textContent = choice.label;
      btn.addEventListener("click", function () {
        if (choice.manual) {
          showReply("直接選べます。");
          openManual(q);
          return;
        }
        if (choice.free) {
          phase = "free";
          pending = null;
          showReply("");
          writeStore();
          paint();
          return;
        }
        var ok = applyEffect(choice.apply);
        if (!ok) {
          showReply("見本へは入れられませんでした。自分で変えられます。");
          phase = "ask";
          writeStore();
          paint();
          return;
        }
        advance(choice.reply);
      });
      choicesEl.appendChild(btn);
    });
  }

  function paintFree(q) {
    askEl.textContent = q.ask;
    if (freeForm) freeForm.hidden = false;
    if (freeInput) {
      freeInput.value = "";
      freeInput.focus();
    }
    var back = document.createElement("button");
    back.type = "button";
    back.className = "kun-choice kun-choice--quiet";
    back.textContent = "選択肢に戻る";
    back.addEventListener("click", function () {
      phase = "ask";
      showReply("");
      writeStore();
      paint();
    });
    choicesEl.appendChild(back);
  }

  function paintConfirm(q) {
    askEl.textContent = "この内容で、見本へ入れますか？";
    if (!pending) {
      phase = "ask";
      paint();
      return;
    }
    var yes = document.createElement("button");
    yes.type = "button";
    yes.className = "kun-choice";
    yes.textContent = pending.label ? "「" + pending.label + "」にする" : "これにする";
    yes.addEventListener("click", function () {
      var ok = applyEffect(pending);
      if (!ok) {
        showReply("見本へは入れられませんでした。自分で変えられます。");
        openManual(q);
        return;
      }
      advance("見本へ入れました。");
    });
    var no = document.createElement("button");
    no.type = "button";
    no.className = "kun-choice kun-choice--quiet";
    no.textContent = "自分で直す";
    no.addEventListener("click", function () {
      showReply(q.manualLead || "この画面で直接直せます。");
      openManual(q);
    });
    choicesEl.appendChild(yes);
    choicesEl.appendChild(no);
  }

  function paintManual(q) {
    askEl.textContent = q.manualLead || "この画面で直接直せます。";
    showReply("終わったら、会話に戻れます。");
    if (manualNote) manualNote.hidden = false;
    if (returnBtn) returnBtn.hidden = false;
    document.body.classList.add("is-kun-manual");
  }

  function paint() {
    clearBits();
    document.body.classList.toggle("is-kun-manual", phase === "manual");
    if (phase === "done" || step >= doc.questions.length) {
      phase = "done";
      paintDone();
      return;
    }
    var q = question();
    if (!q) {
      paintDone();
      return;
    }
    if (phase === "free") paintFree(q);
    else if (phase === "confirm") paintConfirm(q);
    else if (phase === "manual") paintManual(q);
    else paintAsk(q);
  }

  if (freeForm) {
    freeForm.addEventListener("submit", function (ev) {
      ev.preventDefault();
      var q = question();
      if (!q) return;
      var text = freeInput ? freeInput.value : "";
      var found = matchFree(q, text);
      if (!found) {
        showReply("その言葉に合う候補は、まだありません。" + (q.manualLead || "自分で直せます。"));
        var go = document.createElement("button");
        go.type = "button";
        go.className = "kun-choice";
        go.textContent = "自分で直す";
        go.addEventListener("click", function () { openManual(q); });
        var next = document.createElement("button");
        next.type = "button";
        next.className = "kun-choice kun-choice--quiet";
        next.textContent = "次の質問へ";
        next.addEventListener("click", function () { advance("この質問は、そのままにしました。"); });
        if (candEl) {
          candEl.innerHTML = "";
          candEl.appendChild(go);
          candEl.appendChild(next);
        }
        return;
      }
      pending = found;
      phase = "confirm";
      showReply("候補があります。");
      writeStore();
      paint();
    });
  }

  if (returnBtn) {
    returnBtn.addEventListener("click", function () {
      bridge.closeManual(wizardReturnIndex);
      wizardReturnIndex = null;
      phase = "ask";
      showReply("会話に戻りました。");
      writeStore();
      paint();
    });
  }

  readStore();
  if (phase === "manual") {
    bridge.closeManual(wizardReturnIndex);
    wizardReturnIndex = null;
    phase = "ask";
    writeStore();
  }
  if (exitLink) exitLink.setAttribute("href", exitHref());
  panel.hidden = false;
  paint();
})();
