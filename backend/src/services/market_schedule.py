"""
Market Schedule Service.
Evaluates live trading hours, weekend halts, and exchange holidays for Indian (NSE/BSE)
and US (NYSE/NASDAQ) equity markets.
"""

from datetime import datetime, date, time, timedelta
from typing import Dict, Any, Optional
from zoneinfo import ZoneInfo
import logging

logger = logging.getLogger(__name__)

# Official Indian Market Holidays (NSE / BSE) for 2025 and 2026
NSE_HOLIDAYS = {
    # 2025
    "2025-01-26": "Republic Day",
    "2025-02-26": "Mahashivratri",
    "2025-03-14": "Holi",
    "2025-03-31": "Id-Ul-Fitr",
    "2025-04-10": "Shri Mahavir Jayanti",
    "2025-04-14": "Dr. Baba Saheb Ambedkar Jayanti",
    "2025-04-18": "Good Friday",
    "2025-05-01": "Maharashtra Day",
    "2025-06-07": "Bakri Id",
    "2025-08-15": "Independence Day",
    "2025-09-05": "Milad-un-Nabi",
    "2025-10-02": "Mahatma Gandhi Jayanti",
    "2025-10-21": "Diwali Laxmi Pujan",
    "2025-10-22": "Diwali Balipratipada",
    "2025-11-05": "Gurunanak Jayanti",
    "2025-12-25": "Christmas",
    # 2026
    "2026-01-26": "Republic Day",
    "2026-02-17": "Mahashivratri",
    "2026-03-03": "Holi",
    "2026-03-20": "Id-Ul-Fitr",
    "2026-03-31": "Shri Mahavir Jayanti",
    "2026-04-03": "Good Friday",
    "2026-04-14": "Dr. Ambedkar Jayanti",
    "2026-05-01": "Maharashtra Day",
    "2026-05-27": "Bakri Id",
    "2026-08-15": "Independence Day",
    "2026-10-02": "Mahatma Gandhi Jayanti",
    "2026-11-08": "Diwali Laxmi Pujan",
    "2026-11-24": "Gurunanak Jayanti",
    "2026-12-25": "Christmas",
}

# Official US Market Holidays (NYSE / NASDAQ) for 2025 and 2026
US_HOLIDAYS = {
    # 2025
    "2025-01-01": "New Year's Day",
    "2025-01-20": "Martin Luther King Jr. Day",
    "2025-02-17": "Washington's Birthday / Presidents' Day",
    "2025-04-18": "Good Friday",
    "2025-05-26": "Memorial Day",
    "2025-06-19": "Juneteenth National Independence Day",
    "2025-07-04": "Independence Day",
    "2025-09-01": "Labor Day",
    "2025-11-27": "Thanksgiving Day",
    "2025-12-25": "Christmas Day",
    # 2026
    "2026-01-01": "New Year's Day",
    "2026-01-19": "Martin Luther King Jr. Day",
    "2026-02-16": "Washington's Birthday / Presidents' Day",
    "2026-04-03": "Good Friday",
    "2026-05-25": "Memorial Day",
    "2026-06-19": "Juneteenth National Independence Day",
    "2026-07-03": "Independence Day (Observed)",
    "2026-09-07": "Labor Day",
    "2026-11-26": "Thanksgiving Day",
    "2026-12-25": "Christmas Day",
}


