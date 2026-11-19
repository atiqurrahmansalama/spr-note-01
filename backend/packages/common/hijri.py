"""
Pure Python Hijri & Islamic Calendar Utilities.
Provides deterministic conversion and caching across Islamic months.
"""
from datetime import date, datetime
from typing import Dict, Any

HIJRI_MONTHS = [
    "Muharram",
    "Safar",
    "Rabi' al-Awwal",
    "Rabi' al-Thani",
    "Jumada al-Awwal",
    "Jumada al-Thani",
    "Rajab",
    "Sha'ban",
    "Ramadan",
    "Shawwal",
    "Dhu al-Qi'dah",
    "Dhu al-Hijjah",
]


def gregorian_to_hijri(target_date: date) -> Dict[str, Any]:
    """
    Approximation of Gregorian to Hijri calendar date.
    """
    if isinstance(target_date, str):
        target_date = datetime.strptime(target_date, "%Y-%m-%d").date()

    # Base epoch difference approximation
    jd = target_date.toordinal() + 1721424.5
    l = jd - 1948440 + 10632
    n = int((l - 1) / 10631)
    l = l - 10631 * n + 354
    j = (int((10985 - l) / 5316)) * (int((50 * l) / 17719)) + (int(l / 5670)) * (int((43 * l) / 15238))
    l = l - (int((30 - j) / 15)) * (int((17719 * j) / 50)) - (int(j / 16)) * (int((15238 * j) / 43)) + 29
    m = int((24 * l) / 709)
    d = l - int((709 * m) / 24)
    y = 30 * n + j - 30

    month_idx = max(0, min(11, m - 1))
    return {
        "year": int(y),
        "month": int(m),
        "month_name": HIJRI_MONTHS[month_idx],
        "day": int(d),
        "formatted": f"{int(d)} {HIJRI_MONTHS[month_idx]}, {int(y)} AH",
    }
