import { createNanoEvents } from 'nanoevents'
import EventIterator from 'event-iterator'

const events = createNanoEvents()

const subscribeToNanoEvent = <TValue>(event: string) =>
  new EventIterator<TValue>(({ push }) => {
    const unsub = events.on(event, push)

    return () => unsub()
  })

export const createSubscription = <TValue = unknown>({
  topic,
  resolve = (value) => value,
  getInitialValue,
}: {
  topic: string
  resolve?: (value: TValue) => any
  getInitialValue?: () => TValue
}) => {
  const emitter = (value: TValue) => events.emit(topic, value)

  const resolver = async function* () {
    if (getInitialValue) {
      yield resolve(getInitialValue())
    }

    for await (const value of subscribeToNanoEvent<TValue>(topic)) {
      yield resolve(value)
    }
  }

  return [emitter, resolver] as const
}
