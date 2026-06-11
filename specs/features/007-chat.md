# Feature 007 — Chat por fecha

## User story

Como participante quiero un chat público con el resto del grupo durante
la fecha activa para chicanear, festejar y sufrir en vivo. No me
interesa el historial: lo que se dijo en la fecha pasada se borra.

## Página

- `/chat` — protegida, un solo hilo plano correspondiente a la **fecha
  activa**.

## Layout (mobile-first)

- Header: `round_name` de la fecha activa.
- Lista de mensajes (más antiguos arriba, más recientes abajo).
  - cada mensaje: `nickname` + `created_at` (formato `HH:mm` si es de
    hoy, `DD/MM HH:mm` si no) + texto.
  - el mensaje propio se distingue visualmente (color de chip
    diferente, alineado a la derecha).
- Auto-scroll al último mensaje al entrar y después de cada submit
  propio. No hay infinite scroll: con 10 personas y ventana de ~1
  semana, el volumen es chico.
- Input fijo al pie con un `textarea` de 1-3 líneas y botón "Enviar"
  (o `Cmd/Ctrl+Enter`).
- Sin estado vacío especial: si no hay mensajes, mostrar copy
  "Todavía nadie dijo nada. Tirá la primera." y nada más.

## Reglas

- **Sin historial**: el chat solo muestra mensajes de la fecha activa.
  Cuando el cron limpia, se borran todos los mensajes y arranca vacío.
- **Sin edición ni borrado**: una vez enviado, queda. Tampoco el
  admin puede borrar — coherente con "el chat se va a borrar igual".
- **Sin reacciones**.
- **Sin moderación**: cero filtros automáticos, cero reportes.
- **Sin notificaciones**: nada de badges, mails ni push. Hay que
  entrar a `/chat` para enterarse.
- **Sin menciones especiales**: el `@nickname` en texto es solo
  texto. No hay autocompletado ni link.

## Server Action: `postChatMessage`

```ts
const schema = z.object({
  text: z.string().trim().min(1).max(500),
});
```

Pasos:

1. `getUser()`. Si no hay → throw.
2. Validar input con Zod (`min(1)` rechaza solo-whitespace por el
   `.trim()` previo).
3. `INSERT` en `chat_messages` con `user_id`, `text`, `created_at = now()`.
4. `revalidatePath('/chat')`.

## Auto-refresh

Polling client-side cada **5 segundos** mientras la página está
visible (`document.visibilityState === 'visible'`). Cuando vuelve a
foreground, fuerza un refetch inmediato.

Decisión: no usamos realtime (Supabase Realtime / WS) en v1. Polling
es trivial y suficiente para 10 personas tirando ~50 mensajes por
fecha.

## Cron de limpieza

`/api/cron/clear-chat` — corre 1×/día (sumar a `vercel.json`).

Lógica:

1. Calcular `active_round_number` con `getActiveRoundNumber()` de
   `lib/active-round.ts`.
2. Buscar el `MAX(kickoff_at)` de partidos con
   `round_number = active_round_number`.
3. Si `now > max_kickoff_at + 24h` **y** existe una próxima fecha
   con partidos `scheduled` → **truncar `chat_messages`**.
4. Si no, no-op (estamos todavía en la ventana de cortesía o no hay
   fecha siguiente).

El cron también devuelve `{ cleared: boolean, reason: string }` para
el `/admin/sync` (ver más abajo).

## Visibilidad en header

Link "Chat" en el header del home, al lado de Ranking e Historial.
Sin badge (no hay estado de "no leído").

## Edge cases

- **Torneo terminado**: `getActiveRoundNumber()` devuelve la última
  fecha. El chat queda con los mensajes de esa fecha **hasta** 24h
  después del último kickoff, después se vacía y queda permanentemente
  vacío (no hay fecha siguiente que dispare la limpieza, pero queda
  vacío después del último ciclo). Coherente.
- **Cambio de fecha activa con cron del chat caído**: el cron del día
  siguiente lo limpia. No es crítico que sea exactamente a las 24h.
- **Texto con saltos de línea**: se conservan, renderiza con
  `white-space: pre-wrap`. Sin markdown.
- **Texto > 500 chars**: el form lo trunca client-side y el server
  lo rechaza. Mostrar contador `N / 500` cuando supera 400.
- **Mensaje enviado mientras el cron limpia**: ventana minúscula. Si
  el INSERT cae justo después del TRUNCATE, el mensaje queda solo en
  la nueva fecha — no es un bug, es la semántica.
- **Usuario borrado por admin**: cascade en FK borra sus mensajes.

## Admin

Sumar a `/admin/sync`:

- Botón "Limpiar chat ahora" que invoca el endpoint del cron.
- Última corrida del cron del chat (timestamp + `cleared` boolean +
  `reason`).

## Tabla nueva

Ver `data-model.md`:

```
chat_messages
  id           serial PK
  user_id      uuid FK→users (ON DELETE CASCADE)
  text         text NOT NULL  (1..500)
  created_at   timestamptz NOT NULL DEFAULT now()

INDEX chat_messages(created_at)
```

No hay `round_id` ni `round_number`: el chat es siempre "lo que está
ahora" — la fecha se infiere del momento, y el cron se encarga de
truncar.
