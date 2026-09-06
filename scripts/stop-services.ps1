# CAUA 停止服务脚本
# 用法: 双击根目录 stop.bat

$ErrorActionPreference = "Continue"

$PidDir = Join-Path $env:TEMP "caua"
$files = @((Join-Path $PidDir "django.pid"), (Join-Path $PidDir "web.pid"))

$found = $false
foreach ($f in $files) {
    if (Test-Path $f) {
        $procId = (Get-Content $f | Select-Object -First 1).Trim()
        if ($procId -match "^\d+$") {
            $proc = Get-Process -Id $procId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "正在停止进程 $procId ($($proc.ProcessName)) ..."
                & taskkill.exe /PID $procId /T /F 2>&1 | Out-Null
                $found = $true
            }
        }
        Remove-Item $f -ErrorAction SilentlyContinue
    }
}

if (-not $found) {
    Write-Host "未发现正在运行的 CAUA 服务（或 PID 文件不存在）。" -ForegroundColor Yellow
} else {
    Write-Host "CAUA 服务已全部停止。" -ForegroundColor Green
}