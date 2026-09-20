/**
 * Shared formatting. Every date, range and salary in the product goes through
 * here so the same value never renders two different ways.
 */

const MONTH_YEAR = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
});

const DAY_MONTH_YEAR = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function monthYear(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return MONTH_YEAR.format(date);
}

export function fullDate(value: Date | string | null | undefined) {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return DAY_MONTH_YEAR.format(date);
}

/** "Mar 2023 — Present" / "Mar 2023 — Aug 2024" / "Mar 2023" */
export function dateRange(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
  current = false,
) {
  const from = monthYear(start);
  const to = current ? "Present" : monthYear(end);
  if (!from && !to) return null;
  if (!from) return to;
  if (!to) return from;
  return `${from} — ${to}`;
}

/** Compact relative time for activity streams: "4h ago", "3d ago". */
export function relativeTime(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const diff = Date.now() - date.getTime();
  // Elapsed time floors rather than rounds: 90 minutes is "1h ago", not "2h
  // ago", and anything under a minute is "just now".
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 35) return `${Math.floor(days / 7)}w ago`;

  return monthYear(date) ?? "";
}

/** Duration between two dates, the way a resume states it: "2 yrs 4 mos". */
export function duration(
  start: Date | string | null | undefined,
  end: Date | string | null | undefined,
  current = false,
) {
  if (!start) return null;
  const from = typeof start === "string" ? new Date(start) : start;
  const to = current
    ? new Date()
    : end
      ? typeof end === "string"
        ? new Date(end)
        : end
      : new Date();

  let months =
    (to.getFullYear() - from.getFullYear()) * 12 +
    (to.getMonth() - from.getMonth());
  if (months < 0) return null;
  months += 1;

  const years = Math.floor(months / 12);
  const rest = months % 12;

  const parts: string[] = [];
  if (years) parts.push(`${years} yr${years > 1 ? "s" : ""}`);
  if (rest) parts.push(`${rest} mo${rest > 1 ? "s" : ""}`);
  return parts.join(" ") || "1 mo";
}

type SalaryInput = {
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryPeriod?: "HOUR" | "MONTH" | "YEAR" | null;
};

const PERIOD_SUFFIX = { HOUR: "/hr", MONTH: "/mo", YEAR: "/yr" } as const;

export function salaryRange(job: SalaryInput) {
  const { salaryMin, salaryMax, salaryCurrency, salaryPeriod } = job;
  if (!salaryMin && !salaryMax) return null;

  const currency = salaryCurrency ?? "USD";
  const format = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
      notation: n >= 10_000 ? "compact" : "standard",
    }).format(n);

  const suffix = salaryPeriod ? PERIOD_SUFFIX[salaryPeriod] : "";

  if (salaryMin && salaryMax)
    return `${format(salaryMin)}–${format(salaryMax)}${suffix}`;
  return `${format((salaryMin ?? salaryMax)!)}${suffix}`;
}

/** "Posted today" / "Posted 3 days ago" — job listings read better this way. */
export function postedLabel(value: Date | string) {
  const date = typeof value === "string" ? new Date(value) : value;
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days} days ago`;
  return monthYear(date) ?? "";
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** Title Case for enum values: FULL_TIME -> "Full time". */
export function humanizeEnum(value: string) {
  const lower = value.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
