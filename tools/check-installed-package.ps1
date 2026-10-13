param([Parameter(Mandatory=$true)][string]$EngineArchive)
$ErrorActionPreference = 'Stop'
$repoPath = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$archivePath = (Resolve-Path -LiteralPath $EngineArchive).Path
if ([IO.Path]::GetExtension($archivePath) -ne '.tgz') { throw 'Expected a local package tarball' }
$archiveHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant()
$dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
$dockerPath = if ($dockerCommand) { $dockerCommand.Source } else { Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin/docker.exe' }
if (-not (Test-Path -LiteralPath $dockerPath)) { throw 'Docker Desktop executable unavailable' }
$artifacts = Join-Path $repoPath ('.cache/installed-package-' + [datetime]::UtcNow.ToString('yyyyMMddHHmmssfff'))
New-Item -ItemType Directory -Path $artifacts | Out-Null
$packages = @('./node_modules/@cortex-js/compute-engine','./node_modules/@arnog/colors','./node_modules/complex.js')
Push-Location $repoPath
try {
  $packedJson = & npm.cmd pack @packages --ignore-scripts --pack-destination $artifacts --json
  if ($LASTEXITCODE -ne 0) { throw 'Offline dependency packaging failed' }
} finally { Pop-Location }
$packed = $packedJson -join "`n" | ConvertFrom-Json
$dependencyMap = @{
  '@cortex-js/compute-engine' = '/archives/cortex.tgz'
  '@arnog/colors' = '/archives/colors.tgz'
  'complex.js' = '/archives/complex.tgz'
}
$mounts = @(@($archivePath,'/archives/engine.tgz'),@((Join-Path $PSScriptRoot 'installed-package-setup.mjs'),'/inputs/setup.mjs'),@((Join-Path $PSScriptRoot 'check-installed-package.mjs'),'/inputs/consumer.mjs'),@((Join-Path $repoPath 'tests/fixtures/legacy/adapted/78.definition.json'),'/inputs/definition.json'))
$dependencyProof = @()
foreach ($package in $packed) {
  if (-not $dependencyMap.ContainsKey($package.name)) { throw 'Unexpected offline dependency' }
  $path = Join-Path $artifacts $package.filename
  $mounts += ,@($path,$dependencyMap[$package.name])
  $dependencyProof += [pscustomobject]@{ name=$package.name; version=$package.version; sha256=(Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() }
}
if ($packed.Count -ne 3) { throw 'Missing offline dependencies' }
$image = 'node:24.19.0-bookworm@sha256:4196d66a565c6f195728d9952f161f4adfe2ad753052a08b7ec7f1c5a6bda42b'
$dockerArgs = @('--host','npipe:////./pipe/dockerDesktopLinuxEngine','run','--pull','never','--rm','--init','--network','none','--memory','384m','--memory-swap','384m','--pids-limit','64','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','65534:65534','--workdir','/consumer','--tmpfs','/consumer:rw,nosuid,nodev,noexec,size=192m,mode=1777')
foreach ($mount in $mounts) { $dockerArgs += @('--mount',"type=bind,source=$($mount[0]),target=$($mount[1]),readonly") }
$dockerArgs += @($image,'node','/inputs/setup.mjs')
$output = & $dockerPath @dockerArgs
if ($LASTEXITCODE -ne 0) { throw 'Installed package qualification failed' }
if ((Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash.ToLowerInvariant() -ne $archiveHash) { throw 'Tarball changed during qualification' }
$evidence = $output -join "`n" | ConvertFrom-Json
if ($evidence.status -ne 'pass') { throw 'Invalid qualification evidence' }
$proof = [pscustomobject]@{ schemaVersion=1; recordedAt=[datetime]::UtcNow.ToString('o'); archiveSha256=$archiveHash; image=$image; network='none'; dependencies=$dependencyProof; evidence=$evidence }
$proof | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath (Join-Path $artifacts 'proof.json') -Encoding UTF8
$proof | ConvertTo-Json -Depth 8
