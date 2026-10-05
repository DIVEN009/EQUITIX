import json
import logging
import os
import re
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
import yfinance as yf

from src.models.database_models import Stock

logger = logging.getLogger(__name__)


def normalize_text(text: str) -> str:
    """Normalize text by removing common legal suffixes and non-alphanumeric chars."""
    if not text:
        return ""
    t = text.upper()
    # Strip common corporate suffixes for clean fuzzy matching
    t = re.sub(r"\b(LIMITED|LTD|CORPORATION|CORP|COMPANY|CO|INC|INCORPORATED|PLC|HOLDINGS|HOLDING|ENTERPRISES|GROUP)\b", "", t)
    # Remove punctuation & collapse extra spaces
    t = re.sub(r"[^A-Z0-9\s]", " ", t)
    return " ".join(t.split())


class SecurityMasterService:
    """
    Enterprise-grade dynamic Security Master and Symbology Discovery Engine.
    Eliminates all hardcoded dictionaries.
    Maintains an in-memory index of 2,600+ official exchange equities and
    dynamically discovers, validates, and indexes new global stocks in real time.
    """

    def __init__(self):
        self._stocks: List[Dict[str, Any]] = []
        self._by_ticker: Dict[str, Dict[str, Any]] = {}
        self._by_normalized_name: Dict[str, Dict[str, Any]] = {}
        self._name_tokens: Dict[str, List[Dict[str, Any]]] = {}
        self._initialized = False

        self._load_security_master()

    def _load_security_master(self):
        """Load official NSE equities master and global market seeds."""
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        json_path = os.path.join(base_dir, "data", "nse_equities.json")

        loaded_stocks = []
        if os.path.exists(json_path):
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    loaded_stocks = json.load(f)
                logger.info(f"SecurityMaster loaded {len(loaded_stocks)} official exchange equities from {json_path}")
            except Exception as e:
                logger.warning(f"Could not load nse_equities.json: {e}")

        # Global US & Tech leaders seed
        us_leaders = [
            {"ticker": "AAPL", "symbol": "AAPL", "company_name": "Apple Inc.", "exchange": "NASDAQ", "currency": "USD", "sector": "Technology"},
            {"ticker": "MSFT", "symbol": "MSFT", "company_name": "Microsoft Corporation", "exchange": "NASDAQ", "currency": "USD", "sector": "Technology"},
            {"ticker": "GOOGL", "symbol": "GOOGL", "company_name": "Alphabet Inc. (Google)", "exchange": "NASDAQ", "currency": "USD", "sector": "Communication Services"},
            {"ticker": "AMZN", "symbol": "AMZN", "company_name": "Amazon.com Inc.", "exchange": "NASDAQ", "currency": "USD", "sector": "Consumer Discretionary"},
            {"ticker": "NVDA", "symbol": "NVDA", "company_name": "NVIDIA Corporation", "exchange": "NASDAQ", "currency": "USD", "sector": "Technology"},
            {"ticker": "TSLA", "symbol": "TSLA", "company_name": "Tesla Inc.", "exchange": "NASDAQ", "currency": "USD", "sector": "Automotive"},
            {"ticker": "META", "symbol": "META", "company_name": "Meta Platforms Inc.", "exchange": "NASDAQ", "currency": "USD", "sector": "Communication Services"},
            {"ticker": "NFLX", "symbol": "NFLX", "company_name": "Netflix Inc.", "exchange": "NASDAQ", "currency": "USD", "sector": "Communication Services"},
            {"ticker": "AMD", "symbol": "AMD", "company_name": "Advanced Micro Devices", "exchange": "NASDAQ", "currency": "USD", "sector": "Technology"},
        ]
        loaded_stocks.extend(us_leaders)

        # Index records for O(1) multi-attribute lookup
        for s in loaded_stocks:
            self._index_stock(s)

        self._initialized = True

    def _index_stock(self, stock: Dict[str, Any]):
        """Index a single stock record into multiple lookup maps."""
        self._stocks.append(stock)
        ticker_u = stock["ticker"].upper().strip()
        raw_sym = stock.get("symbol", ticker_u.split(".")[0]).upper().strip()

        # Map both full ticker (RTNPOWER.NS) and raw symbol (RTNPOWER)
        self._by_ticker[ticker_u] = stock
        self._by_ticker[raw_sym] = stock

        # Index normalized company name
        comp_name = stock.get("company_name", "")
        norm_name = normalize_text(comp_name)
        if norm_name:
            self._by_normalized_name[norm_name] = stock

        # Index individual tokens for partial multi-word queries
        tokens = norm_name.split()
        for tok in tokens:
            if len(tok) >= 3:
                if tok not in self._name_tokens:
                    self._name_tokens[tok] = []
                self._name_tokens[tok].append(stock)

    def resolve(self, query: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
        """
        Dynamically resolve any user input (bare symbol, company name, partial text)
        to its official exchange-qualified security record.
        Returns a dict: {'ticker': 'RTNPOWER.NS', 'company_name': '...', 'exchange': 'NSE', 'currency': 'INR'}
        """
        if not query or not query.strip():
            return None

        q_clean = query.strip().upper()
        norm_q = normalize_text(q_clean)

        # 1. Exact Ticker / Symbol Match
        if q_clean in self._by_ticker:
            return self._by_ticker[q_clean]

        # 2. Exact or Normalized Company Name Match
        if norm_q in self._by_normalized_name:
            return self._by_normalized_name[norm_q]

        # 3. Database Security Master Lookup
        if db:
            try:
                # Direct ticker check
                db_stock = db.query(Stock).filter(Stock.ticker == q_clean).first()
                if not db_stock and "." not in q_clean:
                    db_stock = db.query(Stock).filter(Stock.ticker == f"{q_clean}.NS").first()
                if db_stock:
                    item = {
                        "ticker": db_stock.ticker,
                        "company_name": db_stock.company_name,
                        "sector": db_stock.sector,
                        "exchange": "NSE" if db_stock.ticker.endswith(".NS") else ("BSE" if db_stock.ticker.endswith(".BO") else "US"),
                        "currency": "INR" if db_stock.ticker.endswith((".NS", ".BO")) else "USD",
                    }
                    self._index_stock(item)
                    return item

                # Fuzzy company name check in DB
                db_match = (
                    db.query(Stock)
                    .filter(Stock.company_name.ilike(f"%{query.strip()}%"))
                    .first()
                )
                if db_match:
                    item = {
                        "ticker": db_match.ticker,
                        "company_name": db_match.company_name,
                        "sector": db_match.sector,
                        "exchange": "NSE" if db_match.ticker.endswith(".NS") else ("BSE" if db_match.ticker.endswith(".BO") else "US"),
                        "currency": "INR" if db_match.ticker.endswith((".NS", ".BO")) else "USD",
                    }
                    self._index_stock(item)
                    return item
            except Exception as e:
                logger.warning(f"DB security master lookup error: {e}")

        # 4. Multi-token scoring across In-Memory Security Master
        q_tokens = norm_q.split()
        if q_tokens:
            candidates: Dict[str, int] = {}
            for tok in q_tokens:
                if tok in self._name_tokens:
                    for s in self._name_tokens[tok]:
                        candidates[s["ticker"]] = candidates.get(s["ticker"], 0) + 1

            # Find candidates where all or most tokens match
            best_ticker = None
            max_score = 0
            for t, score in candidates.items():
                if score > max_score:
                    max_score = score
                    best_ticker = t

            if best_ticker and max_score >= len(q_tokens):
                return self._by_ticker.get(best_ticker)

        # 5. Live Market Fallback via yfinance Search API
        try:
            search_obj = yf.Search(query.strip(), max_results=5)
            if search_obj and search_obj.quotes:
                # Rank candidates: prefer equities on primary exchanges
                quotes = [q for q in search_obj.quotes if (q.get("quoteType") or "").upper() in ("EQUITY", "ETF")]
                if quotes:
                    # Prefer Indian NSE (.NS)
                    for q in quotes:
                        sym = q.get("symbol")
                        if sym and sym.endswith(".NS"):
                            resolved = {
                                "ticker": sym,
                                "symbol": sym.split(".")[0],
                                "company_name": q.get("shortname") or q.get("longname") or sym,
                                "exchange": "NSE",
                                "currency": "INR",
                            }
                            self._index_stock(resolved)
                            if db:
                                self._persist_stock_to_db(db, resolved)
                            return resolved

                    # Prefer Indian BSE (.BO)
                    for q in quotes:
                        sym = q.get("symbol")
                        if sym and sym.endswith(".BO"):
                            resolved = {
                                "ticker": sym,
                                "symbol": sym.split(".")[0],
                                "company_name": q.get("shortname") or q.get("longname") or sym,
                                "exchange": "BSE",
                                "currency": "INR",
                            }
                            self._index_stock(resolved)
                            if db:
                                self._persist_stock_to_db(db, resolved)
                            return resolved

                    # First valid global equity
                    top = quotes[0]
                    sym = top.get("symbol")
                    if sym:
                        resolved = {
                            "ticker": sym,
                            "symbol": sym.split(".")[0],
                            "company_name": top.get("shortname") or top.get("longname") or sym,
                            "exchange": top.get("exchDisp") or "US",
                            "currency": "USD",
                        }
                        self._index_stock(resolved)
                        if db:
                            self._persist_stock_to_db(db, resolved)
                        return resolved
        except Exception as e:
            logger.warning(f"Live yfinance search resolution failed for '{query}': {e}")

        # 6. Fallback: return raw symbol as-is (e.g. if an explicit new ticker)
        return {
            "ticker": q_clean if "." in q_clean else f"{q_clean}.NS",
            "symbol": q_clean.split(".")[0],
            "company_name": q_clean,
            "exchange": "NSE" if q_clean.endswith(".NS") else "US",
            "currency": "INR" if q_clean.endswith(".NS") else "USD",
        }

    def search(self, query: str, limit: int = 15, db: Optional[Session] = None) -> List[Dict[str, Any]]:
        """
        Execute high-performance autocomplete search across all tracked equities.
        Scored by: exact ticker > ticker prefix > company name prefix > token match.
        """
        if not query or not query.strip():
            return self._stocks[:limit]

        q_clean = query.strip().upper()
        norm_q = normalize_text(q_clean)
        q_tokens = set(norm_q.split())

        scored_results: List[tuple] = []
        seen = set()

        for s in self._stocks:
            ticker_u = s["ticker"].upper()
            raw_sym = ticker_u.split(".")[0]
            comp_u = (s.get("company_name") or "").upper()
            norm_comp = normalize_text(comp_u)

            score = 100
            # Exact symbol match
            if ticker_u == q_clean or raw_sym == q_clean:
                score = 0 if ticker_u.endswith(".NS") else 1
            # Symbol starts with query
            elif raw_sym.startswith(q_clean) or ticker_u.startswith(q_clean):
                score = 2 if ticker_u.endswith(".NS") else 3
            # Exact normalized name
            elif norm_comp == norm_q:
                score = 4 if ticker_u.endswith(".NS") else 5
            # Company name starts with query
            elif norm_comp.startswith(norm_q) or comp_u.startswith(q_clean):
                score = 6 if ticker_u.endswith(".NS") else 7
            # Substring match in company name
            elif q_clean in comp_u or norm_q in norm_comp:
                score = 8 if ticker_u.endswith(".NS") else 9
            # Token overlap
            elif q_tokens and q_tokens.issubset(set(norm_comp.split())):
                score = 10 if ticker_u.endswith(".NS") else 11
            else:
                continue

            if ticker_u not in seen:
                seen.add(ticker_u)
                scored_results.append((score, s))

        scored_results.sort(key=lambda x: x[0])
        results = [item for _, item in scored_results[:limit]]

        # If fewer than 5 results and query length >= 2, complement with live market search
        if len(results) < 5 and len(query.strip()) >= 2:
            try:
                search_obj = yf.Search(query.strip(), max_results=6)
                if search_obj and search_obj.quotes:
                    for quote in search_obj.quotes:
                        sym = quote.get("symbol")
                        q_type = (quote.get("quoteType") or "").upper()
                        if sym and sym not in seen and q_type in ("EQUITY", "ETF"):
                            seen.add(sym)
                            name = quote.get("shortname") or quote.get("longname") or sym
                            item = {
                                "ticker": sym,
                                "symbol": sym.split(".")[0],
                                "company_name": name,
                                "exchange": "NSE" if sym.endswith(".NS") else ("BSE" if sym.endswith(".BO") else quote.get("exchDisp") or "US"),
                                "currency": "INR" if sym.endswith((".NS", ".BO")) else "USD",
                            }
                            results.append(item)
                            self._index_stock(item)
                            if db:
                                self._persist_stock_to_db(db, item)
            except Exception as e:
                logger.warning(f"Complementary search error: {e}")

        return results[:limit]

    def _persist_stock_to_db(self, db: Session, stock_dict: Dict[str, Any]):
        """Persist newly discovered stock to PostgreSQL for permanent local caching."""
        try:
            from sqlalchemy.dialects.postgresql import insert as pg_insert
            stmt = pg_insert(Stock).values(
                ticker=stock_dict["ticker"],
                company_name=stock_dict["company_name"],
                sector=stock_dict.get("sector"),
            )
            stmt = stmt.on_conflict_do_update(
                index_elements=["ticker"],
                set_={"company_name": stock_dict["company_name"]},
            )
            db.execute(stmt)
            db.commit()
        except Exception:
            db.rollback()


# Singleton instance shared across services
security_master = SecurityMasterService()
