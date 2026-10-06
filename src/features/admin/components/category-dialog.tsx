"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useActionForm } from "@/hooks/use-action-form";
import type { AdminCategory } from "@/lib/api/admin-schemas";
import { formDataToObject } from "@/lib/validation";
import { createCategory, updateCategory } from "../actions";
import { categoryFormSchema, slugify } from "../lib/schemas";

export function CategoryDialog({ category }: { category?: AdminCategory }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [slug, setSlug] = useState(category?.slug ?? "");
  const action = category ? updateCategory.bind(null, category.id) : createCategory;
  const form = useActionForm(categoryFormSchema, action, {
    onSuccess() {
      toast.success(category ? "Categoría actualizada." : "Categoría creada.");
      setOpen(false);
      router.refresh();
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) form.reset();
      }}
    >
      <DialogTrigger asChild>
        <Button variant={category ? "outline" : "brand"} size={category ? "lg" : "xl"} className="rounded-full">
          {category ? "Editar" : "Nueva categoría"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? `Editar ${category.name}` : "Nueva categoría"}</DialogTitle>
          <DialogDescription>
            La tienda pública muestra solo las cuatro categorías del SRS (bicicletas, patinetas, patines y drones).
          </DialogDescription>
        </DialogHeader>
        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            form.submit({ ...formDataToObject(new FormData(event.currentTarget)), slug }, event.currentTarget);
          }}
        >
          {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}
          <FormField id="c-name" label="Nombre" error={form.fieldErrors.name}>
            {(control) => (
              <Input
                {...control}
                name="name"
                defaultValue={category?.name}
                maxLength={60}
                onChange={(e) => !category && setSlug(slugify(e.target.value))}
              />
            )}
          </FormField>
          <FormField id="c-slug" label="Slug" error={form.fieldErrors.slug}>
            {(control) => <Input {...control} value={slug} maxLength={60} onChange={(e) => setSlug(e.target.value)} />}
          </FormField>
          <FormField id="c-description" label="Descripción" error={form.fieldErrors.description}>
            {(control) => <Textarea {...control} name="description" defaultValue={category?.description} rows={3} maxLength={500} />}
          </FormField>
          <Button type="submit" variant="brand" size="xl" className="w-full" disabled={form.isPending}>
            {form.isPending ? "Guardando…" : "Guardar"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
