/**
 * Equitix Demo Portfolio Service
 * 
 * Manages an isolated, in-memory/session-only paper trading sandbox.
 * All demo portfolios, holdings, and transactions are stored strictly in sessionStorage.
 * NO data is ever persisted to PostgreSQL / Supabase database.
 * 
 * Once the browser tab or session is closed, sessionStorage is automatically cleared
 * by the browser engine, returning the user to the login screen and wiping all demo data.
 */

const DEMO_STORAGE_KEY = "equitix_demo_portfolios";

const getInitialDemoPortfolios = () => [
  {
    id: "demo-portfolio-alpha",
    user_id: "demo-user-session",
    name: "Demo Alpha Portfolio",
    cash_balance: 500000.0, // ₹5,00,000 / $50,000 equivalent demo capital
    created_at: new Date().toISOString(),
    holdings: [
      {
        id: "demo-h-1",
        ticker: "AAPL",
        company_name: "Apple Inc.",
        shares: 20,
        average_price: 220.5,
        current_price: 232.1,
        invested_value: 4410.0,
        current_value: 4642.0,
        unrealized_pnl: 232.0,
        unrealized_pnl_percent: 5.26,
      },
      {
        id: "demo-h-2",
        ticker: "NVDA",
        company_name: "NVIDIA Corp.",
        shares: 35,
        average_price: 125.0,
        current_price: 142.8,
        invested_value: 4375.0,
        current_value: 4998.0,
        unrealized_pnl: 623.0,
        unrealized_pnl_percent: 14.24,
      },
      {
        id: "demo-h-3",
        ticker: "RELIANCE.NS",
        company_name: "Reliance Industries Ltd.",
        shares: 50,
        average_price: 2850.0,
        current_price: 2985.0,
        invested_value: 142500.0,
        current_value: 149250.0,
        unrealized_pnl: 6750.0,
        unrealized_pnl_percent: 4.74,
      },
      {
        id: "demo-h-4",
        ticker: "MSFT",
        company_name: "Microsoft Corp.",
        shares: 15,
        average_price: 410.0,
        current_price: 428.5,
        invested_value: 6150.0,
        current_value: 6427.5,
        unrealized_pnl: 277.5,
        unrealized_pnl_percent: 4.51,
      },
    ],
  },
];

const loadPortfoliosFromSession = () => {
  try {
    const raw = sessionStorage.getItem(DEMO_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn("Failed to load demo portfolios from sessionStorage:", err);
  }
  const defaults = getInitialDemoPortfolios();
  savePortfoliosToSession(defaults);
  return defaults;
};

const savePortfoliosToSession = (portfolios) => {
  try {
    sessionStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(portfolios));
  } catch (err) {
    console.warn("Failed to save demo portfolios to sessionStorage:", err);
  }
};

const computePortfolioSummary = (portfolio) => {
  const holdings = portfolio.holdings || [];
  let holdings_value = 0;
  let total_invested = 0;

  for (const h of holdings) {
    holdings_value += Number(h.current_value) || 0;
    total_invested += Number(h.invested_value) || 0;
  }

  const cash_balance = Number(portfolio.cash_balance) || 0;
  const total_value = cash_balance + holdings_value;
  const total_unrealized_pnl = holdings_value - total_invested;
  const total_unrealized_pnl_percent =
    total_invested > 0 ? (total_unrealized_pnl / total_invested) * 100 : 0;

  return {
    id: portfolio.id,
    user_id: portfolio.user_id || "demo-user-session",
    name: portfolio.name,
    cash_balance: Math.round(cash_balance * 100) / 100,
    holdings_value: Math.round(holdings_value * 100) / 100,
    total_value: Math.round(total_value * 100) / 100,
    total_invested: Math.round(total_invested * 100) / 100,
    total_unrealized_pnl: Math.round(total_unrealized_pnl * 100) / 100,
    total_unrealized_pnl_percent: Math.round(total_unrealized_pnl_percent * 100) / 100,
    created_at: portfolio.created_at || new Date().toISOString(),
    holdings,
  };
};

/**
 * Initialize demo session with default portfolios if not already loaded.
 */
export const initDemoSession = () => {
  return loadPortfoliosFromSession();
};

/**
 * Fetch list of demo portfolios (PortfolioListItem[])
 */
export const demoFetchPortfolios = async () => {
  const portfolios = loadPortfoliosFromSession();
  return portfolios.map((p) => ({
    id: p.id,
    name: p.name,
    cash_balance: Number(p.cash_balance) || 0,
    holdings_count: (p.holdings || []).length,
    created_at: p.created_at,
  }));
};

/**
 * Create a new demo portfolio in sessionStorage
 */
export const demoCreatePortfolio = async ({ name, initial_cash }) => {
  const portfolios = loadPortfoliosFromSession();
  const newPortfolio = {
    id: `demo-portfolio-${Date.now()}`,
    user_id: "demo-user-session",
    name: (name || "New Demo Portfolio").trim(),
    cash_balance: Math.max(0, Number(initial_cash) || 10000),
    created_at: new Date().toISOString(),
    holdings: [],
  };
  portfolios.push(newPortfolio);
  savePortfoliosToSession(portfolios);
  return computePortfolioSummary(newPortfolio);
};

/**
 * Retrieve detailed summary & live holdings of a demo portfolio
 */
