type ResultCallback = (text: string) => void
type ErrorCallback = (err: Error | string) => void

export function createVoiceRecorder() {
  const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
  if (!SpeechRecognition) {
    return {
      supported: false,
      start: () => Promise.reject(new Error('浏览器不支持 Web Speech API')),
      stop: () => {},
      onResult: (_: ResultCallback) => {},
      onError: (_: ErrorCallback) => {},
    }
  }

  const recog = new SpeechRecognition()
  recog.lang = 'zh-CN'
  recog.interimResults = false
  recog.maxAlternatives = 1

  let resultCb: ResultCallback = () => {}
  let errorCb: ErrorCallback = () => {}

  recog.onresult = (evt: SpeechRecognitionEvent) => {
    const text = Array.from(evt.results)
      .map(r => r[0].transcript)
      .join('')
    resultCb(text)
  }
  recog.onerror = (evt: any) => {
    errorCb(evt.error || evt.message || '语音识别错误')
  }

  return {
    supported: true,
    start: () => new Promise<void>((resolve, reject) => {
      try {
        recog.start()
        resolve()
      } catch (e) {
        reject(e)
      }
    }),
    stop: () => {
      try { recog.stop() } catch (e) {}
    },
    onResult: (cb: ResultCallback) => { resultCb = cb },
    onError: (cb: ErrorCallback) => { errorCb = cb },
  }
}
