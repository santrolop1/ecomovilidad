import { redirect } from "next/navigation";
import { formatDateTime, shortId } from "@/lib/format";
import { ProfileForm } from "@/features/account/components/profile-form";
import { PasswordForm } from "@/features/account/components/password-form";
import { getSessionUser } from "@/features/auth/actions";
import { api } from "@/lib/api";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Mi cuenta",
  description: "Datos personales, contraseña y autorizaciones.",
  path: "/cuenta",
  noIndex: true,
});

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/cuenta");
  const consents = await api.auth.listConsents();

  return (
    <>
      <h1 className="font-display text-3xl sm:text-4xl">Mi cuenta</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="datos" className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 id="datos" className="font-display-tight mb-4 text-xl">Datos personales</h2>
          <ProfileForm user={user} />
        </section>
        <section aria-labelledby="clave" className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 id="clave" className="font-display-tight mb-4 text-xl">Contraseña</h2>
          <PasswordForm />
        </section>
      </div>
      <section aria-labelledby="autorizaciones" className="rounded-3xl border border-border bg-card p-5 sm:p-6">
        <h2 id="autorizaciones" className="font-display-tight text-xl">Autorizaciones de tratamiento de datos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Registro de las veces que aceptaste la política (Ley 1581 de 2012).</p>
        {consents.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">Sin registros.</p>
        ) : (
          <ul className="mt-4 divide-y divide-border text-sm">
            {consents.map((c) => (
              <li key={`${c.purpose}-${c.acceptedAt}`} className="flex flex-wrap justify-between gap-2 py-2.5">
                <span>
                  {c.purpose === "registro" ? "Creación de la cuenta" : `Pedido ${c.orderId ? shortId(c.orderId) : ""}`}
                  <span className="text-muted-foreground">, política versión {c.policyVersion}</span>
                </span>
                <span className="text-muted-foreground">{formatDateTime(c.acceptedAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
