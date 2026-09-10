"""Single-elimination knockout stage after the swiss qualifier.

Supports any power-of-two qualifier size (8 for a 16-team qualifier,
16 for a 32-team qualifier):
- advanced teams are seeded 1..N by global points
- first round pairs top half vs bottom half: (1, 1+N/2)(2, 2+N/2) ...
- the first merge groups each block of four winners as (0 vs 2)(1 vs 3),
  later rounds merge adjacent winners until the final
- final (two winners) + third-place match (two losers of the previous round)
- every match keeps accumulating wins/losses and settles points

Final rankings:
- champion/runner-up/third/fourth from the final and third-place match
- the rest are ranked 5..N by (wins desc, losses asc, points desc, rank asc)
"""
import math

from datetime import datetime, timedelta
from django.utils import timezone

ALIVE = "alive"
ADVANCED = "advanced"
ELIMINATED = "eliminated"

def _total_rounds_for_size(size):
    return int(round(math.log2(size)))


def _first_round_pairs(size):
    """Top half vs bottom half: (1, 1+N/2)(2, 2+N/2) ..."""
    half = size // 2
    return [(i + 1, i + 1 + half) for i in range(half)]


def _merge_first_round(ids):
    """First merge: inside every block of four, pair (0vs2)(1vs3)."""
    pairs = []
    for i in range(0, len(ids), 4):
        block = ids[i:i + 4]
        if len(block) == 4:
            pairs.append((block[0], block[2]))
            pairs.append((block[1], block[3]))
        else:
            pairs.extend(_merge_adjacent(block))
    return pairs


def _merge_adjacent(ids):
    return [(ids[i], ids[i + 1]) for i in range(0, len(ids) - 1, 2)]


def _bracket_size(tournament):
    first_round = _round_matches(tournament, 1)
    return len(first_round) * 2


def _total_rounds(tournament):
    size = _bracket_size(tournament)
    if size < 2:
        return 0
    return _total_rounds_for_size(size)


def _aware_date(tournament, extra_days):
    day = tournament.start_date + timedelta(days=extra_days)
    return timezone.make_aware(
        datetime.combine(day, datetime.min.time()) + timedelta(hours=20, minutes=0)
    )


def seed_knockout(tournament):
    """Build the knockout bracket from the advanced teams, seeded by global points."""
    from .models import Match, TournamentTeam

    adv = list(
        tournament.tournament_teams
        .filter(status=ADVANCED)
        .select_related("team")
    )
    adv.sort(key=lambda tt: (-tt.team.points, tt.team.rank))
    size = len(adv)
    if size < 4 or (size & (size - 1)) != 0:
        raise ValueError(f"晋级队伍数必须为 2 的次方（4/8/16/32），当前 {size} 支")
    seeds = [tt for tt in adv][:size]

    # mark all qualifiers as alive for knockout; keep wins/losses; stash seed in rank
    for idx, tt in enumerate(seeds, start=1):
        tt.status = ALIVE
        tt.rank = idx
        tt.save(update_fields=["status", "rank"])

    # any other advanced teams beyond the bracket size (shouldn't happen) -> eliminated
    for tt in tournament.tournament_teams.filter(status=ADVANCED).exclude(pk__in=[s.pk for s in seeds]):
        tt.status = ELIMINATED
        tt.save(update_fields=["status"])

    date = _aware_date(tournament, 20)
    for (sa, sb) in _first_round_pairs(size):
        ha = seeds[sa - 1]
        hb = seeds[sb - 1]
        Match.objects.create(
            tournament=tournament,
            home_team=ha.team,
            away_team=hb.team,
            match_date=date,
            status="scheduled",
            round=1,
            knockout=True,
        )
    tournament.phase = "knockout"
    tournament.stage_status = "ongoing"
    tournament.current_round = 1
    tournament.rounds = _total_rounds_for_size(size)
    tournament.save(update_fields=["phase", "stage_status", "current_round", "rounds"])
    return seeds


def _round_matches(tournament, round_no):
    from .models import Match
    return list(
        Match.objects.filter(tournament=tournament, knockout=True, round=round_no)
        .select_related("home_team", "away_team")
        .order_by("id")
    )


def _settle_one(match):
    from django.core.exceptions import ValidationError
    from . import swiss
    from teams.rating import settle_if_ready
    if match.home_score is None or match.away_score is None:
        raise ValidationError(f"比赛 #{match.id} 未填写比分")
    if match.home_score == match.away_score:
        raise ValidationError(f"比赛 #{match.id} 比分相同，不允许平局")
    # update tournament-team records (wins/losses/status)
    tts = {tt.team_id: tt for tt in match.tournament.tournament_teams.all()}
    home, away = tts[match.home_team_id], tts[match.away_team_id]
    if match.home_score > match.away_score:
        home.wins += 1
        away.losses += 1
        winner, loser = home, away
    else:
        away.wins += 1
        home.losses += 1
        winner, loser = away, home
    winner.status = ALIVE
    loser.status = ELIMINATED
    winner.save(update_fields=["wins", "status"])
    loser.save(update_fields=["losses", "status"])
    match.status = "finished"
    match.save(update_fields=["status"])
    settle_if_ready(match)


