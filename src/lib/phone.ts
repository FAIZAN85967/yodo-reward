const MOBILE_PATTERN = /^03\d{9}$/;

export function normalizeMobile(input: string): string {
  return input.replace(/[\s-]/g, '');
}

export function isValidMobile(mobile: string): boolean {
  return MOBILE_PATTERN.test(mobile);
}

export function mobileToEmail(mobile: string): string {
  return `${mobile}@yodoreward.app`;
}
