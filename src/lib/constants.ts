export const APP_NAME = 'YODO REWARD';

export const COIN_RATE = { coins: 1000, rupees: 100 } as const;
export const MIN_COIN_PURCHASE = 1000;
export const COIN_PURCHASE_STEP = 100;
export const COIN_QUICK_PICKS = [1000, 2000, 5000, 10000] as const;
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

export const WEEKLY_PRIZES = [
  { place: 1, rupees: 300 },
  { place: 2, rupees: 200 },
  { place: 3, rupees: 100 },
] as const;

export const GAME_POINTS = { play: 2, win: 10 } as const;

export const WELCOME_BONUS_COINS = 500;

export const PAYMENT_SCREENSHOT_BUCKET = 'payment-screenshots';

export function coinsToRupees(coins: number): number {
  return (coins * COIN_RATE.rupees) / COIN_RATE.coins;
}
