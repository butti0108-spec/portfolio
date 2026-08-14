(function () {
  if (window.self !== window.top) document.documentElement.classList.add("embed");

  var pdfBtn = document.getElementById("save-pdf");
  var printBtn = document.getElementById("print-page");

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
