import GridDistortion from './GridDistortion.tsx'

export function BeigeGridBackground() {
  return (
    <div className="grid-bg" aria-hidden>
      <GridDistortion
        imageSrc="https://images.unsplash.com/photo-1557682250-33bd709cbe85?w=800"
        grid={15}
        mouse={0.1}
        strength={0.15}
        relaxation={0.9}
      />
      <div className="grid-bg-tint" />
    </div>
  )
}
