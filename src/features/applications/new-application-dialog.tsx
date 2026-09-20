"use client";

import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldHint,
  FieldLabel,
  Input,
  NativeSelect,
} from "@/components/ui/field";
import { fieldError } from "@/components/ui/form";
import { EntryDialog } from "@/features/profile/entry-dialog";
import { createApplicationAction } from "@/server/actions/application.actions";
import { STATUS_LABEL, STATUS_ORDER } from "@/features/applications/types";

/**
 * For applications made outside ELARA. Anything found through job discovery
 * gets added from the posting instead, with nothing to retype.
 */
export function NewApplicationDialog() {
  return (
    <EntryDialog
      label="Tracker"
      title="Track an application"
      description="For a role you found elsewhere. Openings inside ELARA can be tracked straight from the posting."
      action={createApplicationAction}
      submitLabel="Add to tracker"
      trigger={
        <Button>
          <Plus />
          Add application
        </Button>
      }
    >
      {(state) => (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={fieldError(state, "company")}>
              <FieldLabel>Company</FieldLabel>
              <Input name="company" required autoFocus placeholder="Norwind" />
            </Field>

            <Field error={fieldError(state, "role")}>
              <FieldLabel>Role</FieldLabel>
              <Input name="role" required placeholder="Front-end engineer" />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field error={fieldError(state, "location")}>
              <FieldLabel optional>Location</FieldLabel>
              <Input name="location" placeholder="Lisbon" />
            </Field>

            <Field>
              <FieldLabel>Stage</FieldLabel>
              <NativeSelect name="status" defaultValue="APPLIED">
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>

          <Field error={fieldError(state, "url")}>
            <FieldLabel optional>Link to the posting</FieldLabel>
            <Input name="url" type="url" placeholder="https://…" />
          </Field>

          <Field error={fieldError(state, "source")}>
            <FieldLabel optional>Found via</FieldLabel>
            <Input
              name="source"
              placeholder="Referral, company site, LinkedIn"
            />
            <FieldHint>
              Worth recording — after a month it is the only way to tell which
              routes are actually working.
            </FieldHint>
          </Field>
        </>
      )}
    </EntryDialog>
  );
}
