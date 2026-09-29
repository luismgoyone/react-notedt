export const MAX_AMOUNT = 1_000_000_000;

/** react-hook-form rule for a positive peso amount with ≤ 2 decimals. */
export function validateAmount(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    return "Enter an amount greater than 0.";
  }
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) {
    return "Use at most 2 decimal places.";
  }
  if (amount > MAX_AMOUNT) return "That amount is too large.";
  return true;
}
