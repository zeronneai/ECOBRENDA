import { useApp } from '../store'

export default function Toast() {
  const { toastMsg } = useApp()
  return (
    <div className={'toast' + (toastMsg ? ' show' : '')} id="toast">
      <span>{toastMsg}</span>
    </div>
  )
}
