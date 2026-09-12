export interface ActiveOffer {
  id: string;
  title: string;
  description: string | null;
  type: string;
  value: number | null;
  currency: string;
  startsAt: Date | null;
  endsAt: Date | null;
  daysOfWeek: number[];
  startTime: string | null;
  endTime: string | null;
}

function nepalParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const weekday = parts.find((part) => part.type === "weekday")?.value;
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    day: weekday ? weekdays.indexOf(weekday) : new Date(date).getDay(),
    time: `${parts.find((part) => part.type === "hour")?.value ?? "00"}:${parts.find((part) => part.type === "minute")?.value ?? "00"}`,
  };
}

export function isOfferCurrentlyValid(offer: ActiveOffer, now = new Date()) {
  if (offer.startsAt && now < offer.startsAt) return false;
  if (offer.endsAt && now > offer.endsAt) return false;

  const local = nepalParts(now);
  if (offer.daysOfWeek.length > 0 && !offer.daysOfWeek.includes(local.day)) return false;
  if (!offer.startTime || !offer.endTime) return true;

  if (offer.startTime <= offer.endTime) return local.time >= offer.startTime && local.time <= offer.endTime;
  return local.time >= offer.startTime || local.time <= offer.endTime;
}

export function offerValueLabel(offer: Pick<ActiveOffer, "type" | "value" | "currency">) {
  if (offer.type === "BUY_ONE_GET_ONE") return "Buy one, get one free";
  if (offer.type === "PERCENTAGE" && offer.value != null) return `${offer.value}% off`;
  if (offer.type === "FIXED_AMOUNT" && offer.value != null) return `${offer.currency} ${offer.value} off`;
  return null;
}
