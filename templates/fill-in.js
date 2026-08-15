(function () {
  if (window.self !== window.top) document.documentElement.classList.add("embed");

  var pdfBtn = document.getElementById("save-pdf");
  var printBtn = document.getElementById("print-page");
  var repeats = document.querySelectorAll("[data-repeat]");

  function visibleCount(slots) {
    var count = 0;
    for (var i = 0; i < slots.length; i += 1) {
      if (!slots[i].hidden) count += 1;
    }
    return count;
  }

  function clearFields(slot) {
    var fields = slot.querySelectorAll("input, textarea");
    for (var i = 0; i < fields.length; i += 1) {
      fields[i].value = fields[i].defaultValue;
    }
  }

  function setupRepeat(group) {
    var wrap = group.closest(".wf-repeat-wrap");
    if (!wrap) return;
    var max = Number(group.getAttribute("data-max") || "1");
    var slots = group.querySelectorAll(":scope > .wf-box");
    var remain = wrap.querySelector("[data-remain]");
    var addBtn = wrap.querySelector("[data-add]");
    var removeBtn = wrap.querySelector("[data-remove]");

    function update() {
      var count = visibleCount(slots);
      var left = max - count;
      group.setAttribute("data-count", String(count));
      if (remain) {
        remain.textContent = left > 0 ? "あと" + left + "つ足せます" : "これ以上は足せません";
      }
      if (addBtn) addBtn.disabled = left <= 0;
      if (removeBtn) removeBtn.disabled = count <= 1;
    }

    if (addBtn) {
      addBtn.addEventListener("click", function () {
        for (var i = 0; i < slots.length; i += 1) {
          if (slots[i].hidden) {
            slots[i].hidden = false;
            break;
          }
        }
        update();
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener("click", function () {
        for (var i = slots.length - 1; i >= 1; i -= 1) {
          if (!slots[i].hidden) {
            slots[i].hidden = true;
            clearFields(slots[i]);
            break;
          }
        }
        update();
      });
    }

    update();
  }

  for (var r = 0; r < repeats.length; r += 1) {
    setupRepeat(repeats[r]);
  }

  function setupLookFields() {
    var patternInputs = document.querySelectorAll('input[name="look-pattern"]');
    var lookTargets = document.querySelectorAll("[data-look-for]");
    var preview = document.getElementById("look-preview");
    var stage = preview ? preview.querySelector(".wf-preview-stage") : null;
    var title = preview ? preview.querySelector(".wf-preview-title") : null;
    var text = preview ? preview.querySelector(".wf-preview-text") : null;
    if (!patternInputs.length) return;

    var bases = {
      green: { mid: "#8fbf78", light: "#f3f8ef", deep: "#5f9848" },
      blue: { mid: "#7aa7c7", light: "#eef4f8", deep: "#4a7a9a" },
      teal: { mid: "#6fafa3", light: "#e8f4f1", deep: "#3f857a" },
      beige: { mid: "#d4c4a8", light: "#f7f3ea", deep: "#a89070" },
      coral: { mid: "#d4a090", light: "#faf0ec", deep: "#b07060" },
      "light-gray": { mid: "#d5d9de", light: "#f7f8f9", deep: "#9aa3ad" },
      gray: { mid: "#9aa3ad", light: "#f0f2f4", deep: "#6a737c" },
      dark: { mid: "#3a3f45", light: "#5a6068", deep: "#1f2226" }
    };

    var inks = {
      black: "#111111",
      white: "#ffffff"
    };

    function selectedValue(name, fallback) {
      var inputs = document.querySelectorAll('input[name="' + name + '"]');
      for (var i = 0; i < inputs.length; i += 1) {
        if (inputs[i].checked) return inputs[i].value;
      }
      return fallback;
    }

    function selectedPattern() {
      return selectedValue("look-pattern", "same");
    }

    function gradientBackground(colors, direction) {
      var light = colors.light;
      var deep = colors.deep;
      if (direction === "top-dark") return "linear-gradient(180deg, " + deep + " 0%, " + light + " 100%)";
      if (direction === "left-dark") return "linear-gradient(90deg, " + deep + " 0%, " + light + " 100%)";
      if (direction === "right-dark") return "linear-gradient(90deg, " + light + " 0%, " + deep + " 100%)";
      return "linear-gradient(180deg, " + light + " 0%, " + deep + " 100%)";
    }

    function updatePreview() {
      if (!stage) return;
      var pattern = selectedPattern();
      var baseKey = selectedValue("look-base", "green");
      var inkKey = selectedValue("look-ink", "black");
      var direction = selectedValue("look-gradient-dir", "bottom-dark");
      var colors = bases[baseKey] || bases.green;
      var ink = inks[inkKey] || inks.black;

      if (pattern === "same") {
        stage.style.background = "linear-gradient(180deg, #f3f8ef 0%, #8fbf78 100%)";
        stage.style.color = "#111111";
        if (title) title.textContent = "見出しの見本";
        if (text) text.textContent = "ここに短い文章が入ります。";
        return;
      }

      if (pattern === "consult") {
        stage.style.background = "#f3f3f3";
        stage.style.color = "#333333";
        if (title) title.textContent = "相談内容で調整";
        if (text) text.textContent = "自由記入の内容に合わせて色を決めます。";
        return;
      }

      if (pattern === "solid") {
        stage.style.background = colors.mid;
      } else {
        stage.style.background = gradientBackground(colors, direction);
      }
      stage.style.color = ink;
      if (title) title.textContent = "見出しの見本";
      if (text) text.textContent = "ここに短い文章が入ります。";
    }

    function updateLook() {
      var pattern = selectedPattern();
      for (var i = 0; i < lookTargets.length; i += 1) {
        var modes = (lookTargets[i].getAttribute("data-look-for") || "").split(/\s+/);
        var show = modes.indexOf(pattern) !== -1;
        lookTargets[i].hidden = !show;
      }
      updatePreview();
    }

    var watchNames = ["look-pattern", "look-base", "look-ink", "look-gradient-dir"];
    for (var n = 0; n < watchNames.length; n += 1) {
      var inputs = document.querySelectorAll('input[name="' + watchNames[n] + '"]');
      for (var p = 0; p < inputs.length; p += 1) {
        inputs[p].addEventListener("change", updateLook);
      }
    }
    updateLook();
  }

  setupLookFields();

  if (printBtn) {
    printBtn.addEventListener("click", function () {
      window.print();
    });
  }

  if (!pdfBtn) return;

  pdfBtn.addEventListener("click", function () {
    if (typeof html2pdf !== "function") {
      window.alert("PDFを作れませんでした。印刷を使ってください。");
      return;
    }

    pdfBtn.disabled = true;
    document.body.classList.add("pdf-export");

    var options = {
      margin: [12, 12, 12, 12],
      filename: "1万円プラン_記入内容.pdf",
      image: { type: "jpeg", quality: 0.92 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff"
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], avoid: [".wf-box"] }
    };

    function done() {
      document.body.classList.remove("pdf-export");
      pdfBtn.disabled = false;
    }

    requestAnimationFrame(function () {
      try {
        var exportJob = html2pdf()
          .set(options)
          .from(document.getElementById("main"))
          .save();
        if (exportJob && typeof exportJob.then === "function") {
          exportJob.then(done, done);
        } else {
          setTimeout(done, 2000);
        }
      } catch (error) {
        done();
        window.alert("PDFを作れませんでした。印刷を使ってください。");
      }
    });
  });
})();
