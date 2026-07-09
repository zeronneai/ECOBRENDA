/* GlassButton — acción secundaria / DONE / tabs flotantes.
   Liquid glass (glassmorphism CSS). variant: 'magenta' (default) | 'lima'.
   Estética en .glassbtn (app.css), con fallback sólido para Android gama baja. */
export default function GlassButton({ children, onClick, variant = 'magenta', disabled = false, fullWidth = false, type = 'button' }) {
  return (
    <button
      type={type}
      className={'glassbtn' + (variant === 'lima' ? ' glassbtn--lima' : '') + (fullWidth ? ' full' : '')}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
