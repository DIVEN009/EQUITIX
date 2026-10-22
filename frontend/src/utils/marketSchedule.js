/**
 * Client-Side Market Schedule & Trading Hours Intelligence.
 * Evaluates live trading sessions, weekend closures, and exchange holidays
 * for Indian (NSE / BSE) and US (NASDAQ / NYSE) equity markets.
 */

export const NSE_HOLIDAYS = {
  // 2025
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
  // 2026
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
};

export const US_HOLIDAYS = {
  // 2025
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
  // 2026
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
};

/**
 * Determine exchange type from ticker and exchange hints.
 */
export const resolveExchangeType = (ticker = "", exchange = "") => {
  const ex = (exchange || "").toUpperCase();
  const tick = (ticker || "").toUpperCase();

  if (ex === "NSE" || ex === "BSE") return ex;
  if (ex === "US" || ex === "NASDAQ" || ex === "NYSE") return "US";

  if (tick.endsWith(".NS")) return "NSE";
  if (tick.endsWith(".BO")) return "BSE";
  return "US";
};

/**
 * Get date parts in specific timezone using standard Intl.DateTimeFormat.
 */
export const getTimezoneDateParts = (dateObj, timeZone) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    weekday: "short",
  });

  const parts = formatter.formatToParts(dateObj);
  const map = {};
  parts.forEach((p) => {
    map[p.type] = p.value;
  });

  // Calculate day of week index: Sunday=0, Monday=1, ... Saturday=6
  const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayOfWeek = weekdayNames.indexOf(map.weekday);

  return {
    year: parseInt(map.year, 10),
    month: parseInt(map.month, 10),
    day: parseInt(map.day, 10),
    hour: parseInt(map.hour, 10),
    minute: parseInt(map.minute, 10),
    second: parseInt(map.second, 10),
    dayOfWeek, // 0-6
    weekday: map.weekday,
    dateString: `${map.year}-${map.month}-${map.day}`,
  };
};

/**
 * Calculate client-side market status and next open countdown.
 * @param {string} ticker
 * @param {string} exchange
 * @param {Date} [currentTime]
 * @param {string} [simulationMode] - "auto" | "force_closed_weekend" | "force_closed_holiday" | "force_closed_after_hours" | "force_open"
 */
