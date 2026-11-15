export type PlayerPage = 'home' | 'coins' | 'wallet' | 'leaderboard' | 'profile' | 'ludo';

export interface Profile {
  id: string;
  name: string;
  mobile: string;
  coins: number;
  created_at: string;
  welcome_bonus_pending: boolean;
  is_blocked: boolean;
}

export interface PaymentNumbers {
  jazzcash_number: string;
  easypaisa_number: string;
  account_title: string;
}

export interface CoinPackage {
  id: number;
  rupees: number;
  coins: number;
  is_active: boolean;
}

export type WalletEntryKind = 'bonus' | 'approved' | 'pending' | 'rejected';

export interface WalletEntry {
  id: string;
  kind: WalletEntryKind;
  coins: number;
  amount_rs: number | null;
  created_at: string;
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

export interface AdminDashboardStats {
  total_users: number;
  total_coins_given: number;
  pending_requests: number;
  total_revenue_rs: number;
}

export interface AdminUser {
  user_id: string;
  user_name: string;
  user_mobile: string;
  coins: number;
  total_bought_coins: number;
  total_paid_rs: number;
  joined_at: string;
  is_blocked: boolean;
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
