"use client";

import Link from "next/link";
import { Checkbox } from "@/components/ui/checkbox";
import { PRIVACY_POLICY_VERSION } from "@/config/legal";

interface ConsentCheckboxProps {
  id: string;
  name?: string;
  error?: string;
}

/** Autorización expresa de tratamiento de datos (Ley 1581 de 2012). */
export function ConsentCheckbox({ id, name = "dataConsent", error }: ConsentCheckboxProps) {
  const errorId = `${id}-error`;
  return (
    <div className="space-y-1.5">
      <div className="flex items-start gap-3">
        <Checkbox
          id={id}
          name={name}
          value="true"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5"
        />
        <label htmlFor={id} className="text-sm leading-relaxed text-muted-foreground">
          Autorizo a EcoMovilidad Colombia S.A.S. a tratar mis datos personales conforme a la{" "}
          <Link href="/privacidad" className="font-medium text-foreground underline underline-offset-4">
            política de tratamiento de datos
          </Link>{" "}
          (Ley 1581 de 2012, versión {PRIVACY_POLICY_VERSION}).
        </label>
      </div>
      {error && (
        <p id={errorId} className="text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
