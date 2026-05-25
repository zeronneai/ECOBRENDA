/* Bottom sheet reutilizable: barra de agarre + contenido.
   El backdrop y el slide-up los maneja el contenedor (SheetHost + CSS). */
export default function Sheet({ children }) {
  return (
    <div className="sheet">
      <div className="grab" />
      {children}
    </div>
  )
}
