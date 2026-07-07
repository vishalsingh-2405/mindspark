export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="screen" style={{ textAlign: 'center', marginTop: '20vh' }}>
      <h1 className="app-title">{title}</h1>
      <p style={{ color: 'var(--muted)' }}>Coming soon</p>
    </div>
  )
}
