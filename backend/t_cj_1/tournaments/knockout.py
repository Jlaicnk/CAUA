"""Single-elimination knockout stage after the swiss qualifier.

Run after swiss ends (when Tournament.knockout_after_swiss is True):
- the 16 advanced teams are seeded 1..16 by global points order
- first round pairs: (1,9)(2,10)(3,11)(4,12)(5,13)(6,14)(7,15)(8,16)
- fixed bracket: QF groups (1/9 vs 3/11)(2/10 vs 4/12)(5/13 vs 7/15)(6/14 vs 8/16)
- semi: top half (QF1 vs QF2), bottom half (QF3 vs QF4)
- final (two semi winners) + third-place match (two semi losers)
- matches keep accumulating wins/losses (records retained from swiss) and keep
  settling points via teams.rating.settle_if_ready

Final rankings:
- champion rank=1, runner-up rank=2, third rank=3, fourth rank=4
- remaining 28 teams ranked 5..32 by (wins desc, losses asc, points desc, rank asc)
"""
from datetime import datetime, timedelta
from django.utils import timezone

ALIVE = "alive"
ADVANCED = "advanced"
ELIMINATED = "eliminated"

# first-round pairings by seed: (seed_a, seed_b)
FIRST_ROUND = [(1, 9), (2, 10), (3, 11), (4, 12), (5, 13), (6, 14), (7, 15), (8, 16)]
# quarter-final merge: each tuple = (winner_group_a, winner_group_b) referring to
# FIRST_ROUND index (0-based) winners
QUARTER_MERGE = [(0, 2), (1, 3), (4, 6), (5, 7)]
SEMI_MERGE = [(0, 1), (2, 3)]  # QF winners merged into two semis


def _aware_date(tournament, extra_days):
    day = tournament.start_date + timedelta(days=extra_days)
    return timezone.make_aware(
        datetime.combine(day, datetime.min.time()) + timedelta(hours=20, minutes=0)
    )


def seed_knockout(tournament):
    """Build the 16-team knockout from the advanced teams, seeded by global points."""
    from .models import Match, TournamentTeam

    adv = list(
        tournament.tournament_teams
        .filter(status=ADVANCED)
        .select_related("team")
    )
    adv.sort(key=lambda tt: (-tt.team.points, tt.team.rank))
    seeds = [tt for tt in adv][:16]
    if len(seeds) != 16:
        raise ValueError(f"需要 16 支晋级队伍，当前 {len(seeds)}")

    # mark all 16 as alive for knockout; keep wins/losses; stash seed in rank temporarily
    for idx, tt in enumerate(seeds, start=1):
        tt.status = ALIVE
        tt.rank = idx
        tt.save(update_fields=["status", "rank"])

    # any other advanced teams beyond 16 (shouldn't happen) -> eliminated
    for tt in tournament.tournament_teams.filter(status=ADVANCED).exclude(pk__in=[s.pk for s in seeds]):
        tt.status = ELIMINATED
        tt.save(update_fields=["status"])

    date = _aware_date(tournament, 20)
    for (sa, sb) in FIRST_ROUND:
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
    tournament.save(update_fields=["phase", "stage_status", "current_round"])
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
    """Generate the next knockout round from the winners of `current_round`.

    current_round 1 -> QF (2), 2 -> SF (3), 3 -> final+3rd (4).
    """
    from .models import Match

    ms = _round_matches(tournament, current_round)
    winners = []
    for m in ms:
        if m.home_score > m.away_score:
            winners.append(m.home_team)
        else:
            winners.append(m.away_team)
    # winners ordered by the original match order (which follows seed groups)

    next_round = current_round + 1
    if current_round == 1:
        pairs = []
        for (ga, gb) in QUARTER_MERGE:
            pairs.append((winners[ga], winners[gb]))
    elif current_round == 2:
        pairs = []
        for (ga, gb) in SEMI_MERGE:
            pairs.append((winners[ga], winners[gb]))
    elif current_round == 3:
        # final + third-place
        pairs = [(winners[0], winners[1])]
        # third-place match between the two semi losers
        ms_semis = _round_matches(tournament, 3)
        semis_winner_ids = []
        for m in ms_semis:
            semis_winner_ids.append(m.home_team_id if m.home_score > m.away_score else m.away_team_id)
        losers = []
        for m in ms_semis:
            for t in (m.home_team, m.away_team):
                if t.id not in semis_winner_ids:
                    losers.append(t)
        pairs.append((losers[0], losers[1]))
    else:
        raise ValueError("淘汰赛轮次超出范围")

    date = _aware_date(tournament, 20 + current_round * 4)
    created = []
    for (h, a) in pairs:
        created.append(Match.objects.create(
            tournament=tournament, home_team=h, away_team=a,
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

    if cur >= 4:
        # final + third-place done
        finalize_tournament(tournament)
        return {"action": "finished", "message": "淘汰赛结束，已决出冠军（含季军赛）"}

    _generate_next_round(tournament, cur)
    tournament.current_round = cur + 1
    tournament.save(update_fields=["current_round"])
    return {"action": "advanced", "message": f"淘汰赛第 {cur} 轮已结算，已生成下一轮"}


def finalize_tournament(tournament):
    """Assign final ranks 1..4 from final + third-place, and 5..32 by sort rule."""
    from teams.models import Team

    ms = _round_matches(tournament, 4)
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

    # remaining 28 -> rank 5..32
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