# Feature 009 — Apuestas

## User story

Como participante quiero crear apuestas 1X2 sobre partidos de la
fecha activa, y sumarme a apuestas creadas por otros, poniendo en
juego puntos del torneo. Los puntos perdidos arrastran al ranking
general — la chicana tiene precio real.

## Concepto

- Apuesta = predicción **1X2** sobre un partido específico (gana
  local / empate / gana visitante).
- El creador define el partido, el pick y el monto.
- Otros participantes se suman aportando **el mismo monto** que el
  creador.
- El "lado" de cada participante (a favor o en contra) se **deriva
  automáticamente de su pronóstico oficial** de ese partido, no se
  elige.
- Al cerrar el partido: el pozo total se reparte equitativamente
  entre los ganadores. El residuo de la división entera queda en el
  sistema.
- Los puntos apostados se descuentan del puntaje del torneo. Las
  ganancias se suman. **Saldo negativo permitido**: se arrastra al
  ranking.

## Página

- `/apuestas` — protegida. Lista de apuestas de la fecha activa.
  - Sección "Crear apuesta" arriba.
  - Lista de apuestas activas + cerradas + resueltas.

## Layout

### Crear apuesta

Form con:
- Select de partido (solo partidos de la fecha activa con
  `now < kickoff_at`).
- Radio buttons: gana `home_team` / Empate / gana `away_team`.
- Input numérico: monto (1 ≤ N ≤ 20).
- Botón "Crear apuesta".

Bloqueos UI:
- Si el creador **no tiene pronóstico cargado** para ese partido →
  CTA "Cargá tu pronóstico primero" con link a `/`. No deja crear.
- Si el creador ya tiene 5 apuestas abiertas (creadas o aceptadas, no
  resueltas) → CTA deshabilitado con tooltip "Llegaste al máximo de
  5 apuestas abiertas".

### Card de apuesta

Para cada apuesta:

- Header: partido (escudos + nombres) + horario + estado (Abierta /
  Cerrada / Resuelta / Cancelada).
- Pick del creador: "Gastón apuesta a que **gana Argentina**".
- Monto: "20 pts c/u".
- Pozo en vivo: "Pozo: 60 pts (3 jugadores)".
- **Preview de payout** según estado actual del pozo:
  - "Si gana Argentina: 4 a favor → cada uno se lleva 15 pts (ganan
    -5)" (o lo que sea).
  - "Si no gana Argentina: 1 en contra → se lleva 60 pts (gana 40)".
- Lista de participantes con su `nickname` + lado (chip "A favor" /
  "En contra"), ordenados por momento de sumarse.
- Botón "Sumarme" (deshabilitado si ya estás dentro, si sos el
  creador, o si llegó el kickoff).
- Si está resuelta: chip de resultado + tu delta de puntos (+15 / -20).

### Filtros

- Tabs: "De la fecha" (activa) / "Mis apuestas" / "Histórico".
- "Mis apuestas" incluye creadas + aceptadas, abiertas y resueltas.
- "Histórico" incluye apuestas resueltas/canceladas de fechas
  anteriores (no se borran, a diferencia del chat).

## Reglas de negocio

### Crear

1. El usuario debe tener pronóstico cargado para ese partido.
   El "lado del creador" se deriva de su pronóstico:
   - Pick del creador = "gana A". Pronóstico = 2-1 A → lado **a favor**.
   - Pick del creador = "gana A". Pronóstico = 1-1 → lado **en contra**.
2. **El pick del creador debe coincidir con su pronóstico 1X2**
   (no se puede crear una apuesta "gana Argentina" si tu pronóstico es
   1-1). Esto evita la inconsistencia "apostás a algo que vos mismo
   decís que no va a pasar". Server-side guard.
3. El monto debe estar en `[1, 20]`.
4. El usuario debe tener < 5 apuestas abiertas.
5. El partido debe estar en la fecha activa y con `now < kickoff_at`.
6. Se crea row en `bets` con status `'open'` y row en `bet_entries`
   con el creador, lado `'pro'` (siempre a favor de su propio pick).
7. El monto del creador se descuenta del balance ahora.

### Sumarse

1. El usuario debe tener pronóstico cargado para ese partido.
2. El usuario no debe ser el creador ni estar ya dentro.
3. La apuesta debe estar `'open'` (no llegó el kickoff).
4. **Lado se deriva automáticamente** del pronóstico del que se suma:
   - Pronóstico cae en el mismo 1X2 que el pick del creador → `'pro'`.
   - Pronóstico cae en uno de los otros dos outcomes → `'con'`.
5. Se crea row en `bet_entries` con `side = 'pro'|'con'` (snapshot, no
   se actualiza después).
