import os, django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from teams.models import Team, Player
from tournaments.models import Tournament, TournamentTeam, Match
from datetime import datetime, date, timedelta
from django.utils import timezone
import random


print("Seeding teams...")
teams = []
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
    teams.append(team)
print(f"  {len(teams)} teams created")

print("Seeding players...")
positions = ["前锋", "中锋", "后卫", "守门员"]
player_count = 0
for team in teams:
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

print("Seeding tournaments...")
if Tournament.objects.count() == 0:
    t1 = Tournament.objects.create(
        name="动漫世界杯",
        description="汇聚了来自各个动漫世界的顶尖球队，争夺最强称号。",
        rules="小组赛→16强→8强→半决赛→决赛",
        start_date=date(2026, 1, 1),
        end_date=date(2026, 3, 30),
    )
    t2 = Tournament.objects.create(
        name="次元杯联赛",
        description="跨次元的足球盛事，打破次元壁的较量。",
        rules="循环赛制，积分排名。胜3分，平1分，负0分。",
        start_date=date(2026, 4, 1),
        end_date=date(2026, 7, 30),
    )
    t3 = Tournament.objects.create(
        name="新春邀请赛",
        description="新年伊始的邀请赛，32支精英队伍参战。",
        rules="单败淘汰制。",
        start_date=date(2026, 2, 1),
        end_date=date(2026, 2, 15),
    )

    # assign teams to tournaments
    for tournament in [t1, t2, t3]:
        selected = random.sample(teams, min(32, len(teams)))
        for team in selected:
            TournamentTeam.objects.get_or_create(tournament=tournament, team=team)
else:
    print("  Tournaments already exist")

print("Seeding matches...")
for tournament in Tournament.objects.all():
    existing = Match.objects.filter(tournament=tournament).count()
    if existing == 0:
        tt_ids = list(TournamentTeam.objects.filter(tournament=tournament).values_list("team_id", flat=True))
        random.shuffle(tt_ids)
        pairs = [(tt_ids[i], tt_ids[i + 1]) for i in range(0, len(tt_ids) - 1, 2)]
        for idx, (h_id, a_id) in enumerate(pairs):
            match_date = tournament.start_date + timedelta(days=idx * 3)
            match_date = timezone.make_aware(datetime.combine(match_date, datetime.min.time()) + timedelta(hours=19, minutes=30))
            finished = random.choice([True, False])
            Match.objects.create(
                tournament=tournament,
                home_team_id=h_id,
                away_team_id=a_id,
                home_score=random.randint(0, 5) if finished else None,
                away_score=random.randint(0, 5) if finished else None,
                match_date=match_date,
                status="finished" if finished else "scheduled",
            )

print("Done! Seed completed.")
