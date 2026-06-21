from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from typing import Any


SENTIMENT_SCORE = {"positive": 1.0, "neutral": 0.0, "mixed": -0.5, "negative": -1.0}


def blocker_patterns(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str, str], dict[str, Any]] = {}
    for row in rows:
        visit = row["visit"]
        debrief = _debrief(row)
        for blocker in debrief.get("blockers") or []:
            key = (visit.get("district") or "Unknown", visit.get("village") or visit.get("block") or "Unknown", blocker.get("category") or "other")
            current = grouped.setdefault(
                key,
                {
                    "district": key[0],
                    "block": key[1],
                    "category": key[2],
                    "count": 0,
                    "latest_date": visit.get("visit_date"),
                },
            )
            current["count"] += 1
            if visit.get("visit_date") and visit.get("visit_date") > (current.get("latest_date") or ""):
                current["latest_date"] = visit.get("visit_date")
    return sorted(grouped.values(), key=lambda item: item["count"], reverse=True)


def sentiment_trends(rows: list[dict[str, Any]]) -> list[dict[str, Any]]:
    grouped: dict[tuple[str, str], list[float]] = defaultdict(list)
    for row in rows:
        visit = row["visit"]
        debrief = _debrief(row)
        visit_date = _parse_date(visit.get("visit_date"))
        if not visit_date:
            continue
        week = f"{visit_date.isocalendar().year}-W{visit_date.isocalendar().week:02d}"
        district = visit.get("district") or "Unknown"
        grouped[(week, district)].append(SENTIMENT_SCORE.get(debrief.get("sentiment"), 0.0))

    points = []
    for (week, district), scores in grouped.items():
        points.append(
            {
                "week": week,
                "district": district,
                "avg_sentiment_score": round(sum(scores) / len(scores), 2),
                "visit_count": len(scores),
            }
        )
    return sorted(points, key=lambda item: (item["week"], item["district"]))


def stats(rows: list[dict[str, Any]]) -> dict[str, Any]:
    sentiments = Counter()
    blocker_categories = Counter()
    visits_per_day = Counter()
    visits_with_blockers = 0
    today = date.today()
    week_start = today - timedelta(days=7)
    visits_this_week = 0

    for row in rows:
        visit = row["visit"]
        debrief = _debrief(row)
        blockers = debrief.get("blockers") or []
        if blockers:
            visits_with_blockers += 1
        sentiments[debrief.get("sentiment") or "not_generated"] += 1
        for blocker in blockers:
            blocker_categories[blocker.get("category") or "other"] += 1
        if visit.get("visit_date"):
            visits_per_day[visit["visit_date"]] += 1
            parsed = _parse_date(visit["visit_date"])
            if parsed and parsed >= week_start:
                visits_this_week += 1

    return {
        "total_visits": len(rows),
        "visits_with_blockers": visits_with_blockers,
        "visits_this_week": visits_this_week,
        "sentiment_distribution": dict(sentiments),
        "top_blocker_categories": [
            {"category": category, "count": count}
            for category, count in blocker_categories.most_common(10)
        ],
        "recent_visits_per_day": [
            {"date": day, "count": count}
            for day, count in sorted(visits_per_day.items(), reverse=True)[:14]
        ],
    }


def _parse_date(value: str | None) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return datetime.fromisoformat(str(value)).date()
    except ValueError:
        return None


def _debrief(row: dict[str, Any]) -> dict[str, Any]:
    debrief = row.get("debrief")
    return debrief if isinstance(debrief, dict) else {}
