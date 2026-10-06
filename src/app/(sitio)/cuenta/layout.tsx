import { redirect } from "next/navigation";
import { Container } from "@/components/shared/container";
import { AccountNav } from "@/features/account/components/account-nav";
import { getSessionUser } from "@/features/auth/actions";
import { isRealApi } from "@/lib/api";

export const dynamic = "force-dynamic";

/** Área privada del cliente. FastAPI vuelve a validar la sesión en cada llamada. */
export default async function AccountLayout({ children }: LayoutProps<"/cuenta">) {
  if (!isRealApi) redirect("/login?next=/cuenta");
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/cuenta");
  return (
    <Container className="space-y-6 py-8 sm:py-12">
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Hola, {user.firstName}</p>
        <AccountNav />
      </div>
      {children}
    </Container>
  );
}
