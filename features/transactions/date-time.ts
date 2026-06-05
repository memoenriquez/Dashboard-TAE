const externalDateTimePattern =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/

export const formatExternalDateTime = (value: string) => {
  const normalizedValue = value.trim()
  const match = externalDateTimePattern.exec(normalizedValue)

  if (!match) {
    return normalizedValue
  }

  const [, year, month, day, time] = match
  return `${day}/${month}/${year}, ${normalizeTime(time)}`
}

const normalizeTime = (time: string) => {
  if (time.length === 5) {
    return `${time}:00`
  }

  return time
}
