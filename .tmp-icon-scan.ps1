$iconFile = 'src/components/Icon.tsx'
$iconContent = Get-Content -Raw -Path $iconFile
$mapKeys = [regex]::Matches($iconContent, "'([^']+)'\s*:") | ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique

$usageResults = @()
Get-ChildItem -Path 'src/components' -Filter '*.tsx' | ForEach-Object {
  $file = $_.FullName
  $rel = Resolve-Path -Relative $file
  $content = Get-Content -Raw -Path $file
  $tagMatches = [regex]::Matches($content, '<Icon\b(?<attrs>[^>]*)>', [System.Text.RegularExpressions.RegexOptions]::Singleline)
  foreach ($m in $tagMatches) {
    $attrs = $m.Groups['attrs'].Value
    $name = $null
    $namePatterns = @(
      'name\s*=\s*"([^"]+)"',
      "name\s*=\s*'([^']+)'",
      'name\s*=\s*\{\s*"([^"]+)"\s*\}',
      "name\s*=\s*\{\s*'([^']+)'\s*\}"
    )
    foreach ($p in $namePatterns) {
      $nm = [regex]::Match($attrs, $p)
      if ($nm.Success) { $name = $nm.Groups[1].Value; break }
    }
    if ($name) {
      $line = ($content.Substring(0, $m.Index) -split "`n").Count
      $usageResults += [pscustomobject]@{ File=$rel; Line=$line; IconName=$name }
    }
  }
}

$unmapped = $usageResults | Where-Object { $_.IconName -notin $mapKeys } | Sort-Object IconName, File, Line
Write-Output ("Mapped key count: {0}" -f $mapKeys.Count)
Write-Output ("Literal Icon usages found: {0}" -f $usageResults.Count)
Write-Output ("Unmapped literal icon usages: {0}" -f $unmapped.Count)
$unmapped | Format-Table -AutoSize
