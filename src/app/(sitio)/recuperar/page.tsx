import { AuthLayout } from "@/features/auth/components/auth-layout";
import { ResetRequestForm } from "@/features/auth/components/reset-forms";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Recuperar contraseña",
  description: "Solicita un enlace para crear una nueva contraseña.",
  path: "/recuperar",
  noIndex: true,
});

export default function RecoverPage() {
  return (
    <AuthLayout title="Recupera tu contraseña" description="Te enviaremos un enlace de un solo uso a tu correo.">
      <ResetRequestForm />
    </AuthLayout>
  );
}
