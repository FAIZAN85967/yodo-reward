export const APP_NAME = 'YODO REWARD';

export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;

export const WEEKLY_PRIZES = [
  { place: 1, rupees: 300 },
  { place: 2, rupees: 200 },
  { place: 3, rupees: 100 },
] as const;

export const GAME_POINTS = { play: 2, win: 10 } as const;

export const WELCOME_BONUS_COINS = 500;

export const PAYMENT_SCREENSHOT_BUCKET = 'payment-screenshots';
