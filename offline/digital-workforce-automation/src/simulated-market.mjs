import crypto from 'node:crypto';

function seedNumber(value) {
  return Number.parseInt(crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 8), 16);
}

function rng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function assertConfig(config) {
  if (config?.mode !== 'OFFLINE_SIMULATION') throw new Error('Market mode must be OFFLINE_SIMULATION.');
  if (config.currency?.realMoneyValue !== 0 || config.currency?.redeemable !== false) throw new Error('Simulation currency must have zero real-money value and be non-redeemable.');
  if (config.adminControls?.realTradingEnabled !== false || config.adminControls?.productionWritesEnabled !== false) throw new Error('Real trading and production writes must remain disabled.');
  if (config.market?.allowLeverage !== false || config.market?.allowShortSelling !== false) throw new Error('Leverage and short selling must remain disabled.');
}

export function resolveParticipants(config, portalParticipants = []) {
  if (Array.isArray(portalParticipants) && portalParticipants.length) {
    return portalParticipants.map((item) => ({
      id: String(item.id),
      displayName: String(item.displayName ?? item.name ?? item.id),
      startingCash: Number(item.startingCash ?? 10000),
      riskProfile: item.riskProfile ?? 'balanced',
      initialUnits: Number(item.initialUnits ?? item.positionUnits ?? 0)
    }));
  }
  if (!config.participants?.fallbackAllowed) throw new Error('Portal participants are required.');
  return config.participants.fallbackProfiles.map((item) => ({ ...item, initialUnits: Number(item.initialUnits ?? 0) }));
}

export function simulateMarketDay({ config, date, previousSnapshot = null, portalParticipants = [], signals = [] }) {
  assertConfig(config);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('Date must use YYYY-MM-DD.');

  const participants = resolveParticipants(config, portalParticipants);
  const symbol = config.currency.portalSymbol ?? config.currency.fallbackSymbol;
  const priorPrice = Number(previousSnapshot?.market?.close ?? config.market.openingPrice);
  const random = rng(seedNumber(`${symbol}|${date}|market-v1`));
  const signalScore = signals.reduce((sum, signal) => sum + clamp(Number(signal.impact ?? 0), -1, 1), 0);
  const randomMove = (random() - 0.5) * 2;
  const movePct = clamp((randomMove * 0.6 + signalScore * 0.4) * config.market.maximumDailyMovePct, -config.market.maximumDailyMovePct, config.market.maximumDailyMovePct);
  const close = round(Math.max(config.market.minimumPrice, priorPrice * (1 + movePct / 100)), config.currency.decimals);
  const spread = close * config.market.spreadBps / 10000;
  const bid = round(close - spread / 2, config.currency.decimals);
  const ask = round(close + spread / 2, config.currency.decimals);

  const previousById = new Map((previousSnapshot?.participants ?? []).map((item) => [item.id, item]));
  const simulatedParticipants = participants.map((participant, index) => {
    const previous = previousById.get(participant.id);
    let cash = Number(previous?.cash ?? participant.startingCash);
    let units = Number(previous?.units ?? participant.initialUnits ?? 0);
    const riskFactor = participant.riskProfile === 'active' ? 1 : participant.riskProfile === 'conservative' ? 0.35 : 0.65;
    const direction = random() > 0.5 ? 'BUY' : 'SELL';
    const desiredNotional = round(Math.min(config.market.maxOrderNotional, cash * 0.12 * riskFactor), 2);
    let executedUnits = 0;
    let executedNotional = 0;

    if (direction === 'BUY' && desiredNotional >= ask) {
      executedUnits = Math.min(Math.floor(desiredNotional / ask), Math.max(0, config.market.maxPositionUnits - units));
      executedNotional = round(executedUnits * ask, 2);
      cash = round(cash - executedNotional, 2);
      units += executedUnits;
    } else if (direction === 'SELL' && units > 0) {
      executedUnits = Math.min(units, Math.max(1, Math.floor(units * 0.2 * riskFactor)));
      executedNotional = round(executedUnits * bid, 2);
      cash = round(cash + executedNotional, 2);
      units -= executedUnits;
    }

    const portfolioValue = round(cash + units * close, 2);
    const previousValue = Number(previous?.portfolioValue ?? participant.startingCash + participant.initialUnits * priorPrice);
    const dailyPnl = round(portfolioValue - previousValue, 2);
    const rewardCandidates = [
      executedUnits > 0 ? config.incentives.dailyParticipation : 0,
      Math.abs(movePct) <= config.market.maximumDailyMovePct ? config.incentives.riskDiscipline : 0,
      signals.length ? config.incentives.evidenceBasedDecision : 0
    ];
    const reward = Math.min(config.incentives.maximumDailyReward, rewardCandidates.reduce((a, b) => a + b, 0));

    return {
      rankSeed: index,
      id: participant.id,
      displayName: participant.displayName,
      riskProfile: participant.riskProfile,
      cash,
      units,
      averageReferencePrice: close,
      portfolioValue,
      dailyPnl,
      incentivePoints: Number(previous?.incentivePoints ?? 0) + reward,
      lastTrade: executedUnits > 0 ? { side: direction, units: executedUnits, price: direction === 'BUY' ? ask : bid, notional: executedNotional, simulated: true } : null
    };
  }).sort((a, b) => b.portfolioValue - a.portfolioValue || b.incentivePoints - a.incentivePoints || a.rankSeed - b.rankSeed)
    .map(({ rankSeed, ...item }, index) => ({ rank: index + 1, ...item }));

  return {
    schemaVersion: 'asg-simulated-market-snapshot/v1',
    mode: 'OFFLINE_SIMULATION',
    date,
    currency: { symbol, name: config.currency.portalName ?? config.currency.fallbackName, realMoneyValue: 0, redeemable: false },
    market: { open: priorPrice, bid, ask, close, movePct: round(movePct, 4), maximumDailyMovePct: config.market.maximumDailyMovePct },
    participants: simulatedParticipants,
    public: { leaderboardEnabled: config.publicExperience.leaderboardEnabled, banner: config.publicExperience.bannerText },
    controls: { realTradingEnabled: false, productionWritesEnabled: false, withdrawalsEnabled: false, externalDepositsEnabled: false }
  };
}

export function validateMarketSnapshot(snapshot) {
  const errors = [];
  if (snapshot.mode !== 'OFFLINE_SIMULATION') errors.push('Snapshot must remain OFFLINE_SIMULATION.');
  if (snapshot.currency?.realMoneyValue !== 0 || snapshot.currency?.redeemable !== false) errors.push('Currency must have zero real-money value and be non-redeemable.');
  if (snapshot.controls?.realTradingEnabled !== false || snapshot.controls?.productionWritesEnabled !== false) errors.push('Real trading and production writes must remain disabled.');
  if (snapshot.participants?.some((item) => item.cash < 0 || item.units < 0)) errors.push('Negative cash or units are not allowed.');
  if (snapshot.participants?.some((item) => item.lastTrade && item.lastTrade.simulated !== true)) errors.push('Every trade must be explicitly simulated.');
  return { ok: errors.length === 0, errors };
}
