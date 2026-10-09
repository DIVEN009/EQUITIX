import json
import logging
import os
import re
import difflib
from typing import List, Dict, Any, Optional, Set
from sqlalchemy.orm import Session
import yfinance as yf

from src.models.database_models import Stock

logger = logging.getLogger(__name__)

# Enterprise-grade vocabulary mappings for Indian & Global equity searches
SYNONYM_STEMS = {
    "INDUSTRIES": "INDUSTRY",
    "INDS": "INDUSTRY",
    "IND": "INDUSTRY",
    "INDUSTRY": "INDUSTRY",
    "ENTERPRISES": "ENTERPRISE",
    "ENT": "ENTERPRISE",
    "ENTERPRISE": "ENTERPRISE",
    "TECHNOLOGIES": "TECHNOLOGY",
    "TECHNOLOGY": "TECHNOLOGY",
    "TECH": "TECHNOLOGY",
    "FINANCIAL": "FINANCE",
    "FINANCE": "FINANCE",
    "FINSERV": "FINANCE",
    "FINSERVICES": "FINANCE",
    "SERVICES": "SERVICE",
    "SERVICE": "SERVICE",
    "MOTORS": "MOTOR",
    "MOTOR": "MOTOR",
    "PORTS": "PORT",
    "PORT": "PORT",
    "CHEMICALS": "CHEMICAL",
    "CHEMICAL": "CHEMICAL",
    "CHEM": "CHEMICAL",
    "PHARMACEUTICALS": "PHARMACEUTICAL",
    "PHARMACEUTICAL": "PHARMACEUTICAL",
    "PHARMA": "PHARMACEUTICAL",
    "ENERGIES": "ENERGY",
    "ENERGY": "ENERGY",
    "POWERS": "POWER",
    "POWER": "POWER",
    "PWR": "POWER",
    "ELECTRICALS": "ELECTRICAL",
    "ELECTRICAL": "ELECTRICAL",
    "ELECTRONICS": "ELECTRONIC",
    "ELECTRONIC": "ELECTRONIC",
    "TELECOMMUNICATIONS": "TELECOM",
    "TELECOMMUNICATION": "TELECOM",
    "TELECOM": "TELECOM",
    "COMMUNICATIONS": "COMMUNICATION",
    "COMMUNICATION": "COMMUNICATION",
    "TEXTILES": "TEXTILE",
    "TEXTILE": "TEXTILE",
    "STEELS": "STEEL",
    "STEEL": "STEEL",
    "MININGS": "MINING",
    "MINING": "MINING",
    "INFRASTRUCTURE": "INFRA",
    "INFRA": "INFRA",
}

STOP_WORDS = {
    "LIMITED", "LTD", "CORPORATION", "CORP", "COMPANY", "CO", "INC", "INCORPORATED",
    "PLC", "HOLDINGS", "HOLDING", "PVT", "PRIVATE", "SHARE", "SHARES", "STOCK", "STOCKS",
    "PRICE", "PRICES", "QUOTE", "QUOTES", "INDIA", "NSE", "BSE", "NS", "BO", "THE", "OF", "AND", "&"
}


def stem_token(tok: str) -> str:
    """Stem word and map industry synonyms into unified canonical terms."""
    t = tok.upper().strip()
    if t in SYNONYM_STEMS:
        return SYNONYM_STEMS[t]
    if t.endswith("IES") and len(t) > 4:
        return t[:-3] + "Y"
    if t.endswith("S") and not t.endswith("SS") and len(t) > 3:
        return t[:-1]
    return t


def extract_tokens(text: str) -> List[str]:
    """Tokenize and stem text while filtering corporate stopwords and noise words."""
    if not text:
        return []
    # Strip explicit exchange extensions before tokenization
    clean = re.sub(r"(\.NS|\.BO)$", "", text.strip(), flags=re.IGNORECASE)
    clean = re.sub(r"[^A-Z0-9\s]", " ", clean.upper())
    tokens = []
    for r in clean.split():
        if r in STOP_WORDS or len(r) < 2:
            continue
        tokens.append(stem_token(r))
    return tokens


