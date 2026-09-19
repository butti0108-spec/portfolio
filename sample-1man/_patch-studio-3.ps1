$path = Join-Path $PSScriptRoot "script.js"
$fragPath = Join-Path $PSScriptRoot "_frag-studio-enter.js"
$t = [IO.File]::ReadAllText($path)
$frag = [IO.File]::ReadAllText($fragPath)
$n = if ($t.Contains("`r`n")) { "`r`n" } else { "`n" }

# title
$needle = 'title.textContent = "レイアウト変更";' + $n + '      return;' + $n + '    }' + $n + '    const step = STEPS.find'
$insertTitle = 'title.textContent = "レイアウト変更";' + $n + '      return;' + $n + '    }' + $n + '    if (mode === "studio-review") {' + $n + '      title.textContent = "制作・レビュー";' + $n + '      return;' + $n + '    }' + $n + '    const step = STEPS.find'
if ($t.Contains('title.textContent = "制作・レビュー"')) {
  Write-Host "title ok"
} elseif ($t.Contains($needle)) {
  $t = $t.Replace($needle, $insertTitle)
  Write-Host "title patched"
} else {
  Write-Host "title FAIL"
  # debug nearby
  $i = $t.IndexOf('title.textContent = "レイアウト変更"')
  Write-Host "idx=$i"
  if ($i -ge 0) { Write-Host ($t.Substring($i, [Math]::Min(120, $t.Length-$i)) -replace "`r","<CR>" -replace "`n","<LF>" ) }
}

# studio enter
$marker = "  function enterHubLayoutMode() {"
if ($t.Contains("function enterHubStudioReview")) {
  Write-Host "studio ok"
} elseif ($t.Contains($marker)) {
  $t = $t.Replace($marker, $frag.TrimEnd() + $n + $n + $marker)
  Write-Host "studio patched"
} else {
  Write-Host "studio FAIL"
}

[IO.File]::WriteAllText($path, $t, (New-Object System.Text.UTF8Encoding $false))
Write-Host "done"
