# CAUA - 二次元足球赛事平台

一个融合二次元动漫角色与足球竞技的赛事查看平台，包含 Web 前端和 Django 后端。

> Android 客户端**已停更**，仓库中相关内容仅作历史参考，不再维护。

---

## 一键启动（本机快速体验）

> 需要已安装 Anaconda + MySQL，且已运行过一次 `setup.bat`。

| 脚本 | 作用 |
|------|------|
| `setup.bat` | 首次配置：创建 conda 环境、安装前后端依赖、初始化数据库（已有数据会自动跳过） |
| `start.bat` | 一键启动：确保 MySQL 运行 → 启动 Django 后端(8000) → 启动 Web 前端(5173) → 打开浏览器 |
| `stop.bat` | 一键停止所有服务 |

启动后访问：
- Web 前端：`http://127.0.0.1:5173/`
- Django API：`http://127.0.0.1:8000/api/`
- Django Admin：`http://127.0.0.1:8000/admin/`

> 脚本默认配置：conda 环境 `CAUA`、MySQL 服务 `MySQL97`、数据库 `django_kg`。
> 如需自定义，可直接编辑 `scripts\start-services.ps1` / `scripts\setup.ps1` 顶部的参数。

---

## 目录

- [项目结构](#项目结构)
- [后端搭建 (Django)](#后端搭建-django)
- [Android 客户端搭建](#android-客户端搭建)
- [Web 前端搭建](#web-前端搭建)
- [API 接口文档](#api-接口文档)
- [常见问题](#常见问题)

---

## 项目结构

```
CAUA/
├── app/                              # Android 客户端
│   └── src/main/                    # Android 已停更（历史参考）
│       ├── java/com/example/t/
│       │   ├── data/                 # 数据层
│       │   │   ├── api/              # Retrofit 接口
│       │   │   ├── local/            # DataStore Token 管理
│       │   │   ├── model/            # 数据模型
│       │   │   └── repository/       # 数据仓库
│       │   ├── ui/                   # 界面层
│       │   │   ├── home/             # 首页
│       │   │   ├── events/           # 赛事
│       │   │   │   ├── schedule/     # 赛程
│       │   │   │   └── tournaments/  # 赛事列表+详情
│       │   │   ├── teams/            # 队伍
│       │   │   │   ├── detail/       # 队伍详情
│       │   │   │   └── player/       # 队员详情
│       │   │   └── profile/          # 我的主页
│       │   │       └── login/        # 登录注册
│       │   ├── util/                 # 工具类
│       │   └── MainActivity.kt
│       └── res/
│           ├── layout/               # 布局文件
│           ├── drawable/             # 图标和图片
│           ├── navigation/           # 导航图
│           ├── menu/                 # 菜单
│           ├── values/               # 颜色、主题、字符串
│           └── anim/                 # 动画
├── web/                              # Web 前端 (React + Vite)
│   └── src/
│       ├── api/                      # axios 接口封装
│       ├── components/               # 公共组件（BracketView 瑞士轮对阵图、DoubleElimBracket 双败双轨图、KnockoutBracket 淘汰赛路径图、HonorWall 荣誉墙、CompareRadar 对比雷达、SimulatorModal 本地推演、LeagueSchedule/LeagueDayPanel 联赛模块）
│       ├── context/                  # 登录态管理
│       ├── pages/                    # 页面
│       ├── styles/                   # 全局样式
│       ├── utils/                    # 工具函数（含 qualifier.js 瑞士轮配对逻辑镜像）
│       ├── App.jsx                   # 布局与路由
│       ├── main.jsx                  # 入口
│       └── theme.js                  # antd 主题
├── backend/
│   └── t_cj_1/                       # Django 后端
│       ├── config/                   # Django 配置
│       ├── accounts/                 # 用户模块
│       ├── teams/                    # 队伍模块
│       ├── tournaments/              # 赛事模块（swiss.py 晋级瑞士轮、round_robin.py 单循环联赛、knockout.py 单败淘汰赛、double_elim.py 双败淘汰，含队伍/队员荣誉模型）
│       ├── home/                     # 首页模块
│       ├── manage.py
│       └── seed_data.py              # 种子数据脚本
└── gradle/                           # Gradle 构建工具
```

---

## 后端搭建 (Django)

### 环境要求

| 软件 | 版本 |
|------|------|
| Python | 3.10+ |
| MySQL | 8.0+ |
| pip | 最新版 |

### 安装步骤

#### 1. 安装 Python 依赖

```bash
pip install django djangorestframework djangorestframework-simplejwt django-cors-headers mysqlclient
```

> 安装完毕后建议保存依赖列表：
> ```bash
> pip freeze > requirements.txt
> ```
> 其他人克隆项目后可以用 `pip install -r requirements.txt` 一键安装。

#### 2. 安装 MySQL

- Windows: 下载 [MySQL Installer](https://dev.mysql.com/downloads/installer/) 安装
- macOS: `brew install mysql`
- Linux: `sudo apt install mysql-server`

#### 3. 创建数据库

```bash
# 登录 MySQL
mysql -u root -p

# 创建数据库
CREATE DATABASE django_kg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# 退出
EXIT;
```

#### 4. 配置数据库连接

编辑 `backend/t_cj_1/config/settings.py`，找到 `DATABASES` 配置：

```python
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.mysql",
        "NAME": "django_kg",           # 数据库名
        "USER": "root",                # 你的 MySQL 用户名
        "PASSWORD": "你的密码",         # 改成你的 MySQL 密码
        "HOST": "localhost",
        "PORT": "3306",
        "OPTIONS": {"charset": "utf8mb4"},
    }
}
```

#### 5. 运行数据库迁移

```bash
cd backend/t_cj_1
python manage.py makemigrations accounts teams tournaments home
python manage.py migrate
```

#### 6. 生成种子数据

```bash
python seed_data.py
```

这会创建 64 支队伍和对应的 704 名队员（每队 11 人），并创建 3 个赛事（各 32 支参赛队）。赛事采用「晋级瑞士轮」赛制：先取得 3 胜的队伍晋级 16 强，累计 3 负的队伍出局。种子脚本会把赛事重置为初始状态，并为「动漫世界杯」预生成第 1 轮对阵（待管理员填写比分）。

> 「动漫世界杯」额外启用了「**瑞士轮 + 淘汰赛**」赛制：瑞士轮决出 16 强后进入单败淘汰赛（16 强 → 8 强 → 半决赛 → 决赛 + 季军赛）；其余赛事仅瑞士轮。

> 说明：瑞士轮的赛程并非一次性生成全部，而是**按轮推进**——每轮比完、由管理员录入比分后，系统再自动生成下一轮对阵。推进操作在 Django Admin 中完成（见下文）。

#### 7. 创建管理员账户（可选）

```bash
python manage.py createsuperuser
```

用于访问 Django Admin 后台：`http://127.0.0.1:8000/admin/`

#### 8. 启动服务

```bash
python manage.py runserver 0.0.0.0:8000
```

> **重要**: 必须使用 `0.0.0.0:8000`，不能只用 `runserver`（默认仅监听 127.0.0.1）

#### 9. 在 Admin 中推进赛事（瑞士轮）

瑞士轮赛程按轮生成，管理员在 Django Admin (`http://127.0.0.1:8000/admin/`) 的「赛事」页操作：

- **单场比分**：在赛事详情页的 Match 内联表单里填写每场的 `home_score` / `away_score`（比分不能相同，晋级赛制无平局）
- **① 开始赛事**：重置并生成第 1 轮对阵
- **② 推进（结算当前轮并生成下一轮）**：读取已填比分 → 判定晋级/出局 → 自动生成下一轮对阵
- **③ 重置赛事**：清空赛程与战绩，恢复未开始状态

每轮对阵由系统从「仍在竞争中的队伍」自动配对（同战绩优先、已交手不重复）。当晋级队伍数达到参赛队一半时，赛事自动结束。

**淘汰赛阶段（勾选「瑞士轮后接单败淘汰赛」的赛事）**：
- 瑞士轮结束后自动生成淘汰赛（32 队赛事晋级 16 强，16 队赛事晋级 8 强），或使用 action「**Ⓚ 生成淘汰赛阶段**」手动生成
- 晋级队按**积分榜排名**作种子 1~N；首轮上半区对下半区（32→16 为 `1vs9 / 2vs10 … 8vs16`，16→8 为 `1vs5 / 2vs6 … 4vs8`），后续为固定 bracket
- 单败淘汰：胜者晋级、负者出局；每场继续结算积分
- 决赛 + 季军赛结束后赛事完成，生成**最终排行榜**（前 4 名=冠军/亚军/季军/殿军；其余名次按胜场→败场→积分→编号排序）

> 淘汰赛规模会按晋级人数自动缩放：**32 队瑞士轮 → 16 强**（1/8 决赛 → 1/4 决赛 → 半决赛 → 决赛+季军赛）；**16 队瑞士轮 → 8 强**（1/4 决赛 → 半决赛 → 决赛+季军赛）。轮次名称、对阵图形和最终排行（1~32 或 1~16）都会按实际参赛队数自动生成。

**双败淘汰（`format` 选「双败淘汰」）**：
- 需要恰好 **16 支参赛队**；开局按全局积分作种子
- 胜者组/败者组按比赛日自动推进：D1 胜者组 16 强 → D2 胜者组 8 强 + 败者组 R1 → D3 败者组 R2 → D4 胜者组半决赛 + 败者组 R3 → D5 败者组 R4 → D6 胜者组决赛 + 败者组 R5 → D7 败者组决赛 → D8 总决赛，共 **30 场、最多 8 个比赛日**
- 输一场掉入败者组、败者组再输一场出局；每场必须分胜负并逐场结算积分
- 总决赛结束后生成 **1~16 完整名次**：冠军/亚军来自总决赛，3/4 名来自败者组淘汰顺序，5~16 名按「本次赛事净积分 → 胜场 → 种子号」段内排开，无并列
- Web 赛事页提供双败「胜者组 + 败者组」双轨对阵图，并支持纯本地双败推演

#### 10. 创建媒体目录

```bash
mkdir media/banners media/covers media/logos media/avatars media/songs media/videos media/tournament_icons media/honors
```

#### 11. 上传媒体文件

通过 Django Admin (`http://127.0.0.1:8000/admin/`) 上传以下内容：

| 模块 | 内容 | 上传路径 |
|------|------|----------|
| 队伍 | 队标图片 | `logos/` |
| 队员 | 头像图片 | `avatars/` |
| 队伍 | 队歌音频 | `songs/` |
| 赛事 | 赛事图标 | `tournament_icons/` |
| 首页 | Banner 图片 | `banners/` |
| 首页 | 视频封面 | `covers/` |
| 首页 | 视频文件 | `videos/` |
| 队伍/队员 | 荣誉墙（殿堂级荣誉专属图片） | `honors/` |

---

## Android 客户端搭建（已停更）

> 注意：本部分为历史内容，Android 客户端已停止维护与更新，以下步骤仅供回顾参考。

### 环境要求

| 软件 | 版本 |
|------|------|
| Android Studio | Hedgehog (2023.1.1) 或更新 |
| JDK | 21（推荐 Microsoft OpenJDK 21） |
| Android SDK | API 36+ |
| Gradle | 项目自带 |
| MuMu 模拟器 | 12.x（或 Android 官方模拟器） |

### 安装步骤

#### 1. 安装 Android Studio

从 [developer.android.com/studio](https://developer.android.com/studio) 下载安装。

#### 2. 配置 JDK 21

如果用 MuMu 模拟器的电脑，推荐安装 Microsoft OpenJDK 21：

```bash
winget install Microsoft.OpenJDK.21
```

安装路径通常为：`C:\Program Files\Microsoft\jdk-21.x.x.x-hotspot`

在 Android Studio 中设置：
- **File → Project Structure → SDK Location → JDK location**
- 选择 JDK 21 安装路径

#### 3. 打开项目

1. 打开 Android Studio
2. 选择 **Open** → 选择项目根目录（含 `build.gradle.kts` 的文件夹）
3. 等待 Gradle 同步完成

#### 4. 配置网络

编辑 `app/src/main/java/com/example/t/data/api/RetrofitClient.kt`：

```kotlin
private const val BASE_URL = "http://127.0.0.1:8000/"
```

| 场景 | BASE_URL | 说明 |
|------|----------|------|
| MuMu + ADB reverse | `http://127.0.0.1:8000/` | 需要设置 ADB 转发 |
| MuMu + 局域网 | `http://你的局域网IP:8000/` | 如 `http://172.20.10.2:8000/` |
| 官方模拟器 (AVD) | `http://10.0.2.2:8000/` | 官方模拟器内置映射 |

#### 5. 设置 ADB 转发（使用 MuMu 模拟器时）

```bash
# 1. 连接 MuMu 的 ADB（端口号查看 MuMu 设置 → 其他设置，以实际显示为准）
#    注意：adb 路径以 MuMu 实际安装位置为准，默认在安装目录的 nx_main 子目录
"F:\Program Files\Netease\MuMu\nx_main\adb.exe" connect 127.0.0.1:16384

# 2. 设置反向代理
"F:\Program Files\Netease\MuMu\nx_main\adb.exe" -s 127.0.0.1:16384 reverse tcp:8000 tcp:8000
```

#### 6. 编译运行

1. 连接模拟器或真机
2. 点击 Android Studio 的 **Run** 按钮
3. 或使用命令行：

```bash
.\gradlew.bat assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

#### 7. Windows 防火墙配置（如果模拟器无法连接）

以管理员身份运行：

```bash
netsh advfirewall firewall add rule name="Django 8000" dir=in action=allow protocol=TCP localport=8000
```

---

## Web 前端搭建

### 环境要求

| 软件 | 版本 |
|------|------|
| Node.js | 18+（推荐 20+） |
| npm | 随 Node.js 附带 |

### 安装步骤

#### 1. 安装依赖

```bash
cd web
npm install
```

#### 2. 配置 API 地址

编辑 `web/.env`：

```
VITE_API_BASE_URL=http://127.0.0.1:8000/api/
```

| 场景 | 值 | 说明 |
|------|-----|------|
| 本机浏览器 | `http://127.0.0.1:8000/api/` | 直接访问本机后端 |
| 局域网访问 | `http://你的局域网IP:8000/api/` | 手机/其他设备访问 |

> 注意：Django 需用 `0.0.0.0:8000` 启动，且后端已开启 CORS（默认 `CORS_ALLOW_ALL_ORIGINS = True`）。

#### 3. 启动开发服务器

```bash
npm run dev
```

浏览器访问 `http://127.0.0.1:5173/`。

#### 4. 生产构建

```bash
npm run build
```

构建产物在 `web/dist/`，可部署到任意静态服务器，或由 Django 托管。

### 技术栈

| 技术 | 说明 |
|------|------|
| React 18 | UI 框架 |
| Vite 5 | 构建工具 |
| Ant Design 5 | 组件库 |
| React Router 6 | 路由（按页面懒加载） |
| Axios | 网络请求（自动携带 JWT，401 自动刷新） |

### 页面与路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | Banner 轮播 + 今日焦点 + 近期赛事 + 视频流 + 队伍 Top5 |
| `/schedule` | 赛程 | 按赛事筛选，按状态分组 |
| `/tournaments` | 赛事列表 | 赛事状态标签 |
| `/tournaments/:id` | 赛事详情 | 简介/规则 + 对阵图（瑞士轮/单循环/双败按赛制切换）+ 淘汰赛/双败对阵图 + 队伍状态/最终排行榜 + 本地模拟推演（瑞士轮与双败均支持）；单循环赛事另含「今日队伍积分变动」 |
| `/matches/:id` | 比赛详情 | 两队/比分/积分变动 + 两队近期交手记录（最近5场，无则暂无） |
| `/teams` | 队伍排行榜 | 前三名领奖台（第一/第二/第三）+ 完整排名（按积分） |
| `/teams/:id` | 队伍详情 | 主视觉 + 荣誉墙 + 积分榜排名 + 队歌播放 + 近期10场战绩（对手头像+积分折线图）+ 队员网格 |
| `/players/:id` | 队员详情 | 角色档案卡 + 荣誉墙 + 六维雷达与能力明细 |
| `/players/compare` | 球员对比 | 双人卡 + 雷达叠加 + 六维/细分能力对向条 + 综合结论 + 荣誉对比（`?a=<id>&b=<id>` 可分享） |
| `/profile` | 我的 | 头像上传 / 主队 / 登录注册入口 |
| `/login` `/register` | 登录 / 注册 | |
| `/favorite-team` | 选择主队 | |

---

## API 接口文档

### 基础 URL

```
http://127.0.0.1:8000/api/
```

### 认证

使用 JWT (JSON Web Token) 认证。

**请求头**：
```
Authorization: Bearer <access_token>
```

### 接口列表

#### 用户认证

| 方法 | 路径 | 说明 | 是否需要认证 |
|------|------|------|------------|
| POST | `/api/auth/login/` | 登录 | 否 |
| POST | `/api/auth/register/` | 注册 | 否 |
| POST | `/api/auth/refresh/` | 刷新 Token | 否 |
| GET  | `/api/auth/profile/` | 获取个人信息 | 是 |
| PUT  | `/api/auth/profile/` | 更新个人信息 | 是 |
| POST | `/api/auth/profile/favorite-team/` | 选择主队 | 是 |

#### 队伍

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/teams/` | 队伍列表（按积分降序的排行榜，含 `leaderboard_rank` 积分榜名次） |
| GET | `/api/teams/{id}/` | 队伍详情（含队员、`honors` 荣誉墙、积分、`leaderboard_rank` 积分榜名次） |
| GET | `/api/teams/{id}/history/` | 队伍近期战绩（最近 10 场比赛结果 + 积分变动流水/折线数据） |

#### 队员

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/players/{id}/` | 队员详情（含六维能力与 `honors` 荣誉墙） |
| GET | `/api/players/` | 球员搜索/筛选（`search` 名字或队伍、`position` 位置、`team` 队伍、`ordering=-overall`、`limit`），用于对比页选人 |

#### 赛事

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/tournaments/` | 赛事列表 |
| GET | `/api/tournaments/{id}/` | 赛事详情（含赛制 format、`phase` 当前阶段、`knockout_after_swiss` 是否后接淘汰赛、rounds、current_round、晋级/淘汰/存活计数） |
| GET | `/api/tournaments/{id}/standings/` | 积分榜/队伍状态；赛事结束后返回最终排行（含 `net_points` 本次赛事净积分；双败为 1~16，瑞士轮+淘汰赛按参赛规模为 1~16 / 1~32） |
| GET | `/api/tournaments/{id}/bracket/` | 淘汰赛对阵图（各轮次对阵与结果） |
| GET | `/api/tournaments/{id}/day-changes/` | 最新已完赛一轮的比赛 + 每队积分变动（联赛「今日队伍积分变动」数据源；无完赛场次则 `round: null`） |
| GET | `/api/matches/` | 赛程列表 |
| GET | `/api/matches/?tournament={id}` | 按赛事筛选赛程 |
| GET | `/api/matches/{id}/` | 比赛详情 |
| GET | `/api/matches/{id}/history/` | 两队近期交手记录（最近5场，不含本场）+ 本场两队积分变动 |

#### 首页

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/home/` | 首页数据（Banner + 视频流） |

### 登录示例

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username": "test", "password": "123456"}'
```

返回：

```json
{
    "access": "eyJhbGciOiJIUzI1NiIs...",
    "refresh": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

## 常见问题

### Q1: 模拟器访问不到 Django

**检查清单**：

1. Django 是否用 `0.0.0.0:8000` 启动？（不能只用 `runserver`）
2. Windows 防火墙是否放行 8000 端口？
3. 如果使用 MuMu 模拟器，`10.0.2.2` **不可用**，需要用 ADB reverse 或局域网 IP

```bash
# 查看 Django 监听地址（Windows）
netstat -ano | findstr ":8000"
# 或者（macOS / Linux）
# netstat -tlnp | grep 8000
# 如果显示 127.0.0.1:8000 说明只监听了本机，需要改为 0.0.0.0:8000
```

### Q2: App 显示"加载失败"

1. 查看具体错误信息（App 会显示详细错误）
2. 如果显示 `CLEARTEXT communication not permitted` → 检查 `app/src/main/res/xml/network_security_config.xml` 是否包含当前 IP
3. 如果显示 `Unable to resolve host` → 检查网络连接
4. 如果显示 `Connection refused` → Django 未启动或端口不对

### Q3: 安卓打包 App 图标不显示

App 图标配置在以下两个文件中：

- `res/mipmap-anydpi/ic_launcher.xml`（方形图标）
- `res/mipmap-anydpi/ic_launcher_round.xml`（圆形图标）

替换图标：

1. 准备一张 PNG 图片（建议 1024x1024）
2. 放到 `res/drawable/app_icon.png`
3. 修改上述两个 XML 文件的 `foreground` 指向你的图片

### Q4: 队伍/队员/赛事数据显示不全

这是 `RecyclerView` 嵌套在 `ScrollView` 中的已知问题。

**修复方法**：改用 `LinearLayout` + `addView()` 动态添加条目。

```kotlin
// 不要用 RecyclerView
layout.addView(itemView)  // 直接添加到 LinearLayout
```

### Q5: 点击底部 Tab 后停留在子页面不回退

已在代码中修复：`MainActivity.kt` 使用 `setOnItemSelectedListener` + `NavOptions.popUpTo`，切换 Tab 时自动清空回退栈。

### Q6: 歌曲/视频播放不了

1. **队歌播放**：使用 ExoPlayer + OkHttpDataSource，走 ADB reverse，确保 `media/songs/` 有音频文件
2. **首页视频**：使用 ExoPlayer 原生播放器（`VideoPlayerActivity`），检查视频是否上传到 `media/videos/`
3. 注意：已从 B 站 WebView 方案改为本地上传视频方案，不再加载外部链接
4. 确保 Django media URL 可访问：`http://127.0.0.1:8000/media/xxx.mp4`

### Q7: Gradle 构建报 OutOfMemoryError

编辑 `gradle.properties`：

```properties
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
```

如果内存不够，降低到 1024m：

```properties
org.gradle.jvmargs=-Xmx1024m -Dfile.encoding=UTF-8
```

### Q8: 数据库密码在哪改

编辑 `backend/t_cj_1/config/settings.py` 第 76 行：

```python
"PASSWORD": "189206",  # 改成你的密码
```

### Q9: 瑞士轮怎么推进 / 对阵怎么生成

瑞士轮不是一次性生成全部赛程，而是按轮推进：

1. 进入 Django Admin → 赛事，点击 action「**① 开始赛事**」生成第 1 轮
2. 在赛事详情页的 Match 内联表单填写每场比分（比分**不能相同**，赛制无平局）
3. 点击「**② 推进**」——系统结算当前轮比分、判定晋级/出局，并自动生成下一轮
4. 重复直到全部结束

每轮由系统从「仍在竞争中的队伍」自动配对：**同战绩优先 + 已交手不重复**。队伍累计 3 胜→晋级，3 负→出局；晋级数达参赛队一半时结束。<br>
前端用户可在赛事详情页的「**本地模拟推演**」按钮里，用同一套规则自由模拟一局（纯本地、不写库）。

### Q10: 队伍积分（Elo）是怎么算的 / 怎么重置

- 每支队伍初始 **1000 分**，全局累计，**积分决定排行榜**（同分用原 `rank` 破平）。
- 每场比分结算后**即时零和转移**：赢家从输家拿分，赢 +x、输 -x。转移量按两队分差与强弱决定（弱队爆冷赢强队可多拿 7%）：
  - 分差 <150：取输家 5%（上限 50）
  - 分差 <300：强赢取弱队 5%（上限 40）｜弱赢取强队 7%（上限 60）
  - 分差 <500：强赢取弱队 3%（上限 20）｜弱赢取强队 7%（上限 80）
  - 分差 ≥500：强赢取弱队 1% ｜弱赢取强队 7%（无上限）
- 每场结算与手动调整都会写入**积分流水**（队伍详情页可看最近 10 场战绩与积分折线图）。
- Admin 可直接编辑队伍积分，或在队伍列表用 action「**重置所选队伍积分为 1000**」批量复位。

### Q11: 淘汰赛怎么进行 / 最终排名怎么算

启用「瑞士轮 + 淘汰赛」的赛事（如动漫世界杯），瑞士轮决出**参赛队的一半**后进入单败淘汰赛：32 队赛事决出 16 强，**16 队赛事决出 8 强**；轮次名称、对阵图形与最终名次都会按实际规模自动调整：

- 晋级队按积分榜排名作种子 1~N；首轮上半区对下半区（32→16 为 `1vs9 / 2vs10 … 8vs16`，16→8 为 `1vs5 / 2vs6 … 4vs8`）
- 后续固定 bracket：逐轮减半，最后是**决赛 + 季军赛**（半决赛两个负者打季军战）；16 强赛事为 1/8 决赛 → 1/4 决赛 → 半决赛 → 决赛，8 强赛事为 1/4 决赛 → 半决赛 → 决赛
- 单败淘汰：胜者晋级、负者出局；每场继续按零和规则结算积分
- 决赛 + 季军赛结束后赛事完成，生成**最终排行榜**：
  - 前 4 名 = 冠军（决赛胜者）、亚军（决赛负者）、季军（季军赛胜者）、殿军（季军赛负者）
  - 其余名次按：胜场多 → 败场少 → 积分多 → 队伍编号小 排序

未勾选「瑞士轮后接淘汰赛」的赛事（如次元杯、新春邀请赛）瑞士轮决出参赛队一半（32 队→16 强、16 队→8 强）即结束，不进入淘汰赛。

> **单循环联赛（循环赛赛制）**：`format` 选「循环赛」的赛事为 **8 队单循环**，每轮 4 场、共 7 轮 28 场（轮转法自动配对，无重复交手）。推进方式与瑞士轮一致：① 开始赛事（要求恰好 8 支参赛队）→ 逐轮在 Match 内联表单填比分 → ② 推进，第 7 轮结算后赛事自动结束。积分同样**逐场即时结算**（比分不能相同、无平局）。联赛无晋级/淘汰与排行榜，Web 赛事详情页展示「单循环赛程」对阵板与「**今日队伍积分变动**」模块（只显示最新已完赛一轮的 4 场比赛及每队 ±积分，点比分区可进比赛详情、点队伍进队伍详情）。此类赛事需在 Admin 手动创建并添加 8 个参赛队。

### Q12: 单循环联赛怎么跑 / 怎么看

单循环联赛固定 8 支队伍单循环：

1. 在 Admin 新建赛事，赛制选「循环赛」（`format`），并添加 **8 个**参赛队（开始时会校验恰好 8 队）
2. 「① 开始赛事」生成第 1 轮（4 场，轮转法配对）→ 逐轮填比分（无平局，填完即时结算积分）→ 「② 推进」
3. 第 7 轮结算后赛事自动结束，不进入淘汰赛、也不生成排行榜

Web 赛事详情页展示「单循环赛程」对阵板；下方「**今日队伍积分变动**」只显示最新已完赛一轮的 4 场比赛与每队 ±积分——打到第几轮就显示第几轮，全部结束后仍停留最后一轮。

### Q13: 双败淘汰怎么跑 / 最终排名怎么排

1. 在 Admin 新建赛事，赛制选「双败淘汰」（`format`），并添加恰好 **16 个**参赛队
2. 「① 开始赛事」生成第 1 日（胜者组 8 场）；每场填写比分（无平局）并保存后点「② 推进」
3. 系统按比赛日自动生成胜者组/败者组对阵：输一场掉败者组、再输一场出局；第 8 日总决赛结束后赛事自动完成
4. 最终排名 1~16：冠军/亚军来自总决赛，3/4 名来自败者组淘汰顺序，5~16 名在同一名次段内按「本次赛事净积分 → 胜场 → 种子号」排序，无并列

Web 赛事详情页用「胜者组 + 败者组」双轨对阵图展示进度，也可点「本地模拟推演」在浏览器里跑一版双败流程（不写库）。

### Q14: 队伍/队员的荣誉墙怎么添加

荣誉墙由后台**手动添加**，每条荣誉必须关联一个赛事：

1. 进入 Django Admin 的「队伍」或「队员」编辑页，在「荣誉」内联区块点「添加另一条」
2. 选择关联赛事、填写荣誉名称（自由命名，如「冠军」「最佳射手」）
3. 等级选「殿堂级/金/银/铜」；殿堂级可上传专属图片（`media/honors/`），金银铜使用内置奖章样式
4. 可选备注和排序（数字越小越靠前），保存后队伍/队员页面的「荣誉墙」会自动展示

---

## 技术栈

### 前端 (Android)

| 技术 | 说明 |
|------|------|
| Kotlin | 开发语言 |
| Jetpack Navigation | 页面导航 |
| Retrofit2 + OkHttp | 网络请求 |
| Gson | JSON 解析 |
| Coil | 图片加载 |
| SwipeRefreshLayout | 下拉刷新 |
| ExoPlayer (Media3) | 音视频播放 |
| DataStore Preferences | Token 持久化 |
| ViewBinding | 视图绑定 |
| Material3 | UI 组件库 |

### 前端 (Web)

| 技术 | 说明 |
|------|------|
| React 18 | UI 框架 |
| Vite 5 | 构建工具 |
| Ant Design 5 | 组件库（白色主题 + 粉色强调） |
| React Router 6 | 页面路由（懒加载） |
| Axios | 网络请求（JWT 自动携带与刷新） |
| 本地模拟器 | 纯前端复刻瑞士轮与 16 队双败推进逻辑，可随机/手输比分推演，不写库 |

### 后端 (Django)

| 技术 | 说明 |
|------|------|
| Python + Django | Web 框架 |
| Django REST Framework | API 框架 |
| SimpleJWT | JWT 认证 |
| MySQL | 数据库 |
| CORS Headers | 跨域支持 |

---

## 版本信息

| 组件 | 版本 |
|------|------|
| Android Gradle Plugin | 9.1.1 |
| Kotlin | 2.0.21 |
| Gradle | 9.3.1 |
| compileSdk | 36 |
| minSdk | 26 |
| targetSdk | 36 |
| Material | 1.10.0 |
| Navigation | 2.7.7 |
| Retrofit | 2.9.0 |
| OkHttp | 4.12.0 |
| Gson | 2.10.1 |
| Coil | 2.5.0 |
| Media3 (ExoPlayer) | 1.3.1 |
| SwipeRefreshLayout | 1.1.0 |
| Django | 5.1.3 |
| DRF | 3.x |
| React | 18.3 |
| Vite | 5.4 |
| Ant Design | 5.22+ |
| React Router | 6.28 |
| Axios | 1.7 |
