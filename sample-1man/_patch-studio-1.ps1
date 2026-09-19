# Patch script.js for studio-review hub + import + width
$path = Join-Path $PSScriptRoot "script.js"
$t = [IO.File]::ReadAllText($path, [Text.Encoding]::UTF8)

# 1) Title for studio-review
$oldTitle = @'
    if (mode === "layout") {
      title.textContent = "レイアウト変更";
      return;
    }
    const step = STEPS.find((s) => s.id === store.selfEditingStepId);
    title.textContent = step ? step.label : "編集";
  }
'@
$newTitle = @'
    if (mode === "layout") {
      title.textContent = "レイアウト変更";
      return;
    }
    if (mode === "studio-review") {
      title.textContent = "制作・レビュー";
      return;
    }
    const step = STEPS.find((s) => s.id === store.selfEditingStepId);
    title.textContent = step ? step.label : "編集";
  }
'@
if ($t.Contains($oldTitle) -and -not $t.Contains('mode === "studio-review"')) {
  $t = $t.Replace($oldTitle, $newTitle)
  Write-Host "title patched"
} elseif ($t.Contains('title.textContent = "制作・レビュー"')) {
  Write-Host "title already"
} else {
  Write-Host "WARN title block not found"
}

# 2) Insert studio enter/exit before enterHubLayoutMode
$oldEnter = @'
  function enterHubLayoutMode() {
    if (store.siteColorMode !== "detail") return;
    store.hubUiMode = "layout";
'@
$newEnter = @'
  function isLocalStudioHost() {
    const h = location.hostname;
    return h === "127.0.0.1" || h === "localhost" || h === "[::1]";
  }

  function enterHubStudioReview() {
    if (!isLocalStudioHost()) return;
    hideEntryGate();
    setSampleFlowPreviewHidden(false);
    document.body.classList.remove("sample-flow-hide-preview");
    store.intakeDone = true;
    store.easyFlowActive = false;
    store.siteColorMode = "detail";
    store.uiMode = "self";
    store.selfEditingStepId = "layout";
    store.hubUiMode = "studio-review";
    store.hubEntryRoute = null;
    store.hubPlacePickMode = false;
    store.hubPlaceSelectedBlockId = null;
    store.hubReturnBlockId = null;
    store.hubTaskId = null;
    document.documentElement.classList.add("is-review-mode");
    document.body.classList.add("is-review-mode");
    syncSiteColorModeUi();
    clearHubPlaceFit();
    syncDetailDashVisibility("layout");
    syncHubEntryPanels();
    placeLookControls();
    placePreviewWidthControl();
    updateWizardUi();
    if (
      window.__sample1manStudioReview &&
      typeof window.__sample1manStudioReview.activate === "function"
    ) {
      window.__sample1manStudioReview.activate();
    }
  }

  function exitHubStudioReview() {
    if (
      window.__sample1manStudioReview &&
      typeof window.__sample1manStudioReview.deactivate === "function"
    ) {
      window.__sample1manStudioReview.deactivate();
    }
    document.documentElement.classList.remove("is-review-mode");
    document.body.classList.remove("is-review-mode", "review-view-fit", "hub-ui-studio");
    const chrome = document.getElementById("review-chrome");
    if (chrome) chrome.hidden = true;
    returnHubHome();
    placePreviewWidthControl();
  }

  function enterHubLayoutMode() {
    if (store.siteColorMode !== "detail") return;
    if (store.hubUiMode === "studio-review") {
      document.documentElement.classList.remove("is-review-mode");
      document.body.classList.remove("is-review-mode", "review-view-fit", "hub-ui-studio");
      const chrome = document.getElementById("review-chrome");
      if (chrome) chrome.hidden = true;
      if (
        window.__sample1manStudioReview &&
        typeof window.__sample1manStudioReview.deactivate === "function"
      ) {
        window.__sample1manStudioReview.deactivate();
      }
    }
    store.hubUiMode = "layout";
'@
if ($t.Contains("function enterHubStudioReview")) {
  Write-Host "studio enter already"
} elseif ($t.Contains($oldEnter)) {
  $t = $t.Replace($oldEnter, $newEnter)
  Write-Host "studio enter patched"
} else {
  Write-Host "WARN enterHubLayoutMode not found"
}

$utf8 = New-Object System.Text.UTF8Encoding $false
[IO.File]::WriteAllText($path, $t, $utf8)
Write-Host "script.js write done len=$($t.Length)"
