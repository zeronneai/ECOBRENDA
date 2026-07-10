/* DestelloCard — cards destacadas (plan activo, racha, logros).
   Glass oscuro con un resplandor radial posicionable en una esquina.
   Props:
     - glowColor: color del resplandor (default var(--magenta-glow))
     - glowPosition: 'top-right' (default) | 'top-left' | 'bottom-right' | 'bottom-left'
     - className: clases extra opcionales
   Estética en .destello-card (app.css). */
export default function DestelloCard({ children, glowColor, glowPosition = 'top-right', className = '' }) {
  const style = glowColor ? { '--dc-glow': glowColor } : undefined
  return (
    <div className={`destello-card dc-${glowPosition} ${className}`.trim()} style={style}>
      {children}
    </div>
  )
}
