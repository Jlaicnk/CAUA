"""Single round-robin (单循环) engine for exactly 8 teams.

Everyone plays everyone once: 7 rounds x 4 matches = 28 matches. No draws,
no advancement/elimination - every team stays "alive" for all rounds and the
tournament simply ends after the last round has been settled.

Schedules are generated round-by-round by the same circle method, so round N
pairings are deterministic: the 28 pairings across rounds 1..7 are all unique
and every team appears exactly once per round. This mirrors the swiss admin
workflow: ① start generates round 1, ② settle_and_advance settles the current
round (real-time points already settled per match) and generates the next one.
"""
from . import swiss

from .models import Match, TournamentTeam

TEAM_COUNT = 8


def max_rounds(n):
    return n - 1


def _round_pairs(team_ids, round_no):
    """Circle-method pairings for round_no of an even `team_ids` field.

    Team 0 is the pivot; the others rotate one slot per round.
    """
    ids = sorted(team_ids)
    n = len(ids)
    if n % 2:
        raise ValueError("单循环要求偶数支队伍")
    pivot = ids[0]
    others = ids[1:]
    k = (round_no - 1) % (n - 1)
    ring = [pivot] + others[k:] + others[:k]
    pairs = []
    for i in range(n // 2):
        a, b = ring[i], ring[n - 1 - i]
        # alternate home side each round for a fairer-looking schedule
        if (round_no + i) % 2:
            a, b = b, a
        pairs.append((a, b))
    return pairs


def _ordered_teams(tournament):
    tts = list(
        tournament.tournament_teams.select_related("team").order_by("team__rank", "team_id")
    )
    return [tt.team_id for tt in tts]


def _participant_count(tournament):
    return tournament.tournament_teams.count()


def _validate_participants(tournament):
    if _participant_count(tournament) != TEAM_COUNT:
        raise ValueError(f"单循环赛制需要恰好 {TEAM_COUNT} 支参赛队，当前 {_participant_count(tournament)} 支")


def _apply_result(match):
    """Apply a finished score to the two participants (no status change)."""
    from django.core.exceptions import ValidationError
    winner = swiss.match_winner(match.home_score, match.away_score)
    if winner is None:
        raise ValidationError(f"比赛 #{match.id} 比分无效：不允许平局或未填比分")
    tts = {tt.team_id: tt for tt in match.tournament.tournament_teams.all()}
    home, away = tts[match.home_team_id], tts[match.away_team_id]
    if winner == "home":
        home.wins += 1
        away.losses += 1
    else:
        away.wins += 1
        home.losses += 1
    home.save(update_fields=["wins", "losses"])
    away.save(update_fields=["wins", "losses"])
    match.status = "finished"
    match.save(update_fields=["status"])


def generate_round(tournament, round_no):
    """Create the 4 scheduled matches for `round_no`. Idempotent guard upstream."""
    _validate_participants(tournament)
    ids = _ordered_teams(tournament)
    if not ids:
        return []
    pairs = _round_pairs(ids, round_no)
    date = swiss.next_round_date(tournament, round_no)
    created = []
    for h, a in pairs:
        created.append(Match.objects.create(
            tournament=tournament, home_team_id=h, away_team_id=a,
            match_date=date, status="scheduled", round=round_no,
        ))
    return created


def start_tournament(tournament):
    """Reset all state, then generate round 1."""
    _validate_participants(tournament)
    Match.objects.filter(tournament=tournament).delete()
    TournamentTeam.objects.filter(tournament=tournament).update(
        wins=0, losses=0, status=swiss.ALIVE, rank=None
    )
    tournament.rounds = max_rounds(TEAM_COUNT)
    tournament.stage_status = "ongoing"
    tournament.phase = "swiss"
    tournament.current_round = 1
    tournament.save(update_fields=["rounds", "stage_status", "phase", "current_round"])
    generate_round(tournament, 1)


def settle_and_advance(tournament):
    """Settle current round from entered scores, then generate next if any.

    Returns dict with {action, message}. Raises ValidationError for incomplete
    /illegal state.
    """
    from django.core.exceptions import ValidationError
    from teams.rating import settle_if_ready

    if tournament.stage_status == "finished":
        raise ValidationError("赛事已结束")
    cur = tournament.current_round
    round_matches = list(Match.objects.filter(tournament=tournament, round=cur).order_by("id"))

    for m in round_matches:
        if m.status != "finished" and m.home_score is not None and m.away_score is not None:
            _apply_result(m)
        # 积分结算（幂等；若 admin 单场保存已结算则跳过）
        settle_if_ready(m)

    unfinished = [m for m in round_matches if m.status != "finished"]
    if unfinished:
        raise ValidationError(f"第 {cur} 轮还有 {len(unfinished)} 场未录入比分，无法推进")
    if not round_matches:
        raise ValidationError(f"第 {cur} 轮尚未生成对阵")

    total_rounds = max_rounds(TEAM_COUNT)
    if cur >= total_rounds:
        tournament.stage_status = "finished"
        tournament.phase = "finished"
        tournament.save(update_fields=["stage_status", "phase"])
        return {"action": "finished", "message": f"第 {cur} 轮结束，{TEAM_COUNT} 队单循环全部打完（共 {cur} 轮）"}

    next_no = cur + 1
    if not Match.objects.filter(tournament=tournament, round=next_no).exists():
        generate_round(tournament, next_no)
    tournament.current_round = next_no
    tournament.stage_status = "ongoing"
    tournament.save(update_fields=["current_round", "stage_status"])
    return {"action": "advanced", "message": f"第 {cur} 轮已结算，已生成第 {next_no} 轮"}


def reset_tournament(tournament):
    """Full reset: delete matches, reset participants, stage to not_started."""
    Match.objects.filter(tournament=tournament).delete()
    TournamentTeam.objects.filter(tournament=tournament).update(
        wins=0, losses=0, status=swiss.ALIVE, rank=None
    )
    tournament.stage_status = "not_started"
    tournament.phase = "swiss"
    tournament.current_round = 0
    tournament.save(update_fields=["stage_status", "phase", "current_round"])
