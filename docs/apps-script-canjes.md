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
  Logger.log('doPost: inicio');
  var body;
  try {
    body = JSON.parse(e.postData.contents);
    Logger.log('doPost: body OK, reward=' + body.reward_label + ' email=' + body.email);
  } catch (err) {
    Logger.log('doPost: JSON invalido: ' + err);
    return json_({ ok: false, step: 'parse', error: String(err) });
  }

  var expected = props.getProperty('SCRIPT_SECRET');
  if (!expected) {
    Logger.log('doPost: FALTA la propiedad SCRIPT_SECRET');
    return json_({ ok: false, step: 'secret', error: 'missing_script_secret' });
  }
  if (body.secret !== expected) {
    // Longitudes para depurar sin exponer el secreto.
    Logger.log('doPost: secreto NO coincide (recibido len=' +
      (body.secret ? String(body.secret).length : 0) + ', esperado len=' + expected.length + ')');
    return json_({ ok: false, step: 'secret', error: 'unauthorized' });
  }
  Logger.log('doPost: secreto OK → enviando correo');

  try {
    sendRedemptionEmail_(body, props);
    Logger.log('doPost: correo enviado OK');
    return json_({ ok: true });               // SOLO ok:true tras enviar de verdad
  } catch (err) {
    Logger.log('doPost: ERROR al enviar: ' + err);
    return json_({ ok: false, step: 'send', error: String(err) });
  }
}

// Disparador por tiempo (cada ~10 min): respaldo si el push no envió.
function pollPending() {
  var props = PropertiesService.getScriptProperties();
  var base = props.getProperty('API_BASE');
  var secret = props.getProperty('TEAM_SYNC_SECRET');
  Logger.log('pollPending: base=' + base);
  var resp = UrlFetchApp.fetch(base + '/api/bc/redemptions-pending', {
    method: 'get', headers: { 'x-team-secret': secret }, muteHttpExceptions: true
  });
  Logger.log('pollPending: status=' + resp.getResponseCode());
  if (resp.getResponseCode() !== 200) { Logger.log('pollPending: body=' + resp.getContentText()); return; }
  var pending = (JSON.parse(resp.getContentText()).pending) || [];
  Logger.log('pollPending: ' + pending.length + ' pendientes');
  if (!pending.length) return;
  var ids = [];
  pending.forEach(function (r) {
    try { sendRedemptionEmail_(r, props); ids.push(r.id); }   // solo marca si envió
    catch (err) { Logger.log('pollPending: fallo envio id=' + r.id + ': ' + err); }
  });
  if (!ids.length) return;
  UrlFetchApp.fetch(base + '/api/bc/redemptions-mark-notified', {
    method: 'post', contentType: 'application/json',
    headers: { 'x-team-secret': secret },
    payload: JSON.stringify({ ids: ids }), muteHttpExceptions: true
  });
  Logger.log('pollPending: marcados ' + ids.length);
}

function sendRedemptionEmail_(r, props) {
  var to = props.getProperty('TEAM_EMAILS'); // correos separados por coma
  Logger.log('sendEmail: TEAM_EMAILS="' + to + '"');
  if (!to || !to.trim()) throw new Error('TEAM_EMAILS vacío o no configurado');
  var reward = r.reward_label || r.reward_slug || '(sin nombre)';
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
  MailApp.sendEmail({ to: to.trim(), subject: subject, body: body });
  Logger.log('sendEmail: MailApp.sendEmail ejecutado → ' + to.trim());
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── Utilidades para PROBAR desde el editor (sin pasar por la app) ────────────
// 1) Revisa que las propiedades estén bien puestas.
function checkProps() {
  var p = PropertiesService.getScriptProperties();
  Logger.log('SCRIPT_SECRET set? '    + !!p.getProperty('SCRIPT_SECRET'));
  Logger.log('TEAM_SYNC_SECRET set? '  + !!p.getProperty('TEAM_SYNC_SECRET'));
  Logger.log('API_BASE = '             + p.getProperty('API_BASE'));
  Logger.log('TEAM_EMAILS = '          + p.getProperty('TEAM_EMAILS'));
}

// 2) Envía un correo de PRUEBA directo (dispara la autorización de MailApp la
//    primera vez). Ejecuta esta función y revisa el log + las bandejas.
function testSend() {
  var props = PropertiesService.getScriptProperties();
  sendRedemptionEmail_({
    reward_label: 'Shaker (PRUEBA)', reward_slug: 'shaker', cost: 900,
    full_name: 'Prueba Manual', email: 'prueba@ejemplo.com', phone: '5555555555',
    address: 'Calle Falsa 123, CDMX', size: '',
    redemption_id: 'test-123', user_id: 'test-user', created_at: new Date().toISOString()
  }, props);
  Logger.log('testSend: enviado (revisa Enviados y las bandejas de TEAM_EMAILS)');
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

## 4) Probar directamente desde el editor (sin pasar por la app)

1. **`checkProps`** → en el editor, selecciona la función `checkProps` y **Ejecutar**.
   En **Ver → Registros** (o el panel de ejecución) confirma:
   - `SCRIPT_SECRET set? true` y `TEAM_SYNC_SECRET set? true`
   - `TEAM_EMAILS` con los 3 correos, `API_BASE` correcto.
   Si `TEAM_EMAILS` sale vacío o el nombre de la propiedad no es EXACTO, ese es
   el fallo.
2. **`testSend`** → ejecútala. La **primera vez** te pedirá **autorizar MailApp**
   (acéptalo). Luego revisa el registro: debe decir `sendEmail: MailApp.sendEmail
   ejecutado`. Revisa las 3 bandejas y "Enviados". Si esto NO envía, el problema
   es de permisos/propiedades, no de la app.
3. **Push real:** haz un canje de prueba (premium pagado con saldo). En Apps
   Script → **Ejecuciones**, abre la de `doPost` y mira el log: te dice hasta
   dónde llegó (`secreto OK`, `correo enviado OK`, o el `step` que falló). Con el
   fix, si el secreto no coincide, el canje queda con `notified_at = null` y el
   poller lo reintenta.
4. **Poller:** pon `notified_at = null` en un canje y ejecuta `pollPending`; debe
   loguear los pendientes, enviar y marcarlos.

> **Por qué antes se marcaba `notified_at` sin enviar el correo:** ContentService
> de Apps Script SIEMPRE responde HTTP 200, aun cuando `doPost` rechaza por
> secreto. La versión vieja del endpoint miraba `r.ok` (status) → marcaba
> notified aunque no hubiera correo. Ya corregido: Vercel ahora mira el **cuerpo**
> (`ok:true`) y solo marca notified si Apps Script confirma el envío. Además el
> `doPost` corregido solo responde `ok:true` **después** de `MailApp.sendEmail`.
> Causa más probable de tu caso: `APPS_SCRIPT_SECRET` (Vercel) ≠ `SCRIPT_SECRET`
> (Apps Script). Revísalos con `checkProps` y el log de `doPost`.

## 5) Ciclo de estados (lo maneja el equipo)

`pending` → `shipped` → `delivered`. El equipo actualiza `status` en
Supabase (Table editor de `reward_redemptions`) conforme envía y entrega. La
usuaria ve el estado en su historial.
