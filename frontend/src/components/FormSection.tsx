import type { ReactNode } from "react";

// Groups related inputs under a small heading. A <fieldset> with a <legend> is the accessible way to do that.
export function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="form-section">
      <legend>{title}</legend>
      {children}
    </fieldset>
  );
}
