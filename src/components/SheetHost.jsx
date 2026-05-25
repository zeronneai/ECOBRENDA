import { useApp } from '../store'
import Paywall from './Paywall'
import AlarmSheet from './AlarmSheet'
import MealsSheet from './MealsSheet'
import CameraScan from '../screens/CameraScan'

export default function SheetHost() {
  const { sheet, closeSheet } = useApp()
  if (!sheet) return null
  return (
    <div className="sheet-wrap open" id="sheetWrap">
      <div className="sheet-bg" onClick={closeSheet} />
      {sheet === 'paywall' && <Paywall />}
      {sheet === 'alarmSheet' && <AlarmSheet />}
      {sheet === 'mealsSheet' && <MealsSheet />}
      {sheet === 'cameraSheet' && <CameraScan />}
    </div>
  )
}
