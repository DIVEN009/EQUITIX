import os
import sys
from datetime import date

# Ensure repo root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "../..")))

from ml_pipeline.batch_inference import get_next_trading_days


def test_trading_days_skips_weekends():
    # Start on a Friday (e.g., 2026-10-02 is a Friday)
    friday = date(2026, 10, 2)
    next_days = get_next_trading_days(friday, count=7)

    assert len(next_days) == 7

    # Verify no Saturdays (weekday=5) or Sundays (weekday=6)
    for dt in next_days:
        assert dt.weekday() < 5, f"Date {dt} is a weekend day: weekday {dt.weekday()}"

    # First next trading day after Friday should be Monday (2026-10-05)
    assert next_days[0] == date(2026, 10, 5)
    assert next_days[1] == date(2026, 10, 6)
    assert next_days[2] == date(2026, 10, 7)
    assert next_days[3] == date(2026, 10, 8)
    assert next_days[4] == date(2026, 10, 9)
    # 6th trading day should be next Monday (2026-10-12)
    assert next_days[5] == date(2026, 10, 12)
    assert next_days[6] == date(2026, 10, 13)
