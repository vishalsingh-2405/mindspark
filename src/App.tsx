import { BrowserRouter } from 'react-router-dom'
import { AppShell } from './AppShell'

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell />
    </BrowserRouter>
  )
}