class MarketScheduleService:
    """Service to evaluate exchange market trading hours and status."""

    def resolve_exchange(self, ticker: Optional[str] = None, exchange: Optional[str] = None) -> str:
        """Resolve primary exchange code (NSE, BSE, or US)."""
        if exchange:
            ex_up = exchange.upper().strip()
            if ex_up in ("NSE", "BSE", "US", "NASDAQ", "NYSE"):
                return "NSE" if ex_up == "NSE" else ("BSE" if ex_up == "BSE" else "US")

        if ticker:
            t_up = ticker.upper().strip()
            if t_up.endswith(".NS"):
                return "NSE"
            if t_up.endswith(".BO"):
                return "BSE"
            return "US"

        return "NSE"

    def get_market_status(
        self,
        ticker: Optional[str] = None,
        exchange: Optional[str] = None,
        custom_now: Optional[datetime] = None,
    ) -> Dict[str, Any]:
        """
        Calculates whether the market is open or closed, the session status,
        the reason for closure (weekend, holiday, after-hours, pre-market),
        and the upcoming opening session timestamp.
        """
        ex = self.resolve_exchange(ticker=ticker, exchange=exchange)
        is_indian = ex in ("NSE", "BSE")

        tz_str = "Asia/Kolkata" if is_indian else "America/New_York"
        tz = ZoneInfo(tz_str)
        now_dt = custom_now if custom_now else datetime.now(tz)
        if now_dt.tzinfo is None:
            now_dt = now_dt.replace(tzinfo=tz)
        else:
            now_dt = now_dt.astimezone(tz)

        holidays_map = NSE_HOLIDAYS if is_indian else US_HOLIDAYS
        date_str = now_dt.strftime("%Y-%m-%d")

        # Trading Hours Specifications
        if is_indian:
            regular_open = time(9, 15)
            regular_close = time(15, 30)
            pre_open = time(9, 0)
            post_close = time(16, 0)
            market_name = "National Stock Exchange (NSE)" if ex == "NSE" else "Bombay Stock Exchange (BSE)"
            reg_hours_desc = "09:15 AM - 03:30 PM IST (Mon-Fri)"
            tz_abbr = "IST"
        else:
            regular_open = time(9, 30)
            regular_close = time(16, 0)
            pre_open = time(4, 0)
            post_close = time(20, 0)
            market_name = "US Markets (NYSE / NASDAQ)"
            reg_hours_desc = "09:30 AM - 04:00 PM ET (Mon-Fri)"
            tz_abbr = "ET"

        current_time = now_dt.time()
        weekday = now_dt.weekday()  # Monday=0 ... Sunday=6

        is_weekend = weekday in (5, 6)
        is_holiday = date_str in holidays_map
        holiday_name = holidays_map.get(date_str)

        is_open = False
        status = "CLOSED"
        session = "Closed"
        reason = ""
        message = ""

        if is_weekend:
            day_name = "Saturday" if weekday == 5 else "Sunday"
            status = "CLOSED_WEEKEND"
            session = "Weekend Halt"
            reason = f"Weekend closure ({day_name})"
            message = (
                f"{market_name} is closed for the weekend ({day_name}). "
                f"Regular trading sessions resume on Monday at {regular_open.strftime('%I:%M %p')} {tz_abbr}."
            )
        elif is_holiday:
            status = "CLOSED_HOLIDAY"
            session = "Exchange Holiday"
            reason = f"Official holiday: {holiday_name}"
            message = (
                f"{market_name} is closed today for {holiday_name}. "
                f"Trading will resume on the next scheduled business day at {regular_open.strftime('%I:%M %p')} {tz_abbr}."
            )
        elif regular_open <= current_time < regular_close:
            is_open = True
            status = "OPEN"
            session = "Regular Trading"
            reason = "Live trading session active"
            message = (
                f"{market_name} regular trading session is currently open until {regular_close.strftime('%I:%M %p')} {tz_abbr}."
            )
        elif pre_open <= current_time < regular_open:
            status = "CLOSED_PRE_MARKET"
            session = "Pre-Market Session"
            reason = f"Pre-market session before official open at {regular_open.strftime('%I:%M %p')} {tz_abbr}"
            message = (
                f"{market_name} is in pre-market orders session. "
                f"Regular trading opens at {regular_open.strftime('%I:%M %p')} {tz_abbr}."
            )
        elif regular_close <= current_time < post_close:
            status = "CLOSED_AFTER_HOURS"
            session = "Closing / After-Hours"
            reason = f"Regular session closed at {regular_close.strftime('%I:%M %p')} {tz_abbr}"
            message = (
                f"{market_name} regular trading has ended for today. "
                f"Session closed at {regular_close.strftime('%I:%M %p')} {tz_abbr}."
            )
        else:
            status = "CLOSED_AFTER_HOURS"
            session = "Closed (Off-Hours)"
            reason = f"Outside market hours ({reg_hours_desc})"
            message = (
                f"{market_name} is currently closed. "
                f"Regular trading operates {reg_hours_desc}."
            )

        # Calculate Next Market Open datetime
        next_open_dt = self._calculate_next_open(now_dt, regular_open, is_indian, holidays_map, tz)
        next_open_str = next_open_dt.strftime("%A, %b %d at %I:%M %p ") + tz_abbr
        countdown_secs = max(0, int((next_open_dt - now_dt).total_seconds()))

        return {
            "ticker": ticker,
            "exchange": ex,
            "market_name": market_name,
            "timezone": tz_str,
            "timezone_abbr": tz_abbr,
            "is_open": is_open,
            "status": status,
            "session": session,
            "reason": reason,
            "message": message,
            "regular_hours": reg_hours_desc,
            "current_exchange_time": now_dt.strftime("%Y-%m-%d %I:%M:%S %p ") + tz_abbr,
            "next_open": next_open_str,
            "next_open_iso": next_open_dt.isoformat(),
            "next_open_countdown_seconds": countdown_secs,
        }

    def _calculate_next_open(
        self,
        current_dt: datetime,
        regular_open_time: time,
        is_indian: bool,
        holidays_map: Dict[str, str],
        tz: ZoneInfo,
    ) -> datetime:
        """Find the upcoming date and time when the market opens next."""
        candidate_date = current_dt.date()

        # If today is a weekday and not a holiday, and current time is before open, next open is today!
        if (
            current_dt.weekday() < 5
            and candidate_date.strftime("%Y-%m-%d") not in holidays_map
            and current_dt.time() < regular_open_time
        ):
            return datetime.combine(candidate_date, regular_open_time, tzinfo=tz)

        # Otherwise, check future days (tomorrow, day after, etc.)
        for day_offset in range(1, 14):
            check_date = candidate_date + timedelta(days=day_offset)
            # Must be Monday (0) to Friday (4)
            if check_date.weekday() >= 5:
                continue
            # Must not be a market holiday
            if check_date.strftime("%Y-%m-%d") in holidays_map:
                continue
            return datetime.combine(check_date, regular_open_time, tzinfo=tz)

        # Fallback to Monday 9:15/9:30
        return datetime.combine(candidate_date + timedelta(days=1), regular_open_time, tzinfo=tz)


market_schedule_service = MarketScheduleService()
