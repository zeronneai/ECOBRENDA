import privacyMd from '../legal/privacy-policy.md?raw'
import LegalPage from './LegalPage'
import { translate, getInitialLang } from '../i18n'

export default function Privacy() {
  return <LegalPage title={translate(getInitialLang(), 'legal.privacy_title')} markdown={privacyMd} />
}
