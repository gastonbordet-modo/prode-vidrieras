# Feature 007 — Chat por fecha

## User story

Como participante quiero un chat público con el resto del grupo durante
la fecha activa para chicanear, festejar y sufrir en vivo. No me
interesa el historial: lo que se dijo en la fecha pasada se borra.

## Ubicación

El chat **no tiene página propia**: vive embebido en `/` (home), como
sección arriba de `<MainTabs />`. No se suma tab "Chat" al header.

Razones: en un grupo de 10 con poco volumen de mensajes, tenerlo
siempre visible al pie del header invita a leer y postear sin un
click extra. Al estar acotado en altura, no compite con los partidos
de la fecha.

## Layout (mobile-first)

- Encabezado mínimo "Chat" en uppercase (tipografía del theme).
- Contenedor con altura fija (`h-[35vh]` + `min-h-[180px]`) y
  `overflow-y-auto`. El scroll vive dentro del contenedor, no del
  body.
- Lista de mensajes (más antiguos arriba, más recientes abajo).
  - cada mensaje: `nickname` + `created_at` formato `DD/MM HH:mm` +
    texto.
  - el mensaje propio se distingue visualmente (alineado a la derecha,
    nickname en color del default).
- Auto-scroll al pie del contenedor al primer mount y cuando llega un
  mensaje nuevo (vía `scrollTop = scrollHeight`, scope limitado al
  contenedor del chat para no mover el resto de la página).
- `textarea` de 2 líneas con botón "Enviar". Atajo `⌘/Ctrl + Enter`
  envía.
- Empty state: "Todavía nadie dijo nada. Tirá la primera."

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

Vive en `app/actions.ts` junto con las demás server actions del home.

```ts
const schema = z.object({
  text: z.string().trim().min(1).max(500),
});
```

Pasos:

1. `requireUser()`. Si no hay → redirect a `/login`.
2. Validar input con Zod (`min(1)` rechaza solo-whitespace por el
   `.trim()` previo).
3. `INSERT` en `chat_messages` con `user_id`, `text`, `created_at = now()`.
4. `revalidatePath('/')`.

## Auto-refresh

Polling client-side cada **5 segundos** mientras la pestaña está
visible (`document.visibilityState === 'visible'`). Cuando vuelve a
foreground, fuerza un refetch inmediato.

El cliente hace `fetch` a un endpoint dedicado en lugar de
`router.refresh()` para no re-correr las queries de matches y
predicciones de la home en cada tick.

### Endpoint: `GET /api/chat/messages?since=<id>`

- Auth: sesión Supabase via cookies (`createClient()` + `getUser()`).
  Si no hay usuario → `401`.
- Query: `since` (entero, default `0`). Devuelve mensajes con
  `id > since`, ordenados ascendente por `created_at`.
- Respuesta:
  ```ts
  type ChatMessagesResponse = {
    messages: Array<{
      id: number;
      userId: string;
      nickname: string;
      text: string;
      createdAt: string; // ISO
    }>;
    truncated: boolean;
  };
  ```
- Edge case truncate: si `since > maxId(server)`, el cliente está
  por delante del server (el cron limpió entre polls). Devolvemos
  `truncated: true` y la lista completa actual. El cliente
  reemplaza su estado local en vez de hacer append.

### Cliente

- State local `messages` inicializado con los mensajes del SSR (la
  home consulta y los pasa como prop). Polling después.
- `lastSeenIdRef` guarda el max id visto; se manda como `since`.
- `AbortController` cancela el fetch en vuelo cuando empieza otro o
  cambia visibilidad / unmount.
- Después de un submit exitoso, dispara un poll inmediato para
  mostrar el propio mensaje sin esperar al próximo tick.

Decisión: no usamos realtime (Supabase Realtime / WS) en v1.
Polling es suficiente para 10 personas.

## Cron de limpieza

`/api/cron/clear-chat` — corre 1×/día (sumar a `vercel.json`).

Mantiene un cursor en `app_state` (`last_cleared_chat_round`) con el
número de la última fecha cuyo chat ya fue limpiado. El cron avanza
ese cursor cuando se cumple la ventana de 24h.

Lógica (en `lib/clear-chat.ts`, función pura `shouldClearChat`):

1. `active = getActiveRound()` (de `lib/active-round.ts`).
2. `lastCleared = app_state.last_cleared_chat_round` (0 si nunca corrió).
3. `previousRoundEndMs = MAX(kickoff_at)` de partidos con
   `round_number = active - 1` (null si no existen).
4. Decisión:
   - `active === null` → no limpiar.
   - `active <= lastCleared` → ya estamos al día, no limpiar.
   - `previousRoundEndMs === null` (primera fecha) → avanzar cursor
     sin truncar.
   - `now - previousRoundEndMs < 24h` → ventana de cortesía, no
     limpiar todavía.
   - En cualquier otro caso → `TRUNCATE chat_messages` + avanzar
     cursor a `active`.

El cron también persiste en `app_state.last_chat_cron` un objeto
`{ at, cleared, reason }` para mostrar en `/admin/sync`.

## Visibilidad en header

Sin link "Chat" en `MainTabs` — el chat vive directamente en home.
Las demás secciones (Ranking, Historial) siguen igual.

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

Además, en `app_state`:

- `last_cleared_chat_round` — número (como text) de la última fecha
  cuyo chat fue limpiado. Cursor del cron.
- `last_chat_cron` — JSON `{ at, cleared, reason }` con la última
  corrida, para mostrar en `/admin/sync`.
