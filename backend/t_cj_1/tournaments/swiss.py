"""Qualifier swiss engine: reach 3 wins -> ADVANCE (leave), reach 3 losses -> ELIMINATED.

Unlike classic swiss (everyone plays all rounds), a team leaves as soon as it hits
3 wins or 3 losses. Only "alive" teams (wins<3 and losses<3) get paired each round.

Each round = one match day. Round N date = start_date + (N-1) * round_interval_days.

With an even starting field (e.g. 32) the number of alive teams stays even across
rounds (advance/elimination happen in pairs), so there are no byes and no tiebreak
disputes: the tournament ends when advanced count reaches half the field.
"""
import random

from datetime import datetime, timedelta
from django.utils import timezone

WIN_TARGET = 3
LOSS_TARGET = 3

ALIVE = "alive"
ADVANCED = "advanced"
ELIMINATED = "eliminated"

# record -> canonical ordering for pairing preference (0-0 first)
_BAND = {
    (0, 0): 0,
    (1, 0): 1, (0, 1): 2,
    (2, 0): 3, (1, 1): 4, (0, 2): 5,
    (2, 1): 6, (1, 2): 7,
    (2, 2): 8,
}


def team_status(wins, losses):
    if wins >= WIN_TARGET:
        return ADVANCED
    if losses >= LOSS_TARGET:
        return ELIMINATED
    return ALIVE


def max_rounds(n):
    return 2 * WIN_TARGET - 1


def match_winner(home_score, away_score):
    """Return 'home'/'away'/None (None = draw illegal or unfinished)."""
    if home_score is None or away_score is None:
        return None
    if home_score == away_score:
        return None
    return "home" if home_score > away_score else "away"


def _pair_pool(ids, forbidden):
    """Backtracking perfect matching of even `ids`, avoiding forbidden pairs.

    Since ids are passed ordered by record band (same-record contiguous), the
    backtracking naturally prefers same-record opponents first.
    """
    if not ids:
        return []
    if len(ids) % 2:
        raise ValueError("pair_pool requires even count")
    first = ids[0]
    rest = ids[1:]
    for k, other in enumerate(rest):
        if frozenset((first, other)) in forbidden:
            continue
        remaining = rest[:k] + rest[k + 1:]
        sub = _pair_pool(remaining, forbidden)
        if sub is not None:
            return [(first, other)] + sub
    return None


def random_scores():
    while True:
        hs = random.randint(0, 5)
        as_ = random.randint(0, 5)
        if hs != as_:
            return hs, as_


def next_round_date(tournament, round_no):
    day = tournament.start_date + timedelta(days=(round_no - 1) * tournament.round_interval_days)
    return timezone.make_aware(
        datetime.combine(day, datetime.min.time()) + timedelta(hours=19, minutes=30)
    )


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _ordered_alive(tournament):
    """Alive TournamentTeam objects, sorted so same-record teams are contiguous (band order)."""
    tts = list(tournament.tournament_teams.filter(status=ALIVE).select_related("team"))
    tts.sort(key=lambda x: (_BAND.get((x.wins, x.losses), 9), random.random()))
    return tts


def _forbidden_pairs(tournament):
    from .models import Match
    return {frozenset((m.home_team_id, m.away_team_id)) for m in Match.objects.filter(tournament=tournament)}


def generate_round(tournament, round_no):
    """Create scheduled matches for `round_no` from alive teams. Idempotent guard upstream."""
    from .models import Match
    alive = _ordered_alive(tournament)
    ids = [t.team_id for t in alive]
    if len(ids) % 2:
        raise ValueError(f"存活队伍数为奇数({len(ids)})，无法配对")
    if not ids:
        return []
    pairs = _pair_pool(ids, _forbidden_pairs(tournament))
    if pairs is None:
        raise ValueError("无法生成不重复的配对，请检查已交手记录")
    date = next_round_date(tournament, round_no)
    created = []
    for h, a in pairs:
        created.append(Match.objects.create(
            tournament=tournament, home_team_id=h, away_team_id=a,
            match_date=date, status="scheduled", round=round_no,
        ))
    return created


