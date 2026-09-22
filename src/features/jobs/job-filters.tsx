"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";

import { cn } from "@/lib/cn";
import { humanizeEnum } from "@/lib/format";
import { isProviderKey, PROVIDER_LABEL } from "@/lib/jobs/types";
import { Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/editorial";

/**
 * Filters live in the URL.
 *
 * That keeps a search shareable, makes the back button mean something, and lets
 * the results stay a server component. This control only rewrites the query
 * string; the page does the rest.
 */
const LOCATION_TYPES = ["REMOTE", "HYBRID", "ONSITE"] as const;
const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "FREELANCE",
] as const;
const SENIORITIES = ["INTERNSHIP", "ENTRY", "SENIOR", "LEAD"] as const;
const POSTED = [
  { value: "1", label: "Past day" },
  { value: "7", label: "Past week" },
  { value: "30", label: "Past month" },
] as const;

const FILTER_KEYS = [
  "location",
  "remote",
  "type",
  "seniority",
  "skill",
  "source",
  "posted",
  "salary",
  "currency",
  "minSalary",
] as const;

export function JobFilters({
  skills,
  sources,
  currencies,
  total,
}: {
  skills: { name: string; count: number }[];
  sources: { source: string; count: number }[];
  currencies: { currency: string; count: number }[];
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = React.useState(false);

  const apply = React.useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());

      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === "") next.delete(key);
        else next.set(key, value);
      }
      // Any filter change resets paging; page 4 of the old results is meaningless.
      next.delete("page");

      router.push(`${pathname}?${next.toString()}`, { scroll: false });
    },
    [params, pathname, router],
  );

  const activeCount = FILTER_KEYS.filter((key) => params.get(key)).length;

  const toggle = (key: string, value: string) =>
    apply({ [key]: params.get(key) === value ? null : value });

  const panel = (
    <div className="flex flex-col gap-7">
      <FilterGroup label="Arrangement">
        {LOCATION_TYPES.map((value) => (
          <Chip
            key={value}
            active={params.get("remote") === value}
            onClick={() => toggle("remote", value)}
          >
            {value === "ONSITE" ? "On-site" : humanizeEnum(value)}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup label="Contract">
        {EMPLOYMENT_TYPES.map((value) => (
          <Chip
            key={value}
            active={params.get("type") === value}
            onClick={() => toggle("type", value)}
          >
            {humanizeEnum(value)}
          </Chip>
        ))}
      </FilterGroup>

      <FilterGroup label="Level">
        {SENIORITIES.map((value) => (
          <Chip
            key={value}
            active={params.get("seniority") === value}
            onClick={() => toggle("seniority", value)}
          >
            {humanizeEnum(value)}
          </Chip>
        ))}
      </FilterGroup>

      <div className="flex flex-col gap-2.5">
        <Eyebrow>Place</Eyebrow>
        <input
          defaultValue={params.get("location") ?? ""}
          onBlur={(event) => apply({ location: event.target.value.trim() })}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              apply({ location: event.currentTarget.value.trim() });
            }
          }}
          placeholder="Lisbon, Remote, Berlin…"
          className="w-full rounded-none border-0 border-b border-rule bg-transparent pb-1.5 text-[0.8125rem] text-ink outline-none placeholder:text-ink-ghost focus:border-cobalt"
        />
      </div>

      <FilterGroup label="Posted">
        {POSTED.map((option) => (
          <Chip
            key={option.value}
            active={params.get("posted") === option.value}
            onClick={() => toggle("posted", option.value)}
          >
            {option.label}
          </Chip>
        ))}
      </FilterGroup>

      <SalaryFilter
        key={`${params.get("currency") ?? ""}|${params.get("minSalary") ?? ""}`}
        currencies={currencies}
        currency={params.get("currency")}
        minSalary={params.get("minSalary")}
        disclosed={params.get("salary") === "disclosed"}
        apply={apply}
      />

      {sources.length > 1 ? (
        <FilterGroup label="Source">
          {sources.map((s) => (
            <Chip
              key={s.source}
              active={params.get("source") === s.source}
              onClick={() => toggle("source", s.source)}
            >
              {isProviderKey(s.source) ? PROVIDER_LABEL[s.source] : s.source}
              <span data-numeric className="ml-1 text-[0.625rem] opacity-60">
                {s.count}
              </span>
            </Chip>
          ))}
        </FilterGroup>
      ) : null}

      <FilterGroup label="Asks for">
        {skills.slice(0, 14).map((skill) => (
          <Chip
            key={skill.name}
            active={params.get("skill") === skill.name}
            onClick={() => toggle("skill", skill.name)}
          >
            {skill.name}
            <span data-numeric className="ml-1 text-[0.625rem] opacity-60">
              {skill.count}
            </span>
          </Chip>
        ))}
      </FilterGroup>

      {activeCount > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          className="self-start"
          onClick={() =>
            apply(Object.fromEntries(FILTER_KEYS.map((key) => [key, null])))
          }
        >
          <X />
          Clear {activeCount} filter{activeCount === 1 ? "" : "s"}
        </Button>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Keyed by the URL value: navigation remounts it with the new text,
          which is simpler and more predictable than syncing in an effect. */}
      <SearchBox
        key={params.get("q") ?? ""}
        initial={params.get("q") ?? ""}
        onSearch={(value) => apply({ q: value || null })}
      />

      {/* On a phone the rail becomes a disclosure, so results stay above the
          fold instead of being pushed down by a column of chips. */}
      <div className="flex items-center justify-between gap-3 lg:hidden">
        <p className="text-[0.8125rem] text-ink-muted">
          <span data-numeric className="font-mono text-ink">
            {total}
          </span>{" "}
          {total === 1 ? "opening" : "openings"}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
        >
          <SlidersHorizontal />
          Filters
          {activeCount > 0 ? (
            <span
              data-numeric
              className="ml-0.5 rounded-full bg-ink px-1.5 text-[0.625rem] text-paper"
            >
              {activeCount}
            </span>
          ) : null}
        </Button>
      </div>

      <div className={cn("lg:block", open ? "block" : "hidden")}>{panel}</div>
    </div>
  );
}

