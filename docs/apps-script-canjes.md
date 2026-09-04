# Aviso de canjes por correo (Google Apps Script)

Notifica a 3 correos del equipo cuando alguien canjea Brenda Coins, **sin usar un
servicio de pago**. Dos caminos (híbrido):

- **Push instantáneo:** el endpoint `/api/bc/redeem` (Vercel) hace `POST` al Web
  App de Apps Script al crear el canje → correo inmediato. Apps Script **no toca
  Supabase**, solo recibe el payload ya listo.
- **Poller de respaldo:** un disparador por tiempo (cada ~10 min) lee los canjes
  pendientes no notificados vía `/api/bc/redemptions-pending` (endpoint estrecho
  protegido por secreto) y envía los que el push no alcanzó, marcándolos con
  `/api/bc/redemptions-mark-notified`.

Supabase queda cerrado por RLS + service_role; Apps Script nunca ve credenciales
de la base — solo habla con endpoints acotados por un secreto compartido.

---

## 1) Código del script (`Code.gs`)

```javascript
function doPost(e) {
  var props = PropertiesService.getScriptProperties();
  var body;
  try { body = JSON.parse(e.postData.contents); }
  catch (err) { return json_({ ok: false, error: 'bad_json' }); }
  // Secreto compartido con Vercel (APPS_SCRIPT_SECRET).
  if (body.secret !== props.getProperty('SCRIPT_SECRET')) {
    return json_({ ok: false, error: 'unauthorized' });
  }
  sendRedemptionEmail_(body, props);
  return json_({ ok: true });
}

// Disparador por tiempo (cada ~10 min): respaldo si el push falló.
function pollPending() {
  var props = PropertiesService.getScriptProperties();
  var base = props.getProperty('API_BASE');
  var secret = props.getProperty('TEAM_SYNC_SECRET');
  var resp = UrlFetchApp.fetch(base + '/api/bc/redemptions-pending', {
    method: 'get', headers: { 'x-team-secret': secret }, muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) return;
  var pending = (JSON.parse(resp.getContentText()).pending) || [];
  if (!pending.length) return;
  var ids = [];
  pending.forEach(function (r) { sendRedemptionEmail_(r, props); ids.push(r.id); });
  UrlFetchApp.fetch(base + '/api/bc/redemptions-mark-notified', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-team-secret': secret },
    payload: JSON.stringify({ ids: ids }), muteHttpExceptions: true
  });
}

function sendRedemptionEmail_(r, props) {
  var to = props.getProperty('TEAM_EMAILS'); // separados por coma
  var reward = r.reward_label || r.reward_slug;
  var subject = 'Nuevo canje Brenda Coins: ' + reward;
  var body = [
    'Recompensa: ' + reward + ' (' + r.cost + ' BC)',
    'Nombre: ' + r.full_name,
    'Correo: ' + r.email,
    'Teléfono: ' + r.phone,
    'Dirección: ' + r.address,
    'Talla: ' + (r.size || '(no aplica)'),
    '',
    'ID de canje: ' + (r.redemption_id || r.id),
    'Usuaria: ' + (r.user_id || '(desde poller)'),
    'Fecha: ' + (r.created_at || new Date().toISOString())
  ].join('\n');
  MailApp.sendEmail({ to: to, subject: subject, body: body });
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
```

---

## 2) Cómo publicarlo

1. Ve a **script.google.com** → **Nuevo proyecto**. Pega `Code.gs`.
2. **Configuración del proyecto** (engrane) → **Propiedades del script** → agrega:
   | Propiedad | Valor |
   |---|---|
   | `SCRIPT_SECRET` | un secreto aleatorio (ver abajo) |
   | `TEAM_SYNC_SECRET` | otro secreto aleatorio |
   | `API_BASE` | `https://ecobrenda.vercel.app` |
   | `TEAM_EMAILS` | `correo1@x.com,correo2@x.com,correo3@x.com` |
3. **Implementar** → **Nueva implementación** → tipo **Aplicación web**:
   - *Ejecutar como*: **Yo**
   - *Quién tiene acceso*: **Cualquier persona**
   - Copia la **URL `/exec`** que te da.
4. **Disparadores** (reloj, panel izquierdo) → **Agregar disparador**:
   - Función: `pollPending` · Evento: **Basado en tiempo** → **Temporizador por
     minutos** → **cada 10 minutos**.
5. La primera vez te pedirá **autorizar** permisos de correo (MailApp) y de red
   (UrlFetchApp). Acéptalos.

---

## 3) Secretos y dónde van

Genera dos secretos aleatorios (por ejemplo con `openssl rand -hex 24`).

| Secreto | En Apps Script (Propiedades del script) | En Vercel (Variables de entorno) |
|---|---|---|
| Secreto del push | `SCRIPT_SECRET` | `APPS_SCRIPT_SECRET` (mismo valor) |
| Secreto del poller | `TEAM_SYNC_SECRET` | `TEAM_SYNC_SECRET` (mismo valor) |
| URL del Web App | — | `APPS_SCRIPT_URL` = la URL `/exec` del paso 2.3 |

En **Vercel → Project → Settings → Environment Variables** agrega (Production):
`APPS_SCRIPT_URL`, `APPS_SCRIPT_SECRET`, `TEAM_SYNC_SECRET`.
(`SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` ya existen.)

Tras agregarlas, **redeploy** en Vercel para que tomen efecto.

---

## 4) Probar

- **Push:** haz un canje de prueba (usuario premium pagado con saldo). Debe
  llegar el correo en segundos y el canje queda con `notified_at` puesto.
- **Poller:** en el editor de Apps Script, ejecuta `pollPending` manualmente
  (no debería mandar nada si el push ya notificó todo). O borra `notified_at` de
  un canje en Supabase y espera al disparador.

## 5) Ciclo de estados (lo maneja el equipo)

`pending` → `shipped` → `delivered`. El equipo actualiza `status` en
Supabase (Table editor de `reward_redemptions`) conforme envía y entrega. La
usuaria ve el estado en su historial.
