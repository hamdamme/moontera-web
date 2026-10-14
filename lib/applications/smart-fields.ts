/** Shared, safe input formatting for driver applications. */
export function formatPhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return digits.slice(0, 3) + "-" + digits.slice(3);
  return digits.slice(0, 3) + "-" + digits.slice(3, 6) + "-" + digits.slice(6);
}
export function formatZip(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  return digits.length > 5 ? digits.slice(0, 5) + "-" + digits.slice(5) : digits;
}
export function formatSsn(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 9);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return digits.slice(0, 3) + "-" + digits.slice(3);
  return digits.slice(0, 3) + "-" + digits.slice(3, 5) + "-" + digits.slice(5);
}
export function normalizeCdl(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9 -]/g, "").slice(0, 40);
}