export const calculateMarketStatus = (
  ticker = "RELIANCE.NS",
  exchange = "",
  currentTime = new Date(),
  simulationMode = "auto"
) => {
  const ex = resolveExchangeType(ticker, exchange);
  const isIndian = ex === "NSE" || ex === "BSE";
  const timeZone = isIndian ? "Asia/Kolkata" : "America/New_York";
  const tzAbbr = isIndian ? "IST" : "ET";
  const marketName =
    ex === "NSE"
      ? "National Stock Exchange (NSE)"
      : ex === "BSE"
      ? "Bombay Stock Exchange (BSE)"
      : "US Markets (NYSE / NASDAQ)";

  // Hours
  // Indian: 9:15 - 15:30 IST (Pre: 9:00 - 9:15, Post: 15:40 - 16:00)
  // US: 9:30 - 16:00 ET (Pre: 4:00 - 9:30, Post: 16:00 - 20:00)
  const regularOpenHour = isIndian ? 9 : 9;
  const regularOpenMin = isIndian ? 15 : 30;
  const regularCloseHour = isIndian ? 15 : 16;
  const regularCloseMin = isIndian ? 30 : 0;
  const regHoursText = isIndian
    ? "09:15 AM - 03:30 PM IST (Mon-Fri)"
    : "09:30 AM - 04:00 PM ET (Mon-Fri)";

  const holidays = isIndian ? NSE_HOLIDAYS : US_HOLIDAYS;

  // Handle Simulation Modes
  if (simulationMode === "force_closed_weekend") {
    return {
      ticker,
      exchange: ex,
      marketName,
      timeZone,
      tzAbbr,
      isOpen: false,
      status: "CLOSED_WEEKEND",
      session: "Weekend Halt",
      reason: "Weekend closure (Saturday/Sunday)",
      message: `${marketName} is closed for the weekend. Regular trading sessions resume on Monday at ${isIndian ? "09:15 AM IST" : "09:30 AM ET"}.`,
      regHoursText,
      formattedTime: "Simulated Weekend",
      nextOpenText: `Monday at ${isIndian ? "09:15 AM IST" : "09:30 AM ET"}`,
      countdownSeconds: 120400,
      isSimulated: true,
    };
  }

  if (simulationMode === "force_closed_holiday") {
    return {
      ticker,
      exchange: ex,
      marketName,
      timeZone,
      tzAbbr,
      isOpen: false,
      status: "CLOSED_HOLIDAY",
      session: "Exchange Holiday",
      reason: "Official Exchange Holiday",
      message: `${marketName} is closed for an official exchange holiday. Live trading will resume on the next business day.`,
      regHoursText,
      formattedTime: "Simulated Holiday",
      nextOpenText: `Next Business Day at ${isIndian ? "09:15 AM IST" : "09:30 AM ET"}`,
      countdownSeconds: 86400,
      isSimulated: true,
    };
  }

  if (simulationMode === "force_closed_after_hours") {
    return {
      ticker,
      exchange: ex,
      marketName,
      timeZone,
      tzAbbr,
      isOpen: false,
      status: "CLOSED_AFTER_HOURS",
      session: "Closed (After-Hours)",
      reason: "Outside regular trading hours",
      message: `${marketName} regular trading session has ended for today. Trading resumes tomorrow morning.`,
      regHoursText,
      formattedTime: "Simulated After-Hours",
      nextOpenText: `Tomorrow at ${isIndian ? "09:15 AM IST" : "09:30 AM ET"}`,
      countdownSeconds: 43200,
      isSimulated: true,
    };
  }

  if (simulationMode === "force_open") {
    return {
      ticker,
      exchange: ex,
      marketName,
      timeZone,
      tzAbbr,
      isOpen: true,
      status: "OPEN",
      session: "Regular Trading Session",
      reason: "Live market trading active",
      message: `${marketName} regular trading session is currently open until ${isIndian ? "03:30 PM IST" : "04:00 PM ET"}.`,
      regHoursText,
      formattedTime: "Simulated Active Session",
      nextOpenText: "Currently Active",
      countdownSeconds: 0,
      isSimulated: true,
    };
  }

  // Real-time evaluation
  const parts = getTimezoneDateParts(currentTime, timeZone);
  const { hour, minute, second, dayOfWeek, dateString } = parts;

  const currentMinutes = hour * 60 + minute;
  const openMinutes = regularOpenHour * 60 + regularOpenMin;
  const closeMinutes = regularCloseHour * 60 + regularCloseMin;

  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
  const holidayName = holidays[dateString];
  const isHoliday = Boolean(holidayName);

  let isOpen = false;
  let status = "CLOSED";
  let session = "Closed";
  let reason = "";
  let message = "";

  const openTimeFormatted = `${regularOpenHour.toString().padStart(2, "0")}:${regularOpenMin
    .toString()
    .padStart(2, "0")} ${regularOpenHour >= 12 ? "PM" : "AM"}`;
  const closeTimeFormatted = `${(regularCloseHour % 12 || 12).toString().padStart(2, "0")}:${regularCloseMin
    .toString()
    .padStart(2, "0")} PM`;

  if (isWeekend) {
    const dayName = dayOfWeek === 6 ? "Saturday" : "Sunday";
    status = "CLOSED_WEEKEND";
    session = "Weekend Halt";
    reason = `Weekend closure (${dayName})`;
    message = `${marketName} is closed for the weekend (${dayName}). Regular trading sessions resume on Monday at ${openTimeFormatted} ${tzAbbr}.`;
  } else if (isHoliday) {
    status = "CLOSED_HOLIDAY";
    session = "Exchange Holiday";
    reason = `Official Holiday: ${holidayName}`;
    message = `${marketName} is closed today for ${holidayName}. Regular trading resumes on the next scheduled business day.`;
  } else if (currentMinutes >= openMinutes && currentMinutes < closeMinutes) {
    isOpen = true;
    status = "OPEN";
    session = "Regular Trading";
    reason = "Live trading session active";
    message = `${marketName} regular trading session is currently open until ${closeTimeFormatted} ${tzAbbr}.`;
  } else if (currentMinutes < openMinutes) {
    const isPreMarket = isIndian ? currentMinutes >= 9 * 60 : currentMinutes >= 4 * 60;
    status = isPreMarket ? "CLOSED_PRE_MARKET" : "CLOSED_AFTER_HOURS";
    session = isPreMarket ? "Pre-Market Session" : "Closed (Pre-Open)";
    reason = `Session opens at ${openTimeFormatted} ${tzAbbr}`;
    message = `${marketName} is closed. Today's regular trading bell rings at ${openTimeFormatted} ${tzAbbr}.`;
  } else {
    status = "CLOSED_AFTER_HOURS";
    session = "Closed (Post-Market)";
    reason = `Session closed at ${closeTimeFormatted} ${tzAbbr}`;
    message = `${marketName} regular trading has ended for today. Resumes next trading morning at ${openTimeFormatted} ${tzAbbr}.`;
  }

  // Calculate Next Open
  const nextOpenInfo = getNextOpenDetails(parts, openMinutes, holidays, isIndian, tzAbbr);

  const formattedTime = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(currentTime) + ` ${tzAbbr}`;

  return {
    ticker,
    exchange: ex,
    marketName,
    timeZone,
    tzAbbr,
    isOpen,
    status,
    session,
    reason,
    message,
    regHoursText,
    formattedTime,
    nextOpenText: nextOpenInfo.label,
    countdownSeconds: nextOpenInfo.seconds,
    isSimulated: false,
  };
};

