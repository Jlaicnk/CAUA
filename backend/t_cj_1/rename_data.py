import os, sys
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

import django
django.setup()

from teams.models import Team, Player
from tournaments.models import Tournament, Match

print("Renaming teams to 队伍1 ~ 队伍64 ...")
for i, team in enumerate(Team.objects.all().order_by("id"), 1):
    team.name = f"队伍{i}"
    team.rank = i
    team.save()
print(f"  {Team.objects.count()} teams updated")

print("Renaming each team's players to 1号 ~ 11号 ...")
for team in Team.objects.all():
    # Delete extra players beyond 11 if any
    extra = team.players.filter(number__gt=11) | team.players.filter(number=0)
    deleted = extra.count()
    extra.delete()

    existing = list(team.players.all().order_by("id"))
    # If we have fewer than 11, create missing ones
    for j in range(1, 12):
        if j <= len(existing):
            player = existing[j - 1]
            player.name = f"{j}号"
            player.number = j
            player.save()
        else:
            Player.objects.create(
                name=f"{j}号",
                team=team,
                number=j,
                position="替补",
            )

    # Assign number/name for any remaining
    for j, player in enumerate(team.players.all().order_by("id"), 1):
        player.name = f"{j}号"
        player.number = j
        player.save()

print(f"  Players updated (each team now has exactly 11 players)")

print("Done! All renamed.")
