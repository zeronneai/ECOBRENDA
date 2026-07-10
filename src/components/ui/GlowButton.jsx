/* GlowButton — estados especiales / urgencia / alarma.
   Fondo oscuro con borde y glow de color. variant: 'magenta' (default) | 'lima'.
   Estética en .glowbtn (app.css). */
export default function GlowButton({ children, onClick, variant = 'magenta', disabled = false, fullWidth = false, type = 'button' }) {
  return (
    <button
      type={type}
      className={'glowbtn' + (variant === 'lima' ? ' glowbtn--lima' : '') + (fullWidth ? ' full' : '')}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