def _generate_next_round(tournament, current_round):
    """Generate the next knockout round from the winners of `current_round`."""
    from .models import Match

    ms = _round_matches(tournament, current_round)
    winners = [m.home_team if m.home_score > m.away_score else m.away_team for m in ms]
    losers = [m.away_team if m.home_score > m.away_score else m.home_team for m in ms]
    total_rounds = _total_rounds(tournament)
    next_round = current_round + 1

    third_pair = None
    if current_round == 1:
        pairs = _merge_first_round(winners)
    elif current_round == total_rounds - 1:
        # 决赛 + 季军赛
        pairs = [(winners[0], winners[1])]
        third_pair = (losers[0], losers[1])
    else:
        pairs = _merge_adjacent(winners)

    date = _aware_date(tournament, 20 + current_round * 4)
    created = []
    for (h, a) in pairs:
        created.append(Match.objects.create(
            tournament=tournament, home_team=h, away_team=a,
            match_date=date, status="scheduled", round=next_round, knockout=True,
        ))
    if third_pair:
        created.append(Match.objects.create(
            tournament=tournament, home_team=third_pair[0], away_team=third_pair[1],
            match_date=date, status="scheduled", round=next_round, knockout=True,
        ))
    return created


def settle_knockout_round(tournament):
    """Settle current knockout round, generate next, finalize when done."""
    from django.core.exceptions import ValidationError
    from .models import Match

    cur = tournament.current_round
    ms = _round_matches(tournament, cur)
    if not ms:
        raise ValidationError("当前淘汰赛轮尚未生成")

    # settle all with scores
    for m in ms:
        if m.status != "finished" and m.home_score is not None and m.away_score is not None:
            _settle_one(m)
    unfinished = [m for m in ms if m.status != "finished"]
    if unfinished:
        raise ValidationError(f"第 {cur} 轮还有 {len(unfinished)} 场未录入比分")

    total_rounds = _total_rounds(tournament)
    if cur >= total_rounds:
        # final + third-place done
        finalize_tournament(tournament)
        return {"action": "finished", "message": "淘汰赛结束，已决出冠军（含季军赛）"}

    _generate_next_round(tournament, cur)
    tournament.current_round = cur + 1
    tournament.save(update_fields=["current_round"])
    return {"action": "advanced", "message": f"淘汰赛第 {cur} 轮已结算，已生成下一轮"}


def finalize_tournament(tournament):
    """Assign final ranks 1..4 from final + third-place, and the rest by sort rule."""
    from teams.models import Team

    total_rounds = _total_rounds(tournament)
    ms = _round_matches(tournament, total_rounds)
    if len(ms) < 1:
        raise ValueError("决赛尚未生成")
    # final was created first in _generate_next_round; third-place second.
    final = ms[0]
    third = ms[1] if len(ms) > 1 else None

    tts = {tt.team_id: tt for tt in tournament.tournament_teams.all()}
    fw = final.home_team if final.home_score > final.away_score else final.away_team
    fl = final.away_team if final.home_score > final.away_score else final.home_team
    tts[fw.id].rank = 1
    tts[fl.id].rank = 2
    tts[fw.id].save(update_fields=["rank"])
    tts[fl.id].save(update_fields=["rank"])
    if third:
        tw = third.home_team if third.home_score > third.away_score else third.away_team
        tl = third.away_team if third.home_score > third.away_score else third.home_team
        tts[tw.id].rank = 3
        tts[tl.id].rank = 4
        tts[tw.id].save(update_fields=["rank"])
        tts[tl.id].save(update_fields=["rank"])

    # remaining teams -> rank 5..N
    top4_ids = {fw.id, fl.id}
    if third:
        top4_ids.add(third.home_team_id if third.home_score > third.away_score else third.away_team_id)
        top4_ids.add(third.away_team_id if third.home_score > third.away_score else third.home_team_id)
    rest = []
    for tt in tournament.tournament_teams.all():
        if tt.team_id in top4_ids:
            continue
        rest.append(tt)
    teams = {t.id: t for t in Team.objects.all()}
    rest.sort(key=lambda tt: (-tt.wins, tt.losses, -teams[tt.team_id].points, teams[tt.team_id].rank))
    for idx, tt in enumerate(rest, start=5):
        tt.rank = idx
        tt.save(update_fields=["rank"])

    tournament.stage_status = "finished"
    tournament.phase = "finished"
    tournament.save(update_fields=["stage_status", "phase"])
