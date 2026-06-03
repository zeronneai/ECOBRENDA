import privacyMd from '../legal/privacy-policy.md?raw'
import LegalPage from './LegalPage'

export default function Privacy() {
  return <LegalPage title="Política de Privacidad" markdown={privacyMd} />
}
