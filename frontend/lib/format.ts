const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";
const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";

/**
 * Converts Arabic-Indic and Persian digits to Latin, so numbers typed on an
 * Arabic keyboard can be validated and stored as plain ASCII digits.
 */
export function normalizeDigits(value: string): string {
  return value
    .split("")
    .map((ch) => {
      const ar = AR_DIGITS.indexOf(ch);
      if (ar >= 0) return String(ar);
      const fa = FA_DIGITS.indexOf(ch);
      if (fa >= 0) return String(fa);
      return ch;
    })
    .join("");
}

export function formatPrice(value: number, currency = "$", locale = "en"): string {
  return `${currency}${Number(value).toLocaleString(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDateTime(value: string, locale = "en"): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function formatDate(value: string, locale = "en"): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatDateShort(value: string, locale = "en"): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function combineLocalDateTime(dateValue: string, timeValue: string): string {
  const date = new Date(dateValue);
  const [hours, minutes] = timeValue.split(":").map(Number);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function rentalDays(pickup: string, returnd: string): number {
  const start = new Date(pickup);
  const end = new Date(returnd);
  const ms = end.getTime() - start.getTime();
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

export function effectiveDailyPrice(car: {
  daily_price: number;
  discount_daily_price?: number | null;
}): number {
  const discount = car.discount_daily_price;
  if (discount != null && discount > 0 && discount < car.daily_price) return discount;
  return car.daily_price;
}

export function estimateRentalCost(
  car: {
    daily_price: number;
    discount_daily_price?: number | null;
    weekly_price: number | null;
    monthly_price: number | null;
  },
  days: number,
): number {
  let price = effectiveDailyPrice(car) * days;
  if (days >= 7 && car.weekly_price) {
    price = Math.min(price, car.weekly_price * (days / 7));
  }
  if (days >= 30 && car.monthly_price) {
    price = Math.min(price, car.monthly_price * (days / 30));
  }
  return Math.round(price * 100) / 100;
}