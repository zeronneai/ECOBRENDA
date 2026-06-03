import termsMd from '../legal/terms-and-conditions.md?raw'
import LegalPage from './LegalPage'

export default function Terms() {
  return <LegalPage title="Términos y Condiciones" markdown={termsMd} />
}
