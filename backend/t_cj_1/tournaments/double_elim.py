"""16-team double-elimination engine (普通双败，无平局).

Match days:
  D1  胜者组 R1      (8)
  D2  胜者组 R2 (4) + 败者组 R1 (4)
  D3  败者组 R2      (4)
  D4  胜者组 R3 (2) + 败者组 R3 (2)
  D5  败者组 R4      (2)
  D6  胜者组决赛(1) + 败者组 R5 (1)
  D7  败者组决赛 R6  (1)
  D8  总决赛         (1)

Ranking: 1/2 from grand final, 3/4 from loser-bracket elimination order,
then 5-16 sorted inside each elimination band by tournament net points.
"""
from datetime import datetime, timedelta
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Sum

from .models import Match, TournamentTeam
from teams.rating import settle_if_ready

TEAM_COUNT = 16
ALIVE = "alive"
ELIMINATED = "eliminated"
WINNERS = "winners"
LOSERS = "losers"
FINAL = "final"

# round -> elimination band for loser-bracket matches
LOSER_BAND = {
    2: "lb1",  # 13-16
    3: "lb2",  # 9-12
    4: "lb3",  # 7-8
    5: "lb4",  # 5-6
    6: "lb5",  # 4
    7: "lb6",  # 3
}


def _date(tournament, round_no):
    day = tournament.start_date + timedelta(
        days=(round_no - 1) * (tournament.round_interval_days or 3)
    )
    return timezone.make_aware(
        datetime.combine(day, datetime.min.time()) + timedelta(hours=20, minutes=0)
    )


def _round_matches(tournament, round_no, kind=None):
    qs = Match.objects.filter(tournament=tournament, round=round_no)
    if kind is not None:
        qs = qs.filter(bracket_kind=kind)
    return list(qs.select_related("home_team", "away_team").order_by("id"))


def _winner_id(match):
    return match.home_team_id if match.home_score > match.away_score else match.away_team_id


def _loser_id(match):
    return match.home_team_id if match.home_score < match.away_score else match.away_team_id


def _ids(tts):
    return [tt.team_id for tt in tts]


def _create_matches(tournament, round_no, kind, pairs):
    date = _date(tournament, round_no)
    for home_id, away_id in pairs:
        Match.objects.create(
            tournament=tournament,
            home_team_id=home_id,
            away_team_id=away_id,
            match_date=date,
            status="scheduled",
            round=round_no,
            knockout=True,
            bracket_kind=kind,
        )


def _ordered_teams(tournament):
    tts = list(tournament.tournament_teams.select_related("team"))
    if len(tts) != TEAM_COUNT:
        raise ValidationError(f"双败淘汰需要恰好 {TEAM_COUNT} 支参赛队，当前 {len(tts)} 支")
    tts.sort(key=lambda tt: (-tt.team.points, tt.team.rank, tt.id))
    return tts


def start_tournament(tournament):
    """Reset state, seed 1..16 by global points and create WB R1."""
    tts = _ordered_teams(tournament)
    Match.objects.filter(tournament=tournament).delete()
    for i, tt in enumerate(tts, start=1):
        tt.wins = 0
        tt.losses = 0
        tt.status = ALIVE
        tt.rank = i
        tt.elim_band = ""
        tt.save(update_fields=["wins", "losses", "status", "rank", "elim_band"])

    ids = _ids(tts)
    pairs = [(ids[i], ids[i + 1]) for i in range(0, TEAM_COUNT, 2)]
    _create_matches(tournament, 1, WINNERS, pairs)

    tournament.rounds = 8
    tournament.phase = "knockout"
    tournament.stage_status = "ongoing"
    tournament.current_round = 1
    tournament.save(update_fields=["rounds", "phase", "stage_status", "current_round"])


def _apply_result(match):
    """Apply one finished score; winner/loser routing depends on bracket_kind."""
    if match.stats_settled:
        return
    if match.home_score is None or match.away_score is None:
        raise ValidationError("比分未填写完整")
    if match.home_score == match.away_score:
        raise ValidationError("比分不能相同，双败赛制不允许平局")

    tts = {tt.team_id: tt for tt in match.tournament.tournament_teams.all()}
    home, away = tts[match.home_team_id], tts[match.away_team_id]
    winner = home if match.home_score > match.away_score else away
    loser = away if winner is home else home

    winner.wins += 1
    loser.losses += 1

    if match.bracket_kind == LOSERS:
        # loser already carries one loss; second loss = out
        winner.status = ALIVE
        loser.status = ELIMINATED
        loser.elim_band = LOSER_BAND.get(match.round, "lb1")
    elif match.bracket_kind == FINAL:
        winner.status = ALIVE
        loser.status = ELIMINATED
        loser.elim_band = "final_loser"
    else:  # winners bracket: a loss is the team's first loss
        winner.status = ALIVE
        loser.status = ALIVE
        loser.elim_band = ""

    winner.save(update_fields=["wins", "status"])
    loser.save(update_fields=["losses", "status", "elim_band"])
    match.status = "finished"
    match.stats_settled = True
    match.save(update_fields=["status", "stats_settled"])
    settle_if_ready(match)


def _winners_of(matches):
    return [_winner_id(m) for m in matches]


def _losers_of(matches):
    return [_loser_id(m) for m in matches]


def _pair_consecutive(ids):
    return [(ids[i], ids[i + 1]) for i in range(0, len(ids) - 1, 2)]


