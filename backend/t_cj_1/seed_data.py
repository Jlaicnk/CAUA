import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from teams.models import Team, Player
from tournaments.models import Tournament, TournamentTeam, Match
from tournaments import swiss
from datetime import date
import random


# Teams/players only seeded on an empty DB (existing names/ranks are custom).
all_teams = list(Team.objects.all())
if not all_teams:
    print("Seeding teams...")
    for i in range(1, 65):
        name = f"队伍{i}"
        team, _ = Team.objects.get_or_create(
            name=name,
            defaults={
                "logo": f"https://api.dicebear.com/7.x/identicon/svg?seed={name}",
                "rank": i,
                "description": f"{name}是一支实力强劲的队伍，在赛场上有着出色的表现。",
            },
        )
        all_teams.append(team)
    print(f"  {len(all_teams)} teams created")

    print("Seeding players...")
    positions = ["前锋", "中锋", "后卫", "守门员"]
    player_count = 0
    for team in all_teams:
        existing = Player.objects.filter(team=team).count()
        if existing == 0:
            for j in range(1, 12):
                Player.objects.create(
                    name=f"{j}号",
                    avatar=f"https://api.dicebear.com/7.x/avataaars/svg?seed=player{team.id}_{j}",
                    position=random.choice(positions),
                    number=j,
                    bio=f"{team.name}的第{j}号球员，擅长{random.choice(['进攻','防守','盘带','射门','传球','抢断'])}。",
                    team=team,
                )
                player_count += 1
    print(f"  {player_count} players created")
else:
    print(f"  {len(all_teams)} teams already exist, skipping team/player seeding")

print("Seeding tournaments...")
tournament_specs = [
    {
        "name": "动漫世界杯",
        "description": "汇聚了来自各个动漫世界的顶尖球队，争夺最强称号。",
        "rules": "晋级瑞士轮：先取得 3 胜的队伍晋级 16 强，累计 3 负的队伍出局。每轮只安排仍在竞争中的队伍对阵，同战绩优先配对且不重复交手。",
        "start": date(2026, 1, 1),
        "end": date(2026, 3, 30),
    },
    {
        "name": "次元杯联赛",
        "description": "跨次元的足球盛事，打破次元壁的较量。",
        "rules": "晋级瑞士轮：先取得 3 胜的队伍晋级 16 强，累计 3 负的队伍出局。每轮只安排仍在竞争中的队伍对阵，同战绩优先配对且不重复交手。",
        "start": date(2026, 4, 1),
        "end": date(2026, 7, 30),
    },
    {
        "name": "新春邀请赛",
        "description": "新年伊始的邀请赛，32支精英队伍参战。",
        "rules": "晋级瑞士轮：先取得 3 胜的队伍晋级 16 强，累计 3 负的队伍出局。每轮只安排仍在竞争中的队伍对阵，同战绩优先配对且不重复交手。",
        "start": date(2026, 2, 1),
        "end": date(2026, 2, 15),
    },
]

tournament_objs = []
if Tournament.objects.count() == 0:
    for spec in tournament_specs:
        t = Tournament.objects.create(
            name=spec["name"],
            description=spec["description"],
            rules=spec["rules"],
            format="swiss",
            rounds=5,
            round_interval_days=3,
            start_date=spec["start"],
            end_date=spec["end"],
        )
        tournament_objs.append(t)
else:
    tournament_objs = list(Tournament.objects.all())

for t in tournament_objs:
    matched = next((s for s in tournament_specs if s["name"] == t.name), None)
    if matched:
        t.description = matched["description"]
        t.rules = matched["rules"]
    t.format = "swiss"
    t.rounds = 5
    t.round_interval_days = 3
    t.knockout_after_swiss = (t.name == "动漫世界杯")
    t.save()

print("  tournaments ready:", len(tournament_objs))

# assign teams if a tournament has none
for tournament in tournament_objs:
    if tournament.teams.count() == 0:
        selected = random.sample(all_teams, min(32, len(all_teams)))
        for team in selected:
            TournamentTeam.objects.get_or_create(tournament=tournament, team=team)

print("Resetting tournaments to qualifier start state...")
for tournament in tournament_objs:
    swiss.reset_tournament(tournament)

# Pre-generate round 1 for 动漫世界杯 so a bracket is visible immediately.
demo = next((t for t in tournament_objs if t.name == "动漫世界杯"), tournament_objs[-1])
swiss.start_tournament(demo)
r1_count = Match.objects.filter(tournament=demo, round=1).count()
print(f"  「{demo.name}」已预生成第 1 轮：{r1_count} 场对阵（待录比分）")
for t in tournament_objs:
    print(f"  {t.name}: teams={t.teams.count()} stage={t.stage_status} round={t.current_round}")

print("Done! Seed completed.")
