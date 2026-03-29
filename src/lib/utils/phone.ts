export function formatPhoneDisplay(value: string): string {
  const digits = value.replace(/\D/g, "");
  const national =
    digits.startsWith("1") && digits.length > 10 ? digits.slice(1) : digits;
  if (national.length === 0) return "";
  if (national.length <= 3) return `(${national}`;
  if (national.length <= 6)
    return `(${national.slice(0, 3)}) ${national.slice(3)}`;
  return `(${national.slice(0, 3)}) ${national.slice(3, 6)}-${national.slice(6, 10)}`;
}

export function toE164(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 0) return "";
  const national =
    digits.startsWith("1") && digits.length > 10 ? digits.slice(1) : digits;
  return `+1${national.slice(0, 10)}`;
}
