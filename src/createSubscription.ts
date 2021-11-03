import { createNanoEvents } from 'nanoevents'
import EventIterator from 'event-iterator'

const events = createNanoEvents()

export const STOP = Symbol('STOP')

const subscribeToNanoEvent = <TValue>(event: string) =>
  new EventIterator<TValue>(({ push, stop }) => {
    const unsubscribe = events.on(event, (data) => {
      if (data === STOP) {
        stop()
      } else {
        push(data)
      }
    })

    return () => unsubscribe()
  })

export const createSubscription = <TValue = unknown, TResolved = TValue>({
  topic,
  resolve = (value) => value as unknown as TResolved,
  getInitialValue,
}: {
  topic: string
  resolve?: (value: TValue) => Promise<TResolved> | TResolved
  getInitialValue?: () => Promise<TValue> | TValue
}) => {
  const emitter = (value: TValue) => events.emit(topic, value)

  const resolver = async function* () {
    if (getInitialValue) {
      yield await resolve(await getInitialValue())
    }

    for await (const value of subscribeToNanoEvent<TValue>(topic)) {
      yield await resolve(value)
    }
  }

  return [emitter, resolver] as const
}
