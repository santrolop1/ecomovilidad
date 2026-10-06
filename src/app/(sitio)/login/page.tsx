import { AuthLayout } from "@/features/auth/components/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";
import { safeNextPath } from "@/features/auth/lib/schemas";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Ingresar",
  description: "Ingresa a tu cuenta de EcoMovilidad.",
  path: "/login",
  noIndex: true,
});

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const next = safeNextPath((await searchParams).next);
  return (
    <AuthLayout title="Ingresa a tu cuenta" description="Consulta tus pedidos, alquileres y domicilios en un solo lugar.">
      <LoginForm next={next} />
    </AuthLayout>
  );
}