function SearchBox({
  initial,
  onSearch,
}: {
  initial: string;
  onSearch: (value: string) => void;
}) {
  const [query, setQuery] = React.useState(initial);

  return (
    <form
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        onSearch(query.trim());
      }}
      className="flex items-center gap-2 border-b border-rule pb-2"
    >
      <Search className="size-4 shrink-0 text-ink-ghost" />
      <label className="sr-only" htmlFor="job-search">
        Search jobs
      </label>
      <input
        id="job-search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Role, company or skill"
        className="min-w-0 flex-1 bg-transparent text-[0.9375rem] text-ink outline-none placeholder:text-ink-ghost"
      />
      {query ? (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            onSearch("");
          }}
          aria-label="Clear search"
          className="flex size-6 items-center justify-center rounded-sm text-ink-ghost hover:bg-raised hover:text-ink"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
      <Button type="submit" size="sm" variant="subtle" className="shrink-0">
        Search
      </Button>
    </form>
  );
}

/**
 * Pay is compared within one currency only — a minimum in dollars says
 * nothing about a posting in ringgit — so a minimum needs a currency, and only
 * currencies that live postings actually use are offered.
 */
function SalaryFilter({
  currencies,
  currency,
  minSalary,
  disclosed,
  apply,
}: {
  currencies: { currency: string; count: number }[];
  currency: string | null;
  minSalary: string | null;
  disclosed: boolean;
  apply: (changes: Record<string, string | null>) => void;
}) {
  const [cur, setCur] = React.useState(
    currency ?? currencies[0]?.currency ?? "",
  );
  const [amount, setAmount] = React.useState(minSalary ?? "");

  if (currencies.length === 0) return null;

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="eyebrow mb-0.5">Pay</legend>
      <label className="flex items-center gap-2 text-[0.8125rem] text-ink">
        <input
          type="checkbox"
          checked={disclosed}
          onChange={(event) =>
            apply({ salary: event.target.checked ? "disclosed" : null })
          }
          className="size-4 accent-[var(--color-ink)]"
        />
        Only postings that state pay
      </label>
      <form
        className="flex items-end gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const value = amount.replace(/[^\d]/g, "");
          // A currency alone narrows to postings paying in it; with an
          // amount it is the unit of the minimum.
          apply({ currency: cur || null, minSalary: value || null });
        }}
      >
        <label className="flex flex-col gap-1">
          <span className="sr-only">Currency</span>
          <select
            value={cur}
            onChange={(event) => setCur(event.target.value)}
            className="h-8 rounded-none border-0 border-b border-rule bg-transparent text-[0.8125rem] text-ink outline-none focus:border-cobalt"
          >
            {currencies.map((c) => (
              <option key={c.currency} value={c.currency}>
                {c.currency} ({c.count})
              </option>
            ))}
          </select>
        </label>
        <label className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="sr-only">Minimum yearly pay</span>
          <input
            inputMode="numeric"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder="Min per year"
            className="h-8 w-full min-w-0 rounded-none border-0 border-b border-rule bg-transparent text-[0.8125rem] text-ink outline-none placeholder:text-ink-ghost focus:border-cobalt"
          />
        </label>
        <Button type="submit" size="sm" variant="subtle">
          Set
        </Button>
      </form>
      {currency ? (
        <button
          type="button"
          onClick={() => apply({ currency: null, minSalary: null })}
          className="self-start text-[0.75rem] text-ink-muted underline underline-offset-4 hover:text-ink"
        >
          Any pay
        </button>
      ) : null}
    </fieldset>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="eyebrow mb-0.5">{label}</legend>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </fieldset>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-xs border px-2 py-1 text-[0.75rem] transition-colors duration-150",
        active
          ? "border-ink bg-ink text-paper"
          : "border-rule bg-surface text-ink-muted hover:border-rule-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