6. El monto (igual al monto de la apuesta) se descuenta del balance.

### Cierre (lock al kickoff)

- Cuando `now >= match.kickoff_at`, la apuesta pasa a status
  `'locked'`. No se permiten más entries.
- Si al cerrarse no hay ningún `bet_entry` del lado `'con'` (nadie se
  sumó en contra) → la apuesta se **cancela**: todos los participantes
  (incluido el creador) recuperan su monto. Status `'cancelled'`.
- Idem si no hay `'pro'` aparte del creador y... no, eso no aplica: el
  creador siempre es `'pro'`. La condición real es: para que el bet
  se active, necesita al menos 1 entry de cada lado.

### Resolución

Cuando el partido cambia a `status = 'finished'`:

1. Determinar el 1X2 real:
   - `home_score > away_score` → "gana home".
   - `home_score < away_score` → "gana away".
   - `home_score === away_score`:
     - Si `is_knockout` y `penalty_winner` está seteado → gana el lado
       del `penalty_winner` (consistente con el resto de la app).
     - Si no es knockout → "empate".
2. Comparar el 1X2 real contra el pick del creador.
3. Determinar el "lado ganador" (`'pro'` si coinciden, `'con'` si no).
4. Si el partido fue **postponed/cancelled** sin re-asignar fecha →
   la apuesta se cancela y todos recuperan su monto.
5. Sumar `pot = monto × cantidad_de_entries`.
6. Contar `winners = entries del lado ganador`.
7. `payout_per_winner = floor(pot / winners)`.
8. `residuo = pot - (payout_per_winner × winners)` → queda en sistema
   (no se reparte ni se guarda en ningún lado, simplemente "desaparece"
   de la economía).
9. Por cada winner: sumar `payout_per_winner` a su balance.
10. Status pasa a `'resolved'`.

### Snapshot del lado

Una vez que un usuario se suma, su lado queda **congelado**. Si
después cambia su pronóstico del partido (las predicciones se editan
hasta el kickoff), su lado en la apuesta **no se mueve**.

Esto se documenta en la UI al sumarse: "Tu pronóstico actual te
ubica del lado **a favor**. Si cambiás el pronóstico después, tu lado
acá no cambia."

## Server Actions

### `createBet`

```ts
const schema = z.object({
  matchId: z.number().int(),
  pick: z.enum(["home", "draw", "away"]),
  amount: z.number().int().min(1).max(20),
});
```

Pasos:
1. `getUser()`, throw si no hay.
2. Validar Zod.
3. Verificar match en fecha activa y `now < kickoff_at`.
4. Cargar la `prediction` del usuario para ese match. Si no existe →
   throw "Cargá tu pronóstico primero".
5. Verificar que el 1X2 derivado del pronóstico coincide con `pick`.
   Si no → throw "El pick debe coincidir con tu pronóstico".
6. Verificar que el usuario tiene < 5 apuestas abiertas.
7. Transacción:
   - `INSERT bets`.
   - `INSERT bet_entries` con `side='pro'`.
8. `revalidatePath('/apuestas')`.

### `joinBet`

```ts
const schema = z.object({
  betId: z.number().int(),
});
```

Pasos:
1. `getUser()`, throw si no hay.
2. Cargar bet. Verificar `status='open'` y `now < kickoff_at`.
3. Verificar que no es el creador ni está ya dentro.
4. Cargar `prediction` del usuario para `bet.match_id`. Si no existe →
   throw.
5. Derivar lado del pronóstico vs `bet.pick` → `'pro'` o `'con'`.
6. `INSERT bet_entries`.
7. `revalidatePath('/apuestas')`.

### Resolución automática

No hay action manual: la resolución corre **al final del cron de
sync** (`/api/cron/sync`). Después del upsert de matches, antes de
devolver:

```
resolveFinishedBets()
  for each bet in status IN ('open', 'locked'):
    match = bets.match
    if match.status === 'finished':
      ... resolver según reglas
    else if match.status === 'postponed' && fecha re-asignada futura:
      ... no-op (esperar)
    else if match.status === 'postponed' && cancelado sin re-asignar:
      ... cancelar bet
```

También corre el lock: si `bet.status === 'open'` y
`now >= match.kickoff_at` → pasar a `'locked'` y aplicar regla "sin
contras → cancelar".

## Cálculo del balance

El **balance disponible** de un usuario para apostar es:

```
balance = puntos_actuales_del_ranking
        - sum(amount de bet_entries en bets status 'open' o 'locked')
```

(Las apuestas resueltas ya impactaron el ranking; las abiertas
"reservan" puntos.)

