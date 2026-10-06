export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  documentNumber?: string;
  /** Rol administrativo. Lo decide el backend; el frontend solo lo usa para mostrar el enlace. */
  isAdmin: boolean;
  createdAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  dataConsent: true;
}

/**
 * La sesión vive en cookies httpOnly (emitidas por FastAPI y reenviadas por
 * el servidor de Next.js). El navegador nunca recibe tokens legibles por JS.
 */
export interface Session {
  user: User;
  expiresAt: string;
}
