import { AuthLayout } from "@/features/auth/components/auth-layout";
import { ResetConfirmForm } from "@/features/auth/components/reset-forms";
import { createPageMetadata } from "@/lib/seo";

export const metadata = {
  ...createPageMetadata({
    title: "Nueva contraseña",
    description: "Crea una nueva contraseña para tu cuenta.",
    path: "/recuperar/nueva",
    noIndex: true,
  }),
  // El token viaja en la URL: no se envía a otros sitios.
  referrer: "no-referrer" as const,
};

export default async function NewPasswordPage({ searchParams }: PageProps<"/recuperar/nueva">) {
  const raw = (await searchParams).token;
  const token = typeof raw === "string" ? raw : "";
  return (
    <AuthLayout title="Crea una nueva contraseña" description="El enlace vence a los 30 minutos y sirve una sola vez.">
      <ResetConfirmForm token={token} />
    </AuthLayout>
  );
}
