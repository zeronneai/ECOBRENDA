/* Button3D — acción principal (Generar plan, Empezar, etc.).
   Botón con profundidad 3D: gradiente magenta + sombra sólida "tecla" que se
   hunde al presionar. Estética en .btn3d (app.css). */
export default function Button3D({ children, onClick, disabled = false, fullWidth = false, type = 'button' }) {
  return (
    <button
      type={type}
      className={'btn3d' + (fullWidth ? ' full' : '')}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  )
}
