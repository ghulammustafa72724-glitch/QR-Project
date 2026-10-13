/**
 * Currency utility configuration for the Restaurant Ordering System.
 * Default currency is set to Pakistani Rupee (PKR).
 */

export const CURRENCY_CODE = 'PKR';
export const CURRENCY_LABEL = 'Rs';

/**
 * Formats a monetary number into Rs representation.
 * Example: 450 -> "Rs 450.00"
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) {
    return 'Rs 0.00';
  }
  return `Rs ${num.toFixed(2)}`;
}

/**
 * Convenience helper to return just the formatted numeric amount with 2 decimal places.
 */
export function formatAmount(amount: number | string | null | undefined): string {
  const num = typeof amount === 'number' ? amount : Number(amount);
  if (isNaN(num)) {
    return '0.00';
  }
  return num.toFixed(2);
}
