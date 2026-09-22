"use client";

import * as React from "react";
import type { EmploymentType, LocationType } from "@prisma/client";

import { humanizeEnum } from "@/lib/format";
import { Field, FieldHint, FieldLabel, Input } from "@/components/ui/field";
import { FormMessage, SubmitButton, fieldError } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import { savePreferencesAction } from "@/server/actions/profile.actions";
import { idle, type ActionState } from "@/server/actions/result";

const WORKPLACES: LocationType[] = ["REMOTE", "HYBRID", "ONSITE"];
const CONTRACTS: EmploymentType[] = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
  "FREELANCE",
];

export type Preferences = {
  targetRoles: string[];
  preferredLocations: string[];
  preferredLocationTypes: LocationType[];
  preferredEmploymentTypes: EmploymentType[];
  desiredSalaryMin: number | null;
  desiredSalaryCurrency: string | null;
};

/**
 * What the person is looking for. Recommendations use these as hard filters,
 * and only these: leave a group empty and nothing is filtered on it.
 */
export function PreferencesForm({ preferences }: { preferences: Preferences }) {
  const [state, action] = React.useActionState(savePreferencesAction, idle);
  const { toast } = useToast();
  const handled = React.useRef<ActionState | null>(null);

  React.useEffect(() => {
    if (state.status === "ok" && handled.current !== state) {
      handled.current = state;
      toast(state.message ?? "Saved.");
    }
  }, [state, toast]);

  return (
    <form action={action} className="flex flex-col gap-6 pt-5" noValidate>
      <FormMessage state={state} />

      <Field error={fieldError(state, "targetRoles")}>
        <FieldLabel optional>Roles you are aiming for</FieldLabel>
        <Input
          name="targetRoles"
          defaultValue={preferences.targetRoles.join(", ")}
          placeholder="Frontend engineer, Product engineer"
        />
        <FieldHint>
          Separated by commas. Recommendations favour titles like these.
        </FieldHint>
      </Field>

      <div className="grid gap-6 md:grid-cols-2">
        <CheckGroup
          label="Workplace"
          name="preferredLocationTypes"
          options={WORKPLACES.map((v) => ({
            value: v,
            label: v === "ONSITE" ? "On-site" : humanizeEnum(v),
          }))}
          checked={preferences.preferredLocationTypes}
        />
        <CheckGroup
          label="Contract"
          name="preferredEmploymentTypes"
          options={CONTRACTS.map((v) => ({ value: v, label: humanizeEnum(v) }))}
          checked={preferences.preferredEmploymentTypes}
        />
      </div>

      <Field error={fieldError(state, "preferredLocations")}>
        <FieldLabel optional>Where you would work</FieldLabel>
        <Input
          name="preferredLocations"
          defaultValue={preferences.preferredLocations.join(", ")}
          placeholder="Jakarta, Singapore"
        />
        <FieldHint>Remote roles always pass this filter.</FieldHint>
      </Field>

      <div className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_8rem]">
        <Field error={fieldError(state, "desiredSalaryMin")}>
          <FieldLabel optional>Minimum yearly pay</FieldLabel>
          <Input
            name="desiredSalaryMin"
            inputMode="numeric"
            defaultValue={preferences.desiredSalaryMin ?? ""}
            placeholder="60000"
          />
          <FieldHint>
            Only postings that state pay in the same currency are compared.
          </FieldHint>
        </Field>
        <Field error={fieldError(state, "desiredSalaryCurrency")}>
          <FieldLabel optional>Currency</FieldLabel>
          <Input
            name="desiredSalaryCurrency"
            defaultValue={preferences.desiredSalaryCurrency ?? ""}
            placeholder="SGD"
            maxLength={3}
          />
        </Field>
      </div>

      <SubmitButton size="sm" variant="outline" className="self-start">
        Save preferences
      </SubmitButton>
    </form>
  );
}

function CheckGroup({
  label,
  name,
  options,
  checked,
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  checked: string[];
}) {
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="eyebrow mb-1">{label}</legend>
      <div className="flex flex-wrap gap-x-5 gap-y-2">
        {options.map((option) => (
          <label
            key={option.value}
            className="flex items-center gap-2 text-[0.8125rem] text-ink"
          >
            <input
              type="checkbox"
              name={name}
              value={option.value}
              defaultChecked={checked.includes(option.value)}
              className="size-4 accent-[var(--color-ink)]"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
