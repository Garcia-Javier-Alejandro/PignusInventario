interface Props {
  title: string
}

export default function UnderConstruction({ title }: Props) {
  return (
    <div className="flow-page">
      <div className="toolbar">
        <span className="toolbar-left">{title}</span>
      </div>

      <div className="under-construction">
        <div className="under-construction__icon" aria-hidden="true">🚧</div>
        <h2 className="under-construction__title">En construcción</h2>
        <p className="under-construction__sub">
          Esta sección del inventario estará disponible próximamente.
        </p>
      </div>
    </div>
  )
}