def _apply_match_result(match):
    """Apply a finished score to participants and flip match to finished."""
    from django.core.exceptions import ValidationError
    winner = match_winner(match.home_score, match.away_score)
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
    home.status = team_status(home.wins, home.losses)
    away.status = team_status(away.wins, away.losses)
    home.save(update_fields=["wins", "losses", "status"])
    away.save(update_fields=["wins", "losses", "status"])
    match.status = "finished"
    match.save(update_fields=["status"])


def is_over(tournament):
    total = tournament.tournament_teams.count()
    advanced = tournament.tournament_teams.filter(status=ADVANCED).count()
    return total > 0 and advanced * 2 >= total


# ---------------------------------------------------------------------------
# Public service API (used by Admin + seed_data)
# ---------------------------------------------------------------------------

def start_tournament(tournament):
    """Reset all state, then generate round 1."""
    from .models import Match, TournamentTeam
    Match.objects.filter(tournament=tournament).delete()
    TournamentTeam.objects.filter(tournament=tournament).update(
        wins=0, losses=0, status=ALIVE, rank=None
    )
    tournament.stage_status = "ongoing"
    tournament.phase = "swiss"
    tournament.current_round = 1
    tournament.save(update_fields=["stage_status", "phase", "current_round"])
    generate_round(tournament, 1)


def settle_and_advance(tournament):
    """Settle current round from entered scores, then generate next round if not over.

    Returns dict with {action, message}. Raises ValidationError for incomplete/illegal state.
    """
    from django.core.exceptions import ValidationError
    from .models import Match

    cur = tournament.current_round
    if tournament.stage_status == "finished":
        raise ValidationError("赛事已结束")
    if tournament.phase == "knockout":
        from . import knockout
        return knockout.settle_knockout_round(tournament)
    round_matches = list(Match.objects.filter(tournament=tournament, round=cur).order_by("id"))

    # Apply results for matches that have scores and are not finished yet.
    for m in round_matches:
        if m.status != "finished" and m.home_score is not None and m.away_score is not None:
            _apply_match_result(m)
        # 积分结算（幂等；若 admin 单场保存已结算则跳过）
        from teams.rating import settle_if_ready
        settle_if_ready(m)

    unfinished = [m for m in round_matches if m.status != "finished"]
    if unfinished:
        raise ValidationError(f"第 {cur} 轮还有 {len(unfinished)} 场未录入比分，无法推进")
    if not round_matches:
        raise ValidationError(f"第 {cur} 轮尚未生成对阵")

    if is_over(tournament):
        # swiss finished
        if tournament.knockout_after_swiss:
            from . import knockout
            knockout.seed_knockout(tournament)
            return {"action": "knockout", "message": "瑞士轮结束，已生成淘汰赛 16 强对阵（第一轮 1-9/2-10…）"}
        tournament.stage_status = "finished"
        tournament.phase = "finished"
        tournament.save(update_fields=["stage_status", "phase"])
        return {"action": "finished", "message": f"第 {cur} 轮结束，赛事完成（16 强已决出）"}

    next_no = cur + 1
    if not Match.objects.filter(tournament=tournament, round=next_no).exists():
        generate_round(tournament, next_no)
    tournament.current_round = next_no
    tournament.stage_status = "ongoing"
    tournament.save(update_fields=["current_round", "stage_status"])
    return {"action": "advanced", "message": f"第 {cur} 轮已结算，已生成第 {next_no} 轮"}


def reset_tournament(tournament):
    """Full reset: delete matches, reset participants, stage to not_started."""
    from .models import Match, TournamentTeam
    Match.objects.filter(tournament=tournament).delete()
    TournamentTeam.objects.filter(tournament=tournament).update(
        wins=0, losses=0, status=ALIVE, rank=None
    )
    tournament.stage_status = "not_started"
    tournament.phase = "swiss"
    tournament.current_round = 0
    tournament.save(update_fields=["stage_status", "phase", "current_round"])
