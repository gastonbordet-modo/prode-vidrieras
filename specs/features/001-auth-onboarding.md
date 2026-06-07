# Feature 001 — Auth y onboarding

## User story

Como nuevo participante quiero registrarme con mi email, recibir un
magic link y elegir un nickname público antes de empezar a jugar.

## Páginas

- `/login` — form con un solo input (email).
- `/auth/callback` — handler que intercambia el código por sesión y
  redirige.
- `/onboarding` — form con input de nickname.

## Flujo

1. `/login` recibe email, llama Server Action `requestMagicLink`.
2. Server Action invoca `supabase.auth.signInWithOtp` con
   `emailRedirectTo` apuntando a `/auth/callback`.
3. Usuario clickea link en su mail → cae en `/auth/callback?code=...`.
4. Route handler hace `exchangeCodeForSession` y redirige a:
   - `/onboarding` si no existe row en `users` con su `id`
   - `/` si ya existe
5. `/onboarding` muestra form. Server Action `setNickname`:
   - valida con Zod: `3-20 chars, ^[a-zA-Z0-9_-]+$`
   - chequea unicidad
   - inserta row en `users` (id, email, nickname, role='user',
     created_at=now)
   - redirige a `/`

## Reglas

- El email viene de Supabase Auth, no del form de onboarding.
- Si el nickname ya existe → error humanamente legible.
- Solo el primer usuario que se registra es admin (seed manual con
  SQL después del despliegue). Los siguientes son `user`.

## Validación Zod

```ts
const nicknameSchema = z
  .string()
  .min(3)
  .max(20)
  .regex(/^[a-zA-Z0-9_-]+$/, "Solo letras, números, guiones y _");
```

## Edge cases

- Usuario tiene sesión válida pero canceló onboarding → redirige a
  `/onboarding` de nuevo en cualquier página protegida.
- Magic link expirado → mostrar error en `/auth/callback` con CTA "Pedí
  otro link".
