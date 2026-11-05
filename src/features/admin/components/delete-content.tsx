"use client";

import { deleteContent } from "../actions";
import { ConfirmAction } from "./confirm-action";

export function DeleteContent({ kind, id, name }: { kind: "value-propositions" | "banners" | "news"; id: string; name: string }) {
  return (
    <ConfirmAction
      label="Borrar"
      title={`¿Borrar "${name}"?`}
      description="Desaparece de la tienda y no se puede recuperar."
      confirmLabel="Borrar"
      successMessage="Contenido borrado."
      destructive
      action={() => deleteContent(kind, id)}
    />
  );
}