def _create_next_day(tournament, settled_round):
    """Build all matches of the next match day after `settled_round` results."""
    next_no = settled_round + 1

    if settled_round == 1:
        wb1 = _round_matches(tournament, 1, WINNERS)
        _create_matches(tournament, next_no, WINNERS, _pair_consecutive(_winners_of(wb1)))
        _create_matches(tournament, next_no, LOSERS, _pair_consecutive(_losers_of(wb1)))
        return

    if settled_round == 2:
        lb1 = _round_matches(tournament, 2, LOSERS)
        wb2 = _round_matches(tournament, 2, WINNERS)
        lb1_winners = _winners_of(lb1)
        wb2_losers = _losers_of(wb2)
        _create_matches(
            tournament,
            next_no,
            LOSERS,
            [(lb1_winners[i], wb2_losers[i]) for i in range(len(lb1_winners))],
        )
        return

    if settled_round == 3:
        wb2 = _round_matches(tournament, 2, WINNERS)
        lb2 = _round_matches(tournament, 3, LOSERS)
        wb3 = _pair_consecutive(_winners_of(wb2))
        lb3 = _pair_consecutive(_winners_of(lb2))
        _create_matches(tournament, next_no, WINNERS, wb3)
        _create_matches(tournament, next_no, LOSERS, lb3)
        return

    if settled_round == 4:
        wb3 = _round_matches(tournament, 4, WINNERS)
        lb3 = _round_matches(tournament, 4, LOSERS)
        lb4 = list(zip(_winners_of(lb3), _losers_of(wb3)))
        _create_matches(tournament, next_no, LOSERS, lb4)
        return

    if settled_round == 5:
        lb4 = _round_matches(tournament, 5, LOSERS)
        wb3 = _round_matches(tournament, 4, WINNERS)
        _create_matches(tournament, next_no, LOSERS, _pair_consecutive(_winners_of(lb4)))
        _create_matches(tournament, next_no, WINNERS, _pair_consecutive(_winners_of(wb3)))
        return

    if settled_round == 6:
        lb5 = _round_matches(tournament, 6, LOSERS)
        wbf = _round_matches(tournament, 6, WINNERS)
        _create_matches(
            tournament,
            next_no,
            LOSERS,
            [(_winners_of(lb5)[0], _losers_of(wbf)[0])],
        )
        return

    if settled_round == 7:
        wbf = _round_matches(tournament, 6, WINNERS)
        lb6 = _round_matches(tournament, 7, LOSERS)
        _create_matches(
            tournament,
            next_no,
            FINAL,
            [(_winners_of(wbf)[0], _winners_of(lb6)[0])],
        )


def _rank_final(tournament):
    """Assign final rank 1..16 after grand final."""
    from teams.models import PointsChange

    tts = list(tournament.tournament_teams.all())
    team_ids = [tt.team_id for tt in tts]
    agg = (
        PointsChange.objects.filter(
            match__tournament=tournament, team_id__in=team_ids, reason="match"
        )
        .values("team_id")
        .annotate(total=Sum("amount"))
    )
    net = {row["team_id"]: row["total"] or 0 for row in agg}

    final_matches = _round_matches(tournament, 8, FINAL)
    if not final_matches:
        raise ValidationError("总决赛尚未生成或未打完")
    gf = final_matches[0]
    champion_id = _winner_id(gf)
    loser_id = _loser_id(gf)

    by_team = {tt.team_id: tt for tt in tts}
    by_team[champion_id].rank = 1
    by_team[loser_id].rank = 2
    by_team[champion_id].status = ALIVE
    by_team[loser_id].status = ELIMINATED

    band_assign = [
        ("lb6", 3, 1),
        ("lb5", 4, 1),
        ("lb4", 5, 2),
        ("lb3", 7, 2),
        ("lb2", 9, 4),
        ("lb1", 13, 4),
    ]
    for band, first_rank, count in band_assign:
        rows = [tt for tt in tts if tt.elim_band == band]
        rows.sort(
            key=lambda tt: (
                -net.get(tt.team_id, 0),
                -tt.wins,
                tt.losses,
                tt.rank if tt.rank is not None else 999,
            )
        )
        for offset, tt in enumerate(rows[:count]):
            tt.rank = first_rank + offset
            tt.status = ELIMINATED

    for tt in tts:
        tt.save(update_fields=["rank", "status"])

    tournament.stage_status = "finished"
    tournament.phase = "finished"
    tournament.save(update_fields=["stage_status", "phase"])


def settle_and_advance(tournament):
    """Settle the current match day and generate the next one."""
    if tournament.stage_status == "finished":
        raise ValidationError("赛事已结束")

    cur = tournament.current_round
    matches = _round_matches(tournament, cur)
    if not matches:
        raise ValidationError(f"第 {cur} 日尚未生成对阵")

    for m in matches:
        if not m.stats_settled and m.home_score is not None and m.away_score is not None:
            _apply_result(m)
    unfinished = [m for m in matches if not m.stats_settled]
    if unfinished:
        raise ValidationError(f"第 {cur} 日还有 {len(unfinished)} 场未录入比分")

    if cur >= 8:
        _rank_final(tournament)
        return {"action": "finished", "message": "双败赛结束，冠军与 1~16 名次已生成"}

    _create_next_day(tournament, cur)
    tournament.current_round = cur + 1
    tournament.stage_status = "ongoing"
    tournament.save(update_fields=["current_round", "stage_status"])
    return {"action": "advanced", "message": f"第 {cur} 日已结算，已生成第 {cur + 1} 日对阵"}


def reset_tournament(tournament):
    Match.objects.filter(tournament=tournament).delete()
    TournamentTeam.objects.filter(tournament=tournament).update(
        wins=0, losses=0, status=ALIVE, rank=None, elim_band=""
    )
    tournament.stage_status = "not_started"
    tournament.phase = "knockout"
    tournament.current_round = 0
    tournament.rounds = None
    tournament.save(update_fields=["stage_status", "phase", "current_round", "rounds"])
