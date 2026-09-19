$path = Join-Path $PSScriptRoot "script.js"
$bytes = [IO.File]::ReadAllBytes($path)
$t = [Text.Encoding]::UTF8.GetString($bytes)
$n = if ($t.Contains("`r`n")) { "`r`n" } else { "`n" }
Write-Host "newline=$((if($n -eq "`r`n"){'CRLF'}else{'LF'})) len=$($t.Length)"

# Title
if ($t -notmatch 'title\.textContent = "制作・レビュー"') {
  $pattern = 'if \(mode === "layout"\) \{\s*title\.textContent = "レイアウト変更";\s*return;\s*\}\s*const step = STEPS\.find'
  $repl = @"
if (mode === `"layout`") {
      title.textContent = `"レイアウト変更`";
      return;
    }
    if (mode === `"studio-review`") {
      title.textContent = `"制作・レビュー`";
      return;
    }
    const step = STEPS.find
"@ -replace "`r?`n", $n
  $newt = [regex]::Replace($t, $pattern, $repl, 1)
  if ($newt -eq $t) { Write-Host "FAIL title regex" } else { $t = $newt; Write-Host "OK title" }
} else { Write-Host "skip title" }

# Insert studio functions before enterHubLayoutMode
if ($t -notmatch 'function enterHubStudioReview') {
  $insert = @"
  function isLocalStudioHost() {
    const h = location.hostname;
    return h === `"127.0.0.1`" || h === `"localhost`" || h === `"[::1]`";
  }

  function enterHubStudioReview() {
    if (!isLocalStudioHost()) return;
    hideEntryGate();
    setSampleFlowPreviewHidden(false);
    document.body.classList.remove(`"sample-flow-hide-preview`");
    store.intakeDone = true;
    store.easyFlowActive = false;
    store.siteColorMode = `"detail`";
    store.uiMode = `"self`";
    store.selfEditingStepId = `"layout`";
    store.hubUiMode = `"studio-review`";
    store.hubEntryRoute = null;
    store.hubPlacePickMode = false;
    store.hubPlaceSelectedBlockId = null;
    store.hubReturnBlockId = null;
    store.hubTaskId = null;
    document.documentElement.classList.add(`"is-review-mode`");
    document.body.classList.add(`"is-review-mode`");
    syncSiteColorModeUi();
    clearHubPlaceFit();
    syncDetailDashVisibility(`"layout`");
    syncHubEntryPanels();
    placeLookControls();
    placePreviewWidthControl();
    updateWizardUi();
    if (
      window.__sample1manStudioReview &&
      typeof window.__sample1manStudioReview.activate === `"function`"
    ) {
      window.__sample1manStudioReview.activate();
    }
  }

  function exitHubStudioReview() {
    if (
      window.__sample1manStudioReview &&
      typeof window.__sample1manStudioReview.deactivate === `"function`"
    ) {
      window.__sample1manStudioReview.deactivate();
    }
    document.documentElement.classList.remove(`"is-review-mode`");
    document.body.classList.remove(`"is-review-mode`", `"review-view-fit`", `"hub-ui-studio`");
    const chrome = document.getElementById(`"review-chrome`");
    if (chrome) chrome.hidden = true;
    returnHubHome();
    placePreviewWidthControl();
  }

  function enterHubLayoutMode() {
"@ -replace "`r?`n", $n
  if ($t.Contains("  function enterHubLayoutMode() {")) {
    $t = $t.Replace("  function enterHubLayoutMode() {", $insert)
    Write-Host "OK insert studio"
  } else {
    Write-Host "FAIL find enterHubLayoutMode"
  }
} else { Write-Host "skip studio insert" }

$utf8 = New-Object System.Text.UTF8Encoding $false
[IO.File]::WriteAllText($path, $t, $utf8)
Write-Host "wrote $($t.Length)"
