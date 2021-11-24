import { createSubscription, STOP } from '../src'

describe('createSubscription', () => {
  it('should emit and receive values', async () => {
    const [emit, resolver] = createSubscription<
      string,
      { subscribeValue: string }
    >({
      topic: 'test',
      resolve: (value) => ({ subscribeValue: value }),
      getInitialValue: () => 'initial',
    })

    const iterator = resolver()

    await expect(iterator.next()).resolves.toEqual(
      expect.objectContaining({ value: { subscribeValue: 'initial' } }),
    )

    emit('test')
    await expect(iterator.next()).resolves.toEqual(
      expect.objectContaining({ value: { subscribeValue: 'test' } }),
    )
  })

  it('should stop iterator', async () => {
    const [emit, resolver] = createSubscription<string>({
      topic: 'test',
      getInitialValue: () => 'initial',
    })

    const iterator = resolver()

    // skip initial value
    await iterator.next()

    emit(STOP)

    await expect(iterator.next()).resolves.toEqual(
      expect.objectContaining({ done: true }),
    )
  })

  it.todo('should handle multiple subscriptions correctly')
})
