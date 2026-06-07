# PRD — prode-vidrieras

## Contexto

Equipo Vidrieras de Modo quiere jugar un prode interno del Mundial 2026.
Grupo chico (~10 personas). No queremos pagar por una plataforma
existente y queremos tener control sobre las reglas (las del reglamento
de "Prode oficial Modo" del mundial pasado, ver `specs/scoring.md`).

## Objetivo

Una web pública, simple, donde cada miembro del equipo:

1. Se registra con su mail.
2. Elige un nickname público.
3. Pronostica los partidos de la fecha activa del Mundial 2026.
4. Ve el ranking general y por fecha en tiempo cuasi-real.

## Usuarios

- **Participante** (usuario normal): juega y consulta su ranking.
- **Admin** (Gastón): además puede borrar usuarios, ajustar puntos a
  mano, y disparar los crons de sincronización manualmente.

## User Stories

### Registro y onboarding

- Como nuevo usuario, ingreso mi email y recibo un magic link para
  loguearme.
- En mi primer ingreso elijo un **nickname único** que el resto del
  grupo verá en el ranking.
- Quedo inscripto automáticamente al único torneo (Mundial 2026).

### Pronosticar

- Como participante, en la home veo **la fecha activa** del torneo con
  todos sus partidos.
- Para cada partido cargo el resultado: goles del local, goles del
  visitante. Si es eliminación directa y empato, además elijo qué
  equipo gana por penales.
- Puedo modificar mi pronóstico **hasta el horario de kickoff** del
  partido. Después se bloquea.
- Si no cargué pronóstico antes del kickoff, ese partido cuenta como 0
  puntos.

### Ver ranking

- Veo el **ranking general** ordenado por puntos totales del torneo
  (con desempates aplicados).
- Veo el **ranking de la fecha activa** ordenado por puntos de esa
  fecha (con desempates aplicados).
- Para cada participante veo: posición, nickname, puntos, cantidad de
  resultados exactos.

### Historial

- Una vez que una fecha termina, puedo revisarla en `/historial`:
  mis pronósticos vs el resultado real, y los puntos que obtuve
  desglosados por partido.

### Admin

- Como admin, accedo a `/admin` solo si mi `role = 'admin'`.
- Puedo ver la lista de usuarios y **borrar** uno (con confirmación).
- Puedo **ajustar puntos** de un usuario sumando o restando un delta,
  con motivo escrito. El ajuste queda registrado.
- Puedo **disparar manualmente** el sync de fixtures o el sync de
  resultados.

## Reglas no-funcionales

- App pública (sin allowlist) pero pensada para ~10 usuarios.
- Free tier de Vercel + Supabase.
- Sync de datos del Mundial: 1x por día desde football-data.org.
- Mobile-first (la mayoría va a cargar pronósticos desde el celu).
- Dark theme único (los tokens del YOY son dark-only).
- Idioma: español (Argentina).

## Fuera de scope (v1)

- Múltiples torneos.
- Pronósticos privados o grupos.
- Notificaciones por mail / push.
- Comentarios o chat.
- Estadísticas avanzadas (rachas, promedios, etc.).
- Ver pronósticos de otros antes del kickoff.
- Reactivar partidos cancelados.
- Edición de predicciones por parte del admin.

## Métricas de éxito

- 10 usuarios registrados antes del primer partido.
- Cero "perdimos pronósticos por bug" durante el torneo.
- Ranking refleja resultados oficiales en ≤24h.
