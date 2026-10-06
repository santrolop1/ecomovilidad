import { AuthLayout } from "@/features/auth/components/auth-layout";
import { RegisterForm } from "@/features/auth/components/register-form";
import { safeNextPath } from "@/features/auth/lib/schemas";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Crear cuenta",
  description: "Crea tu cuenta de EcoMovilidad para comprar, alquilar y seguir tus domicilios.",
  path: "/registro",
  noIndex: true,
});

export default async function RegisterPage({ searchParams }: PageProps<"/registro">) {
  const next = safeNextPath((await searchParams).next);
  return (
    <AuthLayout title="Crea tu cuenta" description="Compra, alquila y sigue tus domicilios con una sola cuenta.">
      <RegisterForm next={next} />
    </AuthLayout>
  );
}
