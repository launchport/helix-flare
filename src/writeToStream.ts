type Payload =
  | {
      id?: string
      data?: string
      event?: string
    }
  | string

export const writeToStream = async (
  writer: WritableStreamWriter,
  payload: Payload,
) => {
  const encoder = new TextEncoder()

  if (typeof payload === 'string') {
    await writer.write(encoder.encode(payload))
  } else {
    const { event, id, data } = payload

    if (event) {
      await writer.write(encoder.encode('event: ' + event + '\n'))
    }
    if (id) {
      await writer.write(encoder.encode('id: ' + id + '\n'))
    }
    if (data) {
      await writer.write(encoder.encode('data: ' + data + '\n'))
    }

    await writer.write(encoder.encode('\n'))
  }
}
