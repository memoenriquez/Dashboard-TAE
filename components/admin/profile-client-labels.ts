interface ClientLabelRecord {
  id: string
  externalClientId: number | null
  displayName: string
}

export const getClientLabel = (
  clients: ClientLabelRecord[],
  clientId: string | null
) => {
  if (!clientId) {
    return "Sin cliente"
  }

  const client = clients.find((candidate) => candidate.id === clientId)
  return client ? getClientLabelText(client) : formatClientIdFallback(clientId)
}

export const getClientLabelText = (client: ClientLabelRecord) =>
  `${client.displayName} · ${client.externalClientId ?? "Sin cuentaID"}`

export const formatClientIdFallback = (clientId: string) =>
  `Cliente no encontrado · ${formatShortId(clientId)}`

export const formatShortId = (id: string) => `${id.slice(0, 8)}...`
