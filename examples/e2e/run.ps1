param([ValidateSet('start','stop','test')][string]$Action='start', [switch]$Faults)
$ErrorActionPreference='Stop'
$repoPath=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../..'))
$dockerCommand=Get-Command docker -ErrorAction SilentlyContinue
$dockerPath=if($dockerCommand){$dockerCommand.Source}else{Join-Path $env:LOCALAPPDATA 'Programs/DockerDesktop/resources/bin/docker.exe'}
if(-not(Test-Path -LiteralPath $dockerPath)){throw 'Docker Desktop executable unavailable'}
if($Action -eq 'stop'){
    & $dockerPath stop --timeout 15 novlearn-m11-bench
    if($LASTEXITCODE -ne 0){throw 'Bench stop failed'}
    exit
}
$mounts=@{
    'dist'='/work/dist'; 'node_modules/@cortex-js'='/work/node_modules/@cortex-js'
    'package.json'='/work/package.json'; 'examples'='/work/examples'
    'tests'='/work/tests'; '.cache/linux-python'='/deps'
}
if($Action -eq 'start'){
    $mounts['docs/exercises_rows.json']='/work/docs/exercises_rows.json'
    $mounts['tools/mathlive/node_modules/mathlive']='/work/tools/mathlive/node_modules/mathlive'
}
$dockerArgs=@('run','--rm','--init','--memory','384m','--memory-swap','384m','--pids-limit','64','--read-only','--cap-drop','ALL','--security-opt','no-new-privileges','--user','65534:65534','--env','PYTHONPATH=/deps','--env','PYTHONDONTWRITEBYTECODE=1','--env','ENGINE_NODE=/usr/local/bin/node','--workdir','/work')
foreach($relative in $mounts.Keys){
    $sourcePath=Join-Path $repoPath $relative
    if(-not(Test-Path -LiteralPath $sourcePath)){throw "Missing bench input: $relative"}
    $dockerArgs+=@('--mount',"type=bind,source=$sourcePath,target=$($mounts[$relative]),readonly")
}
if($Action -eq 'start'){
    $artifactsPath=Join-Path $repoPath '.cache/e2e'
    New-Item -ItemType Directory -Path $artifactsPath -Force | Out-Null
    $dockerArgs+=@('--detach','--name','novlearn-m11-bench','--publish','127.0.0.1:4318:4318','--mount',"type=bind,source=$artifactsPath,target=/artifacts",'--env','E2E_ARTIFACTS=/artifacts')
    if($Faults){$dockerArgs+=@('--env','E2E_FAULTS=1')}
}else{$dockerArgs+=@('--network','none')}
$dockerArgs+=@('node:24.19.0-bookworm@sha256:4196d66a565c6f195728d9952f161f4adfe2ad753052a08b7ec7f1c5a6bda42b','python3')
if($Action -eq 'start'){$dockerArgs+=@('examples/e2e/server.py')}else{$dockerArgs+=@('-m','unittest','discover','-s','tests/integration/python','-p','test_*.py','-v')}
& $dockerPath @dockerArgs
if($LASTEXITCODE -ne 0){throw 'Bench command failed'}
