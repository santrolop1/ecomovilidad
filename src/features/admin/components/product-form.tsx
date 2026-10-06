"use client";

import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { FormAlert } from "@/components/shared/form-alert";
import { FormField } from "@/components/shared/form-field";
import { ProductImage } from "@/components/shared/product-image";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { imageCredits } from "@/config/image-credits";
import { useActionForm } from "@/hooks/use-action-form";
import type { AdminCategory, AdminProductDetail } from "@/lib/api/admin-schemas";
import { createProduct, updateProduct } from "../actions";
import { productFormSchema, slugify } from "../lib/schemas";

interface SpecRow {
  key: string;
  label: string;
  value: string;
  unit: string;
  facet: boolean;
}

interface ProductFormProps {
  categories: AdminCategory[];
  product?: AdminProductDetail;
}

const selectClass = "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm";

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <fieldset className="min-w-0 rounded-2xl border border-border bg-card p-5 sm:p-6">
      <legend className="font-display-tight float-left mb-4 w-full text-lg">
        {title}
        {description && <span className="mt-1 block font-sans text-sm font-normal text-muted-foreground">{description}</span>}
      </legend>
      <div className="@container clear-both space-y-4">{children}</div>
    </fieldset>
  );
}

export function ProductForm({ categories, product }: ProductFormProps) {
  const router = useRouter();
  const [name, setName] = useState(product?.name ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(product));
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? "");
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [specs, setSpecs] = useState<SpecRow[]>(
    product?.specifications.map((s) => ({ key: s.key, label: s.label, value: String(s.value), unit: s.unit ?? "", facet: s.facet })) ?? [],
  );

  const action = product ? updateProduct.bind(null, product.id) : createProduct;
  const form = useActionForm(productFormSchema, action, {
    onSuccess({ id }) {
      toast.success(product ? "Producto actualizado." : "Producto creado.");
      if (product) router.refresh();
      else router.push(`/admin/productos/${id}`);
    },
  });
  const errors = form.fieldErrors;

  function updateSpec(index: number, patch: Partial<SpecRow>) {
    setSpecs((rows) => rows.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        const text = (key: string) => String(data.get(key) ?? "");
        form.submit(
          {
            categoryId: text("categoryId"),
            name,
            slug,
            sku: text("sku"),
            brand: text("brand"),
            shortDescription: text("shortDescription"),
            description: text("description"),
            price: text("price"),
            compareAtPrice: text("compareAtPrice"),
            imageUrl,
            highlights: text("highlights").split("\n").map((h) => h.trim()).filter(Boolean),
            specifications: specs.map((s) => ({
              key: s.key || slugify(s.label).replace(/-/g, "_"),
              label: s.label,
              value: s.value,
              unit: s.unit || undefined,
              facet: s.facet,
            })),
            isFeatured,
            isActive,
          },
          event.currentTarget,
        );
      }}
    >
      {form.formError && <FormAlert variant="error">{form.formError}</FormAlert>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <Section title="Información">
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField id="p-name" label="Nombre" error={errors.name} className="sm:col-span-2">
                {(control) => (
                  <Input
                    {...control}
                    value={name}
                    maxLength={120}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!slugTouched) setSlug(slugify(e.target.value));
                    }}
                  />
                )}
              </FormField>
              <FormField id="p-slug" label="URL (slug)" hint={`/catalogo/${slug || "…"}`} error={errors.slug}>
                {(control) => (
                  <Input
                    {...control}
                    value={slug}
                    maxLength={140}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                  />
                )}
              </FormField>
              <FormField id="p-sku" label="SKU" error={errors.sku}>
                {(control) => <Input {...control} name="sku" defaultValue={product?.sku} maxLength={40} className="uppercase" />}
              </FormField>
              <FormField id="p-brand" label="Marca" error={errors.brand}>
                {(control) => <Input {...control} name="brand" defaultValue={product?.brand} maxLength={80} />}
              </FormField>
              <FormField id="p-category" label="Categoría" error={errors.categoryId}>
                {(control) => (
                  <select {...control} name="categoryId" defaultValue={product?.category.id ?? ""} className={selectClass}>
                    <option value="" disabled>
                      Elige
                    </option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                )}
              </FormField>
              <FormField id="p-short" label="Resumen" hint="Se muestra en las tarjetas del catálogo." error={errors.shortDescription} className="sm:col-span-2">
                {(control) => <Input {...control} name="shortDescription" defaultValue={product?.shortDescription} maxLength={200} />}
              </FormField>
              <FormField id="p-description" label="Descripción" error={errors.description} className="sm:col-span-2">
                {(control) => <Textarea {...control} name="description" defaultValue={product?.description} rows={5} maxLength={5000} />}
              </FormField>
              <FormField id="p-highlights" label="Destacados" hint="Uno por línea (máximo 8)." error={errors.highlights} className="sm:col-span-2">
                {(control) => (
                  <Textarea {...control} name="highlights" defaultValue={product?.highlights.join("\n")} rows={3} maxLength={700} />
                )}
              </FormField>
            </div>
          </Section>

          <Section title="Especificaciones" description="Las marcadas como filtro aparecen en los filtros del catálogo.">
            {specs.length === 0 && <p className="text-sm text-muted-foreground">Sin especificaciones.</p>}
            <ul className="space-y-3">
              {specs.map((spec, index) => (
                <li key={index} className="grid grid-cols-2 gap-2 rounded-xl border border-border p-3 @xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_90px_auto_auto] @xl:items-end">
                  <div className="space-y-1">
                    <Label htmlFor={`spec-label-${index}`} className="text-xs text-muted-foreground">Etiqueta</Label>
                    <Input id={`spec-label-${index}`} value={spec.label} maxLength={60} onChange={(e) => updateSpec(index, { label: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`spec-value-${index}`} className="text-xs text-muted-foreground">Valor</Label>
                    <Input id={`spec-value-${index}`} value={spec.value} maxLength={80} onChange={(e) => updateSpec(index, { value: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor={`spec-unit-${index}`} className="text-xs text-muted-foreground">Unidad</Label>
                    <Input id={`spec-unit-${index}`} value={spec.unit} maxLength={20} onChange={(e) => updateSpec(index, { unit: e.target.value })} />
                  </div>
                  <label className="flex min-h-10 items-center gap-2 text-sm">
                    <Checkbox checked={spec.facet} onCheckedChange={(v) => updateSpec(index, { facet: v === true })} />
                    Filtro
                  </label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-lg"
                    aria-label={`Quitar ${spec.label || "especificación"}`}
                    onClick={() => setSpecs((rows) => rows.filter((_, i) => i !== index))}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </li>
              ))}
            </ul>
            {Object.keys(errors).some((k) => k.startsWith("specifications")) && (
              <p className="text-xs font-medium text-destructive">Revisa las especificaciones: cada una necesita etiqueta y valor.</p>
            )}
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="rounded-full"
              disabled={specs.length >= 20}
              onClick={() => setSpecs((rows) => [...rows, { key: "", label: "", value: "", unit: "", facet: false }])}
            >
              <Plus data-icon="inline-start" aria-hidden="true" />
              Agregar especificación
            </Button>
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="Precio">
            <FormField id="p-price" label="Precio (COP, IVA incluido)" error={errors.price}>
              {(control) => <Input {...control} name="price" inputMode="numeric" defaultValue={product?.price} />}
            </FormField>
            <FormField id="p-compare" label="Precio anterior (opcional)" hint="Se muestra tachado como precio especial." error={errors.compareAtPrice}>
              {(control) => <Input {...control} name="compareAtPrice" inputMode="numeric" defaultValue={product?.compareAtPrice ?? ""} />}
            </FormField>
          </Section>

          <Section title="Foto">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted">
              <ProductImage image={imageUrl ? { src: imageUrl, alt: name } : undefined} sizes="340px" />
            </div>
            <FormField id="p-image" label="Imagen" hint="Fotos disponibles en /public/images/products." error={errors.imageUrl}>
              {(control) => (
                <select {...control} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} className={selectClass}>
                  <option value="">Imagen pendiente</option>
                  {imageCredits.map((credit) => (
                    <option key={credit.file} value={credit.file}>
                      {credit.file.replace("/images/products/", "")}
                    </option>
                  ))}
                </select>
              )}
            </FormField>
          </Section>

          <Section title="Publicación">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={isActive} onCheckedChange={(v) => setIsActive(v === true)} className="mt-0.5" />
              <span>
                <span className="font-medium">Activo</span>
                <span className="block text-muted-foreground">Visible en la tienda.</span>
              </span>
            </label>
            <label className="flex items-start gap-3 text-sm">
              <Checkbox checked={isFeatured} onCheckedChange={(v) => setIsFeatured(v === true)} className="mt-0.5" />
              <span>
                <span className="font-medium">Destacado</span>
                <span className="block text-muted-foreground">Aparece en la página de inicio.</span>
              </span>
            </label>
          </Section>

          <Button type="submit" variant="brand" size="xl" className="w-full" disabled={form.isPending}>
            {form.isPending ? "Guardando…" : product ? "Guardar cambios" : "Crear producto"}
          </Button>
        </div>
      </div>
    </form>
  );
}
