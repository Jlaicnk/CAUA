# CAUA 一键启动脚本
# 用法: 双击根目录 start.bat，或在 PowerShell 中执行: powershell -ExecutionPolicy Bypass -File scripts\start-services.ps1

param(
    [string]$CondaEnv = "CAUA",
    [string]$CondaRoot = "C:\Users\35298\anaconda3",
    [string]$MysqlService = "MySQL97",
    [int]$DjangoPort = 8000,
    [int]$WebPort = 5173
)

$ErrorActionPreference = "Continue"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir  = Join-Path $ProjectRoot "backend\t_cj_1"
$WebDir      = Join-Path $ProjectRoot "web"
$EnvDir      = Join-Path $CondaRoot "envs\$CondaEnv"
$Python      = Join-Path $EnvDir "python.exe"
$Npm         = Join-Path $EnvDir "npm.cmd"
$PidDir      = Join-Path $env:TEMP "caua"

if (-not (Test-Path $Python)) {
    Write-Host "[错误] 未找到 conda 环境: $EnvDir" -ForegroundColor Red
    Write-Host "       请先运行 setup.bat，或检查 start.bat 中的 CONDA_ENV / CONDA_ROOT 配置。" -ForegroundColor Yellow
    exit 1
}

# 让 node / npm 在子进程中可直接调用
$env:PATH = "$EnvDir;$env:PATH"

New-Item -ItemType Directory -Force -Path $PidDir | Out-Null

# ---------- 1/4 检查 MySQL ----------
Write-Host "[1/4] 检查 MySQL 服务 ($MysqlService) ..." -ForegroundColor Cyan
$svc = Get-Service -Name $MysqlService -ErrorAction SilentlyContinue
if (-not $svc) {
    Write-Host "  警告: 未找到 MySQL 服务 $MysqlService，请先启动 MySQL 后再试。" -ForegroundColor Yellow
} elseif ($svc.Status -ne "Running") {
    Write-Host "  正在启动 MySQL 服务 ..." -ForegroundColor Gray
    try {
        Start-Service -Name $MysqlService -ErrorAction Stop
        Write-Host "  MySQL 已启动。" -ForegroundColor Green
    } catch {
        Write-Host "  启动失败(可能需要以管理员身份运行): $($_.Exception.Message)" -ForegroundColor Yellow
    }
} else {
    Write-Host "  MySQL 已在运行。" -ForegroundColor Green
}

# ---------- 2/4 启动 Django 后端 ----------
Write-Host "[2/4] 启动 Django 后端 (http://127.0.0.1:$DjangoPort) ..." -ForegroundColor Cyan
$djangoCmd = "chcp 65001 >nul && title CAUA-Django && cd /d `"$BackendDir`" && `"$Python`" manage.py runserver 0.0.0.0:$DjangoPort"
$djangoProc = Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $djangoCmd) -PassThru
$djangoProc.Id | Out-File (Join-Path $PidDir "django.pid") -Encoding ascii

# ---------- 3/4 启动 Web 前端 ----------
Write-Host "[3/4] 启动 Web 前端 (http://127.0.0.1:$WebPort) ..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $WebDir "node_modules"))) {
    Write-Host "  警告: web/node_modules 不存在，请先运行 setup.bat 安装前端依赖。" -ForegroundColor Yellow
} else {
    $webCmd = "chcp 65001 >nul && title CAUA-Web && cd /d `"$WebDir`" && `"$Npm`" run dev"
    $webProc = Start-Process -FilePath "cmd.exe" -ArgumentList @("/k", $webCmd) -PassThru
    $webProc.Id | Out-File (Join-Path $PidDir "web.pid") -Encoding ascii
}

# ---------- 4/4 等待并打开浏览器 ----------
Write-Host "[4/4] 等待服务就绪，即将打开浏览器 ..." -ForegroundColor Cyan
Start-Sleep -Seconds 6

$djangoReady = $false
$webReady = $false
for ($i = 0; $i -lt 10; $i++) {
    if (-not $djangoReady) {
        try { $r = Invoke-WebRequest -Uri "http://127.0.0.1:$DjangoPort/api/home/" -UseBasicParsing -TimeoutSec 3; $djangoReady = ($r.StatusCode -eq 200) } catch {}
    }
    if (-not $webReady) {
        try { $r2 = Invoke-WebRequest -Uri "http://127.0.0.1:$WebPort/" -UseBasicParsing -TimeoutSec 3; $webReady = ($r2.StatusCode -eq 200) } catch {}
    }
    if ($djangoReady -and $webReady) { break }
    Start-Sleep -Seconds 2
}

if ($djangoReady) {
    Write-Host "  Django 后端 已就绪 ✔" -ForegroundColor Green
} else {
    Write-Host "  Django 后端 未就绪（请查看 CAUA-Django 窗口日志）✘" -ForegroundColor Red
}
if ($webReady) {
    Write-Host "  Web 前端   已就绪 ✔" -ForegroundColor Green
    Start-Process "http://127.0.0.1:$WebPort/"
} else {
    Write-Host "  Web 前端   未就绪（请查看 CAUA-Web 窗口日志）✘" -ForegroundColor Red
}

Write-Host ""
Write-Host "服务已启动，日志见弹出的 CAUA-Django / CAUA-Web 窗口" -ForegroundColor Green
Write-Host "  Web 前端 : http://127.0.0.1:$WebPort/"
Write-Host "  Django   : http://127.0.0.1:$DjangoPort/api/"
Write-Host "  管理后台 : http://127.0.0.1:$DjangoPort/admin/"
Write-Host ""
Write-Host "停止服务请运行 stop.bat（或直接关闭两个服务窗口）。"