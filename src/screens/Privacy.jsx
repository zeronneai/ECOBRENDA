import { useNavigate } from 'react-router-dom'

export default function Privacy() {
  const navigate = useNavigate()
  return (
    <section className="screen active" id="s-privacy">
      <div className="scroll">
        <div className="topgap" />
        <div className="hdr reveal d1" style={{ alignItems: 'center', justifyContent: 'flex-start' }}>
          <button className="pg-back" onClick={() => navigate('/profile')}>‹</button>
          <div><div className="hi">Legal</div><div className="name">PRIVACIDAD</div></div>
        </div>

        <div className="pad legal reveal d2">
          <p className="legal-lead">Tu privacidad es lo primero. Esto resume cómo manejamos tus datos.</p>

          <h3>Datos en tu dispositivo</h3>
          <p>Tu perfil, rachas, registros de entrenamiento y de peso se guardan localmente en tu teléfono. No necesitas crear una cuenta para usar la app.</p>

          <h3>Cámara</h3>
          <p>El conteo de repeticiones se procesa <b>100% en tu dispositivo</b>. El video de tu cámara <b>nunca se sube</b> ni se guarda en ningún servidor.</p>

          <h3>Notificaciones</h3>
          <p>Usamos notificaciones solo para tu alarma y recordatorios que tú configuras. Puedes desactivarlas cuando quieras desde Ajustes.</p>

          <h3>Pagos</h3>
          <p>La suscripción se procesa de forma segura por nuestro proveedor de pagos. No almacenamos los datos de tu tarjeta.</p>

          <h3>Tus controles</h3>
          <p>Puedes reiniciar tu progreso o borrar todos tus datos en cualquier momento desde Ajustes → Zona de peligro.</p>

          <h3>Contacto</h3>
          <p>¿Dudas sobre tu privacidad? Escríbenos a hola@zeronne.ai.</p>

          <p className="legal-foot">Última actualización: 2026 · Booty Alarm</p>
        </div>
      </div>
    </section>
  )
}
