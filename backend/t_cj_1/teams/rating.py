"""Elo-like zero-sum points engine for teams.

Rules (from 积分说明.txt):
- every team starts at 1000
- after each finished match the winner takes points from the loser (winner +x, loser -x)
- transfer depends on the rating gap and on whether the strong team (higher rating) won

Bands (gap = |winner_before - loser_before|):
  gap < 150   : winner takes loser's 5%  (cap 50)
  gap < 300   : strong wins -> weak's 5% (cap 40);  weak wins -> strong's 7% (cap 60)
  gap < 500   : strong wins -> weak's 3% (cap 20);  weak wins -> strong's 7% (cap 80)
  gap >= 500  : strong wins -> weak's 1% (no cap);  weak wins -> strong's 7% (no cap)

Integers: raw transfer is rounded once and applied as +round to winner, -round to loser
so the two cancel exactly (zero-sum). Manual edits may break zero-sum on purpose.
"""
import math
from django.core.exceptions import ValidationError


def compute_transfer(winner_before, loser_before):
    """Return integer amount the winner gains (loser loses exactly the same)."""
    gap = abs(winner_before - loser_before)
    strong = max(winner_before, loser_before)
    weak = min(winner_before, loser_before)
    strong_won = winner_before > loser_before

    def pct(base, p, cap=None):
        raw = base * p / 100.0
        if cap is not None:
            raw = min(raw, cap)
        return int(math.floor(raw + 1e-9))

    if gap < 150:
        amount = pct(loser_before, 5, 50)
    elif gap < 300:
        if strong_won:
            amount = pct(weak, 5, 40)
        else:
            amount = pct(strong, 7, 60)
    elif gap < 500:
        if strong_won:
            amount = pct(weak, 3, 20)
        else:
            amount = pct(strong, 7, 80)
    else:  # >= 500
        if strong_won:
            amount = pct(weak, 1, None)
        else:
            amount = pct(strong, 7, None)

    return amount


def match_winner_ids(match):
    """Return (winner_team_id, loser_team_id) or raise ValidationError."""
    if match.home_score is None or match.away_score is None:
        raise ValidationError("比分未填写，不能结算积分")
    if match.home_score == match.away_score:
        raise ValidationError("比分不能相同，无平局")
    if match.home_score > match.away_score:
        return match.home_team_id, match.away_team_id
    return match.away_team_id, match.home_team_id


def _log_change(team, match, amount, points_after, reason):
    from .models import PointsChange
    PointsChange.objects.create(
        team=team, match=match, amount=amount,
        points_after=points_after, reason=reason,
    )


def settle_match_points(match):
    """Apply the zero-sum points transfer for a match with a legal final score.

    Idempotent via match.points_settled. Independent of match.status so it can be
    called as soon as both scores are saved (逐场即时) as well as during the swiss
    advance path without double counting. Also logs a PointsChange row for both teams.
    """
    if match.points_settled:
        return False
    win_id, lose_id = match_winner_ids(match)

    from .models import Team
    winner = Team.objects.get(pk=win_id)
    loser = Team.objects.get(pk=lose_id)
    win_before, lose_before = winner.points, loser.points

    transfer = compute_transfer(win_before, lose_before)
    if transfer:
        winner.points += transfer
        loser.points -= transfer
        winner.save(update_fields=["points"])
        loser.save(update_fields=["points"])
        _log_change(winner, match, transfer, winner.points, "match")
        _log_change(loser, match, -transfer, loser.points, "match")
    else:
        # zero transfer: still mark settled, no history entry needed
        pass

    match.points_settled = True
    match.save(update_fields=["points_settled"])
    return True


def log_manual_change(team, new_points, old_points=None):
    """Record a manual points adjustment (TeamAdmin save)."""
    from .models import PointsChange
    old = old_points if old_points is not None else team.points
    if old == new_points:
        return
    team.points = new_points
    team.save(update_fields=["points"])
    PointsChange.objects.create(
        team=team, match=None, amount=new_points - old,
        points_after=new_points, reason="manual",
    )


def log_reset(team):
    """Record a points reset to 1000 (TeamAdmin action)."""
    from .models import PointsChange
    old = team.points
    if old == 1000:
        return
    team.points = 1000
    team.save(update_fields=["points"])
    PointsChange.objects.create(
        team=team, match=None, amount=1000 - old,
        points_after=1000, reason="reset",
    )


def settle_if_ready(match):
    """Settle points for a match if it has a legal final score; safe no-op otherwise."""
    from django.core.exceptions import ValidationError
    if match.points_settled:
        return False
    if match.home_score is None or match.away_score is None:
        return False
    try:
        return settle_match_points(match)
    except ValidationError:
        return False
