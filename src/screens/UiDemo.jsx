/* ⚠️ PANTALLA TEMPORAL — solo para revisar el kit premium (Rediseño Fase 3).
   Ruta pública /demo-ui (fuera de AppShell). ELIMINAR cuando terminemos de
   aplicar el kit a las pantallas reales. */
import Button3D from '../components/ui/Button3D'
import GlassButton from '../components/ui/GlassButton'
import GlowButton from '../components/ui/GlowButton'
import DestelloCard from '../components/ui/DestelloCard'

const wrap = {
  minHeight: '100%', background: 'var(--bg)', color: 'var(--txt)',
  padding: '28px 20px 60px', maxWidth: 480, margin: '0 auto',
  fontFamily: 'Archivo, sans-serif', overflowY: 'auto', height: '100%',
}
const label = { fontFamily: 'Archivo', fontWeight: 800, fontSize: 13, letterSpacing: '.04em', color: 'var(--magenta-soft)', margin: '28px 0 12px', textTransform: 'uppercase' }
const desc = { fontSize: 13, color: 'var(--txt-dim)', marginTop: 8 }
const row = { display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }

export default function UiDemo() {
  return (
    <div style={wrap}>
      <div style={{ fontSize: 12, color: 'var(--txt-faint)', border: '1px dashed var(--line-strong)', borderRadius: 10, padding: '8px 12px', marginBottom: 8 }}>
        ⚠️ Demo temporal del kit premium · ruta /demo-ui · se elimina después
      </div>
      <h1 style={{ fontFamily: 'Archivo Black, Archivo', fontSize: 30, textTransform: 'uppercase' }}>Kit Premium</h1>

      {/* 1) Button3D */}
      <div style={label}>Button3D — acciones principales</div>
      <div style={row}>
        <Button3D onClick={() => {}}>Generar mi plan</Button3D>
        <Button3D onClick={() => {}} disabled>Disabled</Button3D>
      </div>
      <Button3D fullWidth onClick={() => {}}>Empezar 🔥 (fullWidth)</Button3D>
      <p style={desc}>Profundidad 3D con sombra sólida tipo tecla; se hunde al presionar. Para el CTA más importante de cada pantalla.</p>

      {/* 2) GlassButton */}
      <div style={label}>GlassButton — acciones secundarias / DONE / tabs</div>
      <div style={row}>
        <GlassButton onClick={() => {}}>Listo ✓</GlassButton>
        <GlassButton variant="lima" onClick={() => {}}>DONE</GlassButton>
        <GlassButton onClick={() => {}} disabled>Disabled</GlassButton>
      </div>
      <p style={desc}>Liquid glass (blur). Magenta o lima. Para acciones de apoyo, confirmar, o chips flotantes.</p>

      {/* 3) GlowButton */}
      <div style={label}>GlowButton — estados especiales / urgencia / alarma</div>
      <div style={row}>
        <GlowButton onClick={() => {}}>Detener alarma</GlowButton>
        <GlowButton variant="lima" onClick={() => {}}>Reto activo</GlowButton>
        <GlowButton onClick={() => {}} disabled>Disabled</GlowButton>
      </div>
      <p style={desc}>Borde y glow de color sobre fondo oscuro. Para momentos de urgencia o foco (alarma sonando, reto en curso).</p>

      {/* 4) DestelloCard — ejemplo realista */}
      <div style={label}>DestelloCard — cards destacadas (plan activo / racha)</div>

      <DestelloCard glowColor="var(--magenta-glow)" glowPosition="top-right">
        <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', color: 'var(--lime)', textTransform: 'uppercase' }}>Plan activo</div>
        <h3 style={{ fontFamily: 'Archivo Black, Archivo', fontSize: 22, margin: '6px 0 4px', textTransform: 'uppercase' }}>Glúteo & Fuerza</h3>
        <p style={{ fontSize: 13, color: 'var(--txt-dim)', marginBottom: 14 }}>Semana 1 · 4 días · hecho por Brenda para ti</p>
        <div style={{ display: 'flex', gap: 18, marginBottom: 16 }}>
          <div><div style={{ fontFamily: 'Archivo', fontWeight: 900, fontSize: 20, color: 'var(--magenta-soft)' }}>4</div><div style={{ fontSize: 11, color: 'var(--txt-dim)' }}>días/sem</div></div>
          <div><div style={{ fontFamily: 'Archivo', fontWeight: 900, fontSize: 20, color: 'var(--lime)' }}>28</div><div style={{ fontSize: 11, color: 'var(--txt-dim)' }}>ejercicios</div></div>
          <div><div style={{ fontFamily: 'Archivo', fontWeight: 900, fontSize: 20 }}>🔒 22</div><div style={{ fontSize: 11, color: 'var(--txt-dim)' }}>días p/ renovar</div></div>
        </div>
        <Button3D fullWidth onClick={() => {}}>Ver mi rutina</Button3D>
      </DestelloCard>

      <div style={{ height: 14 }} />

      <DestelloCard glowColor="rgba(198,255,0,.35)" glowPosition="bottom-left">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 40 }}>🔥</div>
          <div>
            <div style={{ fontFamily: 'Archivo Black, Archivo', fontSize: 28, color: 'var(--lime)' }}>12 días</div>
            <div style={{ fontSize: 13, color: 'var(--txt-dim)' }}>de racha despertando activa. ¡No la rompas!</div>
          </div>
        </div>
      </DestelloCard>
      <p style={desc}>Glass oscuro con resplandor radial en la esquina (color y posición configurables). Ejemplos: plan activo y racha.</p>
    </div>
  )
}