export const demoFetchPortfolioDetail = async (portfolioId) => {
  const portfolios = loadPortfoliosFromSession();
  let target = portfolios.find((p) => p.id === portfolioId);
  if (!target && portfolios.length > 0) {
    target = portfolios[0];
  }
  if (!target) {
    const defaults = getInitialDemoPortfolios();
    savePortfoliosToSession(defaults);
    return computePortfolioSummary(defaults[0]);
  }
  return computePortfolioSummary(target);
};

/**
 * Execute a simulated Buy or Sell transaction against the demo session portfolio
 */
export const demoExecuteTransaction = async ({ portfolioId, ticker, action, shares, price }) => {
  const parsedShares = Number(shares);
  const parsedPrice = Number(price);

  if (!parsedShares || parsedShares <= 0) {
    throw new Error("Number of shares must be greater than 0");
  }
  if (!parsedPrice || parsedPrice <= 0) {
    throw new Error("Execution price must be greater than 0");
  }

  const portfolios = loadPortfoliosFromSession();
  let portfolio = portfolios.find((p) => p.id === portfolioId);
  if (!portfolio) {
    portfolio = portfolios[0];
  }
  if (!portfolio) {
    throw new Error("Demo portfolio not found.");
  }

  const cleanTicker = ticker.toUpperCase().trim();
  const totalAmount = parsedShares * parsedPrice;

  if (action === "BUY") {
    if (portfolio.cash_balance < totalAmount) {
      throw new Error(
        `Insufficient cash balance. Available: ₹${portfolio.cash_balance.toLocaleString("en-IN")}, Required: ₹${totalAmount.toLocaleString("en-IN")}`
      );
    }

    portfolio.cash_balance -= totalAmount;

    let holding = portfolio.holdings.find((h) => h.ticker.toUpperCase() === cleanTicker);
    if (holding) {
      const prevShares = holding.shares;
      const prevInvested = holding.invested_value;
      const newShares = prevShares + parsedShares;
      const newInvested = prevInvested + totalAmount;

      holding.shares = newShares;
      holding.invested_value = Math.round(newInvested * 100) / 100;
      holding.average_price = Math.round((newInvested / newShares) * 100) / 100;
      holding.current_price = parsedPrice;
      holding.current_value = Math.round(newShares * parsedPrice * 100) / 100;
      holding.unrealized_pnl = Math.round((holding.current_value - holding.invested_value) * 100) / 100;
      holding.unrealized_pnl_percent =
        holding.invested_value > 0
          ? Math.round((holding.unrealized_pnl / holding.invested_value) * 10000) / 100
          : 0;
    } else {
      portfolio.holdings.push({
        id: `demo-h-${Date.now()}`,
        ticker: cleanTicker,
        company_name: cleanTicker,
        shares: parsedShares,
        average_price: parsedPrice,
        current_price: parsedPrice,
        invested_value: Math.round(totalAmount * 100) / 100,
        current_value: Math.round(totalAmount * 100) / 100,
        unrealized_pnl: 0,
        unrealized_pnl_percent: 0,
      });
    }
  } else if (action === "SELL") {
    const holdingIndex = portfolio.holdings.findIndex(
      (h) => h.ticker.toUpperCase() === cleanTicker
    );
    if (holdingIndex === -1) {
      throw new Error(`You do not own any shares of ${cleanTicker} to sell.`);
    }

    const holding = portfolio.holdings[holdingIndex];
    if (holding.shares < parsedShares) {
      throw new Error(
        `Insufficient shares to sell. You currently own ${holding.shares} shares of ${cleanTicker}.`
      );
    }

    portfolio.cash_balance += totalAmount;

    if (holding.shares === parsedShares) {
      portfolio.holdings.splice(holdingIndex, 1);
    } else {
      const costBasisOfSold = parsedShares * holding.average_price;
      const newShares = holding.shares - parsedShares;
      const newInvested = Math.max(0, holding.invested_value - costBasisOfSold);

      holding.shares = newShares;
      holding.invested_value = Math.round(newInvested * 100) / 100;
      holding.current_price = parsedPrice;
      holding.current_value = Math.round(newShares * parsedPrice * 100) / 100;
      holding.unrealized_pnl = Math.round((holding.current_value - holding.invested_value) * 100) / 100;
      holding.unrealized_pnl_percent =
        holding.invested_value > 0
          ? Math.round((holding.unrealized_pnl / holding.invested_value) * 10000) / 100
          : 0;
    }
  } else {
    throw new Error(`Unsupported transaction action: ${action}`);
  }

  savePortfoliosToSession(portfolios);
  return computePortfolioSummary(portfolio);
};

/**
 * Delete a demo portfolio from sessionStorage
 */
export const demoDeletePortfolio = async (portfolioId) => {
  let portfolios = loadPortfoliosFromSession();
  portfolios = portfolios.filter((p) => p.id !== portfolioId);
  if (portfolios.length === 0) {
    portfolios = getInitialDemoPortfolios();
  }
  savePortfoliosToSession(portfolios);
  return { success: true, deleted_id: portfolioId };
};

/**
 * Clear all demo session storage keys
 */
export const clearDemoSession = () => {
  try {
    sessionStorage.removeItem(DEMO_STORAGE_KEY);
    sessionStorage.removeItem("equitix_demo_token");
    sessionStorage.removeItem("equitix_demo_user");
  } catch (e) {
    console.warn("Failed to clear demo session storage:", e);
  }
};