/**
 * Calculate upcoming opening session date and remaining seconds.
 */
function getNextOpenDetails(parts, openMinutes, holidays, isIndian, tzAbbr) {
  const { hour, minute, second, dayOfWeek, year, month, day } = parts;
  const currentMinutes = hour * 60 + minute;

  const openHour = isIndian ? 9 : 9;
  const openMin = isIndian ? 15 : 30;
  const openTimeFormatted = `${openHour.toString().padStart(2, "0")}:${openMin
    .toString()
    .padStart(2, "0")} AM`;

  // Helper to format ISO date YYYY-MM-DD
  const toIsoDate = (d) => {
    const y = d.getFullYear();
    const m = (d.getMonth() + 1).toString().padStart(2, "0");
    const dt = d.getDate().toString().padStart(2, "0");
    return `${y}-${m}-${dt}`;
  };

  const currentDateObj = new Date(Date.UTC(year, month - 1, day, hour, minute, second));

  // If today is weekday and before open and not holiday, next open is today!
  const todayIso = toIsoDate(currentDateObj);
  if (dayOfWeek >= 1 && dayOfWeek <= 5 && !holidays[todayIso] && currentMinutes < openMinutes) {
    const diffSecs = (openMinutes - currentMinutes) * 60 - second;
    return {
      label: `Today at ${openTimeFormatted} ${tzAbbr}`,
      seconds: Math.max(0, diffSecs),
    };
  }

  // Otherwise scan tomorrow through next 10 days
  for (let offset = 1; offset <= 14; offset++) {
    const checkDate = new Date(Date.UTC(year, month - 1, day + offset, openHour, openMin, 0));
    const dow = checkDate.getUTCDay();
    const iso = toIsoDate(checkDate);

    // Skip Saturday (6) and Sunday (0)
    if (dow === 0 || dow === 6) continue;
    // Skip holidays
    if (holidays[iso]) continue;

    const weekdayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const diffMs = checkDate.getTime() - currentDateObj.getTime();
    const diffSecs = Math.max(0, Math.floor(diffMs / 1000));

    const dayLabel = offset === 1 ? "Tomorrow" : `${weekdayNames[dow]}, ${monthNames[checkDate.getUTCMonth()]} ${checkDate.getUTCDate()}`;

    return {
      label: `${dayLabel} at ${openTimeFormatted} ${tzAbbr}`,
      seconds: diffSecs,
    };
  }

  return {
    label: `Monday at ${openTimeFormatted} ${tzAbbr}`,
    seconds: 86400,
  };
}

/**
 * Format countdown seconds into human-readable e.g. "1d 22h 45m 12s" or "45m 12s".
 */
export const formatCountdown = (totalSeconds) => {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return "Opening soon";

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};
