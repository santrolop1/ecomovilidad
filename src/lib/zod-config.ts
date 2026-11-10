import { z } from "zod";

// Zod prueba `new Function` para acelerar la validación. La CSP lo bloquea,
// como debe, y Firefox lo reporta como error. Sin esa prueba valida igual.
// La opción se lee al definir cada esquema, así que este módulo se importa
// antes que cualquier otro en app/providers.tsx.
z.config({ jitless: true });
