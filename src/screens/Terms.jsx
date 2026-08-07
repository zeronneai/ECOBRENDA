import termsMd from '../legal/terms-and-conditions.md?raw'
import LegalPage from './LegalPage'
import { translate, getInitialLang } from '../i18n'

export default function Terms() {
  return <LegalPage title={translate(getInitialLang(), 'legal.terms_title')} markdown={termsMd} />
}