Pero **no hay tope inferior**: el balance puede ser negativo. Si tu
ranking dice 5 puntos y querés crear una apuesta de 20 → se te
permite, y tu balance queda en `-15` provisional. Tras resolución, si
ganás vuelve a positivo; si perdés se confirma el negativo.

El ranking de la página `/ranking` ya refleja los netos: las apuestas
abiertas no descuentan del ranking visible (solo "reservan"), las
resueltas sí. Esto se hace via `score_adjustments` para no ensuciar la
fórmula del `lib/scoring.ts`:

- Cuando se resuelve un bet, se inserta una `score_adjustment` por
  cada participante con su delta (+payout o -amount) y `reason =
  'Bet #N — Argentina vs Brasil'`.
- El campo `created_by` se setea al `user_id` del creador del bet (no
  hay admin).

Decisión: **reusar `score_adjustments`** en vez de inventar
`bet_resolutions`. Mantiene una sola fuente de delta en el ranking.

## Visibilidad de balance

En `/apuestas` mostrar arriba:

- Tu puntaje actual: X
- Puntos comprometidos en apuestas abiertas: Y
- Disponible: X - Y

## Tablas nuevas

Ver `data-model.md`:

```
bets
  id           serial PK
  creator_id   uuid FK→users (ON DELETE CASCADE)
  match_id     int FK→matches
  pick         text NOT NULL ('home' | 'draw' | 'away')
  amount       int NOT NULL (1..20)
  status       text NOT NULL ('open' | 'locked' | 'resolved' | 'cancelled')
  created_at   timestamptz NOT NULL DEFAULT now()
  resolved_at  timestamptz nullable
  outcome      text nullable ('pro' | 'con')   -- lado ganador al resolver

bet_entries
  id           serial PK
  bet_id       int FK→bets (ON DELETE CASCADE)
  user_id      uuid FK→users (ON DELETE CASCADE)
  side         text NOT NULL ('pro' | 'con')   -- snapshot al sumarse
  created_at   timestamptz NOT NULL DEFAULT now()
  UNIQUE (bet_id, user_id)

INDEX bets(match_id)
INDEX bets(status)
INDEX bet_entries(user_id)
```

## Edge cases

- **El creador no puede apostar contra su propia apuesta**: garantizado
  por construcción (el creador es siempre `'pro'`, y `UNIQUE(bet_id,
  user_id)` evita que se sume otra vez).
- **El pick del creador debe coincidir con su pronóstico**: validado
  en `createBet`. Si cambia el pronóstico después de crear, **el bet
  no se cancela** — el creador ya se comprometió (snapshot).
- **Match postponed después de creada la apuesta**: cuando el sync
  detecta `status='postponed'`, dejar la apuesta `'open'` esperando.
  Si en una corrida posterior el match aparece como cancelado
  definitivo (sin nuevo kickoff razonable) → cancelar apuesta y
  devolver puntos. Decisión: si el sync no marca cancelación explícita
  pero pasaron N días sin nuevo kickoff → no-op por ahora, decisión
  manual del admin si hace falta (puede usar `score_adjustments` a
  mano).
- **Empate en partido knockout sin penalty_winner aún**: el match
  todavía no está `'finished'` (o lo está pero falta el penalty). El
  resolver espera al próximo ciclo del cron. Cuando llega el
  penalty_winner, resuelve.
- **División no entera**: `floor(pot / winners)`, residuo se descarta
  (queda en el sistema). Ej: pot=10, winners=3 → cada uno se lleva 3,
  residuo 1.
- **Usuario borrado por admin con bets abiertas**: cascade borra sus
  bet_entries y, si era creador, también sus bets (con todas las
  entries asociadas). Los demás entries de esas bets se "cancelan
  silenciosamente" — los puntos comprometidos vuelven via
  `score_adjustments` reverso. Esta es deuda de implementación; en
  v1 documentar que **borrar un usuario con bets activas no devuelve
  puntos automáticamente** y el admin debe ajustarlos a mano.

## Tests críticos

- `lib/bet-resolution.test.ts` (módulo puro):
  - Resolución con `pro` ganador, varios ganadores.
  - Resolución con `con` ganador, un solo ganador.
  - División con residuo.
  - Knockout con penalty_winner.
  - Cancelación por falta de oponente.
- `lib/bet-side.test.ts` (módulo puro):
  - Derivación de `'pro'|'con'` para los 9 combos (pick × pronóstico).
- Tests de Server Actions con Supabase test client.

## Lo que NO está en scope

- Apuestas sobre resultado exacto.
- Apuestas over/under.
- Cuotas variables.
- Apuestas múltiples (combinadas).
- Cambiar el lado después de sumarse.
- Notificaciones cuando alguien se suma a tu apuesta.
- Deshacer una apuesta una vez creada.
