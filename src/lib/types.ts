export type PlayerPage = 'home' | 'coins' | 'leaderboard' | 'profile' | 'ludo';

export interface Profile {
  id: string;
  name: string;
  mobile: string;
  coins: number;
  created_at: string;
  welcome_bonus_pending: boolean;
}

export interface PaymentNumbers {
  jazzcash_number: string;
  easypaisa_number: string;
}

export type CoinRequestStatus = 'pending' | 'approved' | 'rejected';

export interface CoinRequest {
  id: string;
  coins: number;
  amount_rs: number;
  transaction_id: string;
  status: CoinRequestStatus;
  created_at: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
}

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  user_name: string;
  points: number;
  coins: number;
  is_me: boolean;
}

export interface AdminCoinRequest {
  request_id: string;
  user_name: string;
  user_mobile: string;
  coins: number;
  amount_rs: number;
  transaction_id: string;
  screenshot_path: string;
  status: CoinRequestStatus;
  created_at: string;
}

export interface WeeklyWinner {
  week_start: string;
  place: number;
  user_id: string;
  user_name: string;
  user_mobile: string;
  points: number;
  prize_rs: number;
  paid: boolean;
}