def normalize_text(text: str) -> str:
    """Normalize text into canonical token sequence for consistent hashing & comparisons."""
    tokens = extract_tokens(text)
    return " ".join(tokens)


class SecurityMasterService:
    """
    Enterprise-grade dynamic Security Master and Symbology Discovery Engine.
    Maintains an in-memory index of 2,600+ official exchange equities and
    dynamically discovers, validates, and indexes new global stocks in real time.
    Provides typo-tolerant fuzzy symbol matching and multi-token company name resolution.
    """

    def __init__(self):
        self._stocks: List[Dict[str, Any]] = []
        self._by_ticker: Dict[str, Dict[str, Any]] = {}
        self._by_symbol: Dict[str, Dict[str, Any]] = {}
        self._all_symbols: List[str] = []
        self._by_normalized_name: Dict[str, Dict[str, Any]] = {}
        self._name_tokens: Dict[str, Set[str]] = {}
        self._initialized = False

        self._load_security_master()

    def _load_security_master(self):
        """Load official NSE equities master, popular market leaders, and global seeds."""
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

        # Index official curated popular stocks first for high-priority matching
        try:
            from src.data.popular_stocks import POPULAR_STOCKS
            for s in POPULAR_STOCKS:
                self._index_stock(s)
        except Exception as e:
            logger.debug(f"Could not preload POPULAR_STOCKS: {e}")

        # Index all equities from database seeds
        for s in loaded_stocks:
            self._index_stock(s)

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
        for s in us_leaders:
            self._index_stock(s)

        # Cache symbol list for rapid difflib fuzzy lookups
        self._all_symbols = list(self._by_symbol.keys())
        self._initialized = True

    def _index_stock(self, stock: Dict[str, Any]):
        """Index a single stock record into multiple lookup maps."""
        ticker_u = stock["ticker"].upper().strip()
        raw_sym = stock.get("symbol", ticker_u.split(".")[0]).upper().strip()

        if ticker_u not in self._by_ticker:
            self._stocks.append(stock)
            self._by_ticker[ticker_u] = stock

        # Preserve primary National Stock Exchange (.NS) precedence over secondary listings (.BO)
        if raw_sym not in self._by_symbol or (ticker_u.endswith(".NS") and not self._by_symbol[raw_sym]["ticker"].endswith(".NS")):
            self._by_symbol[raw_sym] = stock

        # Index normalized company name
        comp_name = stock.get("company_name", "")
        norm_name = normalize_text(comp_name)
        if norm_name:
            self._by_normalized_name[norm_name] = stock

        # Index unique individual stemmed tokens for multi-word queries
        tokens = set(extract_tokens(comp_name))
        tokens.add(raw_sym)
        for tok in tokens:
            if len(tok) >= 2:
                if tok not in self._name_tokens:
                    self._name_tokens[tok] = set()
                self._name_tokens[tok].add(ticker_u)

    def resolve(self, query: str, db: Optional[Session] = None) -> Optional[Dict[str, Any]]:
        """
        Dynamically resolve any user input (bare symbol, company name, partial text, typo)
        to its official exchange-qualified security record.
        Returns a dict: {'ticker': 'ALOKINDS.NS', 'company_name': '...', 'exchange': 'NSE', 'currency': 'INR'}
        """
        if not query or not query.strip():
            return None

        q_raw = query.strip()
        has_spaces = " " in q_raw

        # If input has spaces (e.g. "ALOK INDUSTRY.NS"), strip .NS so it's handled as a company name
        clean_q = re.sub(r"(\.NS|\.BO)$", "", q_raw.upper().strip(), flags=re.IGNORECASE) if has_spaces else q_raw.upper().strip()
        bare_sym = clean_q.replace(".NS", "").replace(".BO", "").strip()
        norm_q = normalize_text(clean_q)

        # 1. Exact Ticker Match (e.g. ALOKINDS.NS, AAPL)
        if clean_q in self._by_ticker:
            return self._by_ticker[clean_q]

        # 2. Exact Symbol Match (e.g. ALOKINDS -> ALOKINDS.NS)
        if bare_sym in self._by_symbol:
            return self._by_symbol[bare_sym]

        # 3. Fuzzy Symbol / Typo Match for single-word queries (e.g. ALOKEINDS -> ALOKINDS, RELIANC -> RELIANCE)
        if not has_spaces and len(bare_sym) >= 3:
            close_syms = difflib.get_close_matches(bare_sym, self._all_symbols, n=1, cutoff=0.72)
            if close_syms:
                matched_sym = close_syms[0]
                logger.info(f"SecurityMaster fuzzy resolved symbol typo '{query}' -> '{matched_sym}'")
                return self._by_symbol[matched_sym]

        # 4. Exact Normalized Company Name Match (e.g. "Alok Industries" -> "ALOK INDUSTRIES")
        if norm_q and norm_q in self._by_normalized_name:
            return self._by_normalized_name[norm_q]

        # 5. Database Security Master Lookup
        if db:
            try:
                # Direct ticker check in DB
                db_stock = db.query(Stock).filter(Stock.ticker == clean_q).first()
                if not db_stock and "." not in clean_q:
                    db_stock = db.query(Stock).filter(Stock.ticker == f"{clean_q}.NS").first()
                if db_stock:
                    item = {
                        "ticker": db_stock.ticker,
                        "symbol": db_stock.ticker.split(".")[0],
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
                    .filter(Stock.company_name.ilike(f"%{clean_q}%"))
                    .first()
                )
                if db_match:
                    item = {
                        "ticker": db_match.ticker,
                        "symbol": db_match.ticker.split(".")[0],
                        "company_name": db_match.company_name,
                        "sector": db_match.sector,
                        "exchange": "NSE" if db_match.ticker.endswith(".NS") else ("BSE" if db_match.ticker.endswith(".BO") else "US"),
                        "currency": "INR" if db_match.ticker.endswith((".NS", ".BO")) else "USD",
                    }
                    self._index_stock(item)
                    return item
            except Exception as e:
                logger.warning(f"DB security master lookup error: {e}")

        # 6. Multi-token scoring across In-Memory Security Master (handles "ALOK INDUSTRY", "ZOMATO SHARE", "TATA MOTOR")
        q_tokens = extract_tokens(clean_q)
        if q_tokens:
            candidates: Dict[str, int] = {}
            for tok in q_tokens:
                if tok in self._name_tokens:
                    for ticker in self._name_tokens[tok]:
                        candidates[ticker] = candidates.get(ticker, 0) + 1

            if candidates:
                best_ticker = None
                max_score = -1
                for ticker, count in candidates.items():
                    stk = self._by_ticker[ticker]
                    sym = stk.get("symbol", ticker.split(".")[0]).upper()
                    comp = stk.get("company_name", "").upper()

                    # Scoring weights
                    score = count * 20
                    if sym in q_tokens:
                        score += 30
                    if q_tokens and comp.startswith(q_tokens[0]):
                        score += 15
                    if ticker.endswith(".NS"):
                        score += 5

                    if score > max_score:
                        max_score = score
                        best_ticker = ticker

                # Require matching at least 50% of the query tokens (or at least 1 token if single-word)
                min_required = max(1, len(q_tokens) // 2) if len(q_tokens) > 1 else 1
                if best_ticker and candidates[best_ticker] >= min_required:
                    logger.info(f"SecurityMaster token-resolved '{query}' -> '{best_ticker}'")
                    return self._by_ticker[best_ticker]

        # 7. Live Market Fallback via yfinance Search API
        try:
            search_terms = [clean_q]
            if "INDUSTRY" in clean_q:
                search_terms.append(clean_q.replace("INDUSTRY", "INDUSTRIES"))

            for term in search_terms:
                search_obj = yf.Search(term, max_results=6)
                if search_obj and search_obj.quotes:
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

        # 8. Safe Fallback: sanitize spaces so tickers NEVER contain whitespace
        sanitized = re.sub(r"[^A-Z0-9\.]", "", clean_q)
        if not sanitized:
            return self._by_ticker.get("RELIANCE.NS")

        # Check fuzzy on sanitized string
        bare_sanitized = sanitized.replace(".NS", "").replace(".BO", "")
        if bare_sanitized in self._by_symbol:
            return self._by_symbol[bare_sanitized]
        close_sanitized = difflib.get_close_matches(bare_sanitized, self._all_symbols, n=1, cutoff=0.72)
        if close_sanitized:
            return self._by_symbol[close_sanitized[0]]

        canonical_ticker = sanitized if "." in sanitized else f"{sanitized}.NS"
        return {
            "ticker": canonical_ticker,
            "symbol": canonical_ticker.split(".")[0],
            "company_name": query.strip(),
            "exchange": "NSE" if canonical_ticker.endswith(".NS") else ("BSE" if canonical_ticker.endswith(".BO") else "US"),
            "currency": "INR" if canonical_ticker.endswith((".NS", ".BO")) else "USD",
        }

    def suggest(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Find closest valid stock suggestion when a ticker or query cannot be found.
        """
        if not query or not query.strip():
            return None

        clean = query.strip().upper().replace(".NS", "").replace(".BO", "").replace(" ", "")
        close = difflib.get_close_matches(clean, self._all_symbols, n=1, cutoff=0.60)
        if close:
            return self._by_symbol.get(close[0])

        # Token-based suggestion
        toks = extract_tokens(query)
        if toks:
            for t in toks:
                if t in self._name_tokens:
                    tickers = list(self._name_tokens[t])
                    if tickers:
                        return self._by_ticker.get(tickers[0])

        return None

    def search(self, query: str, limit: int = 15, db: Optional[Session] = None) -> List[Dict[str, Any]]:
        """
        Execute high-performance autocomplete search across all tracked equities.
        Scored by: exact ticker > symbol prefix > exact company name > company name prefix >
                   all token match > substring match > fuzzy symbol match.
        """
        if not query or not query.strip():
            return self._stocks[:limit]

        q_clean = query.strip().upper()
        clean_no_ext = q_clean.replace(".NS", "").replace(".BO", "")
        norm_q = normalize_text(q_clean)
        q_tokens = set(extract_tokens(q_clean))

        scored_results: List[Tuple[int, Dict[str, Any]]] = []
        seen = set()

        for s in self._stocks:
            ticker_u = s["ticker"].upper()
            raw_sym = s.get("symbol", ticker_u.split(".")[0]).upper()
            comp_u = (s.get("company_name") or "").upper()
            norm_comp = normalize_text(comp_u)
            comp_tokens = set(extract_tokens(comp_u))

            score = 100
            # 1. Exact symbol / ticker match
            if ticker_u == q_clean or raw_sym == q_clean or raw_sym == clean_no_ext:
                score = 0 if ticker_u.endswith(".NS") else 1
            # 2. Symbol starts with query
            elif raw_sym.startswith(clean_no_ext) or ticker_u.startswith(q_clean):
                score = 2 if ticker_u.endswith(".NS") else 3
            # 3. Exact normalized name
            elif norm_comp and norm_comp == norm_q:
                score = 4 if ticker_u.endswith(".NS") else 5
            # 4. Company name starts with query
            elif norm_comp.startswith(norm_q) or comp_u.startswith(q_clean):
                score = 6 if ticker_u.endswith(".NS") else 7
            # 5. Query tokens subset of company tokens (e.g. "alok industry" -> "Alok Industries Limited")
            elif q_tokens and q_tokens.issubset(comp_tokens):
                score = 8 if ticker_u.endswith(".NS") else 9
            # 6. Substring match in company name
            elif q_clean in comp_u or (norm_q and norm_q in norm_comp):
                score = 10 if ticker_u.endswith(".NS") else 11
            # 7. Fuzzy symbol typo match (e.g. "alokeinds" -> "ALOKINDS")
            elif len(clean_no_ext) >= 3 and difflib.SequenceMatcher(None, clean_no_ext, raw_sym).ratio() >= 0.70:
                score = 12 if ticker_u.endswith(".NS") else 13
            # 8. Partial token overlap (at least 1 significant token matches)
            elif q_tokens and any(t in comp_tokens for t in q_tokens if len(t) >= 3):
                overlap = len(q_tokens.intersection(comp_tokens))
                score = (25 - overlap) if ticker_u.endswith(".NS") else (27 - overlap)
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
