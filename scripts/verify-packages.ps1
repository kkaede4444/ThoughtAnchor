$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
$projectRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$version = (Get-Content -LiteralPath (Join-Path $projectRoot 'package.json') -Raw | ConvertFrom-Json).version
$privatePattern = '(^|/)(\.local|\.git|node_modules|\.env[^/]*|workspace[^/]*\.json|keys(-native)?\.json[^/]*|secrets\.json[^/]*|sync-(native|commit)\.json[^/]*|password|[^/]*\.(jks|keystore|pfx|p12|pem|key))($|/)'
function Verify-Archive([string]$Archive, [string]$Source, [string]$Prefix) {
  $zip = [IO.Compression.ZipFile]::OpenRead((Join-Path $projectRoot $Archive))
  $files = @{}
  try {
    foreach ($entry in $zip.Entries) {
      $name = $entry.FullName.Replace('\', '/')
      if ($name -match $privatePattern -or $name -match '(^|/)\.\.(/|$)') { throw "Private/unsafe file in $Archive" }
      if ($files.ContainsKey($name)) { throw "Duplicate entry in $Archive" }
      $files[$name] = $entry
    }
    $root = (Resolve-Path -LiteralPath (Join-Path $projectRoot $Source)).Path
    $count = 0
    foreach ($file in Get-ChildItem -LiteralPath $root -Recurse -File) {
      $relative = $file.FullName.Substring($root.Length + 1).Replace('\', '/')
      $name = $Prefix + $relative
      if (-not $files.ContainsKey($name)) { throw "Missing $name in $Archive" }
      $stream = $files[$name].Open()
      $hash = [Security.Cryptography.SHA256]::Create()
      try { $actual = [BitConverter]::ToString($hash.ComputeHash($stream)).Replace('-', '') }
      finally { $stream.Dispose(); $hash.Dispose() }
      if ($actual -ne (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash) { throw "Changed $name in $Archive" }
      $count++
    }
    if ($Prefix -eq '' -and $count -ne $files.Count) { throw "Unexpected files in $Archive" }
    return @{ archive=$Archive; matchedFiles=$count; entries=$zip.Entries.Count }
  } finally { $zip.Dispose() }
}
$results = @(
  (Verify-Archive "release/ThoughtAnchor-$version-x64-portable.zip" 'out/native' ''),
  (Verify-Archive "release/ThoughtAnchor-$version-android.apk" 'out/renderer' 'assets/ui/')
)
$sourcePath = Join-Path $projectRoot "release/ThoughtAnchor-$version-source.zip"
if (Test-Path -LiteralPath $sourcePath) {
  $expected = @{}
  $tree = git -C $projectRoot -c core.quotepath=false ls-tree -r '--format=%(objectname) %(path)' HEAD
  if ($LASTEXITCODE -ne 0) { throw 'Cannot read committed source tree' }
  foreach ($line in $tree) { $expected["ThoughtAnchor-$version/" + $line.Substring(41)] = $line.Substring(0,40) }
  $zip = [IO.Compression.ZipFile]::OpenRead($sourcePath)
  $count = 0
  try {
    foreach ($entry in $zip.Entries) {
      $name = $entry.FullName.Replace('\', '/')
      if ($name.EndsWith('/')) { continue }
      if ($name -match $privatePattern -or -not $expected.ContainsKey($name)) { throw 'Uncommitted/private file in source archive' }
      $buffer = New-Object IO.MemoryStream
      $stream = $entry.Open()
      $hash = [Security.Cryptography.SHA1]::Create()
      try {
        $header = [Text.Encoding]::ASCII.GetBytes("blob $($entry.Length)`0")
        $buffer.Write($header,0,$header.Length); $stream.CopyTo($buffer); $buffer.Position = 0
        $actual = [BitConverter]::ToString($hash.ComputeHash($buffer)).Replace('-', '').ToLowerInvariant()
        if ($actual -ne $expected[$name]) { throw "Source archive differs from Git: $name" }
      } finally { $stream.Dispose(); $buffer.Dispose(); $hash.Dispose() }
      $expected.Remove($name); $count++
    }
    if ($expected.Count -ne 0) { throw 'Source files missing from archive' }
    $results += @{ archive="release/ThoughtAnchor-$version-source.zip"; matchedFiles=$count }
  } finally { $zip.Dispose() }
}
$commit = (git -C $projectRoot rev-parse HEAD).Trim()
$packages = @(Get-ChildItem -LiteralPath (Join-Path $projectRoot 'release') -File | Where-Object { $_.Name -like "ThoughtAnchor-$version-*" -and $_.Extension -in @('.apk','.exe','.zip') } | ForEach-Object { @{name=$_.Name;bytes=$_.Length;sha256=(Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant()} })
$report = @{version=$version;commit=$commit;checkedAt=[DateTimeOffset]::Now.ToString('o');archives=$results;packages=$packages}
$report | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $projectRoot "release/LOCAL_VERIFY-$version.json") -Encoding utf8
$results | ConvertTo-Json -Compress
