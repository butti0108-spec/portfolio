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
