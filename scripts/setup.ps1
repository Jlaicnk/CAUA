# CAUA 首次环境配置脚本
# 用法: 双击根目录 setup.bat，或在 PowerShell 中执行: powershell -ExecutionPolicy Bypass -File scripts\setup.ps1
# 说明: 会创建 conda 环境、安装前后端依赖、初始化数据库。已在用环境直接运行也不会出问题（自动跳过已有数据）。

param(
    [string]$CondaEnv = "CAUA",
    [string]$CondaRoot = "C:\Users\35298\anaconda3"
)

$ErrorActionPreference = "Continue"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$BackendDir  = Join-Path $ProjectRoot "backend\t_cj_1"
$WebDir      = Join-Path $ProjectRoot "web"
$EnvDir      = Join-Path $CondaRoot "envs\$CondaEnv"
$Python      = Join-Path $EnvDir "python.exe"
$Npm         = Join-Path $EnvDir "npm.cmd"
$Conda       = Join-Path $CondaRoot "Scripts\conda.exe"

Write-Host "========== CAUA 环境配置 ==========" -ForegroundColor Cyan

if (-not (Test-Path $Conda)) {
    Write-Host "[错误] 未找到 conda: $Conda" -ForegroundColor Red
    Write-Host "       请安装 Anaconda 或修改 setup.ps1 中的 CondaRoot 参数。" -ForegroundColor Yellow
    exit 1
}

# ---------- 1/7 创建 conda 环境 ----------
if (-not (Test-Path $Python)) {
    Write-Host "[1/7] 创建 conda 环境 $CondaEnv (Python 3.10) ..." -ForegroundColor Cyan
    & $Conda create -n $CondaEnv python=3.10 -y
    if (-not (Test-Path $Python)) {
        Write-Host "[错误] conda 环境创建失败。" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[1/7] conda 环境 $CondaEnv 已存在，跳过创建。" -ForegroundColor Gray
}

# 让 node / npm 在子进程中可直接调用
$env:PATH = "$EnvDir;$env:PATH"

# ---------- 2/7 安装 Python 依赖 ----------
Write-Host "[2/7] 安装 Python 依赖 (django / drf / jwt / cors / mysqlclient) ..." -ForegroundColor Cyan
& $Python -m pip install django djangorestframework djangorestframework-simplejwt django-cors-headers mysqlclient

# ---------- 3/7 安装 Node.js ----------
Write-Host "[3/7] 安装 Node.js (通过 conda，安装到 $CondaEnv 环境) ..." -ForegroundColor Cyan
& $Conda install -n $CondaEnv -y nodejs

# ---------- 4/7 安装 Web 前端依赖 ----------
Write-Host "[4/7] 安装 Web 前端依赖 (npm install) ..." -ForegroundColor Cyan
Push-Location $WebDir
try {
    & $Npm install
    if (-not $?) {
        Write-Host "[错误] npm install 失败。" -ForegroundColor Red
        exit 1
    }
} finally {
    Pop-Location
}

# ---------- 5/7 数据库迁移 ----------
Write-Host "[5/7] 数据库迁移 (makemigrations + migrate) ..." -ForegroundColor Cyan
Push-Location $BackendDir
try {
    & $Python manage.py makemigrations accounts teams tournaments home
    & $Python manage.py migrate
} finally {
    Pop-Location
}

# ---------- 6/7 种子数据（仅空库时） ----------
Write-Host "[6/7] 生成种子数据 ..." -ForegroundColor Cyan
Push-Location $BackendDir
try {
    $hasData = (& $Python manage.py shell -c "from teams.models import Team; print(Team.objects.exists())" 2>$null | Select-Object -Last 1)
    if ($hasData -match "False") {
        & $Python seed_data.py
    } else {
        Write-Host "  数据库中已有数据，跳过种子脚本（如需重置可手动执行 seed_data.py）。" -ForegroundColor Gray
    }
} finally {
    Pop-Location
}

# ---------- 7/7 创建媒体目录 ----------
Write-Host "[7/7] 创建媒体目录 ..." -ForegroundColor Cyan
$mediaSubs = @("banners", "covers", "logos", "avatars", "songs", "videos", "tournament_icons")
foreach ($sub in $mediaSubs) {
    New-Item -ItemType Directory -Force -Path (Join-Path $BackendDir "media\$sub") | Out-Null
}

Write-Host ""
Write-Host "========== 配置完成 ==========" -ForegroundColor Green
Write-Host "请双击 start.bat 一键启动（后端 + 前端）。" -ForegroundColor Green
Write-Host "如需创建管理员账号，可在后台目录运行: python manage.py createsuperuser" -ForegroundColor Gray