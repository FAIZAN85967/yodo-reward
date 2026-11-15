const KNOWN_MESSAGES: Record<string, string> = {
  not_authenticated: 'Pehle login karein.',
  invalid_package: 'Ye package ab available nahi hai. Dobara chunein.',
  account_blocked: 'Aap ka account block hai. Admin se rabta karein.',
  invalid_transaction_id: 'Transaction ID sahi likhein (4 se 40 characters).',
  invalid_screenshot: 'Screenshot upload nahi hua. Dobara koshish karein.',
  request_already_reviewed: 'Ye request pehle hi review ho chuki hai.',
  request_not_found: 'Request nahi mili.',
  not_admin: 'Aap ko is kaam ki ijazat nahi hai.',
  not_a_winner: 'Ye user is hafte ka winner nahi hai.',
  prize_already_paid: 'Ye inam pehle hi bhej diya gaya hai.',
  invalid_package_values: 'Package ki price aur coins 0 se zyada hon.',
  package_not_found: 'Package nahi mila.',
  cannot_block_self: 'Aap apne aap ko block nahi kar sakte.',
  user_not_found: 'User nahi mila.',
};

const DEFAULT_MESSAGE = 'Kuch masla ho gaya. Dobara koshish karein.';

function readMessage(error: unknown): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') {
    return error.message;
  }
  return '';
}

export function getErrorMessage(error: unknown): string {
  const message = readMessage(error);
  if (KNOWN_MESSAGES[message]) return KNOWN_MESSAGES[message];
  if (message.includes('coin_requests_transaction_unique')) {
    return 'Ye Transaction ID pehle se use ho chuki hai.';
  }
  return DEFAULT_MESSAGE;
}
