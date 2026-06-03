interface ClientFilterOption {
  externalClientId: number
  displayName: string
}

export const getSelectedClientFilterLabel = (
  availableClients: ClientFilterOption[],
  externalClientId: string
) => {
  if (externalClientId === "all") {
    return "Todos"
  }

  const selectedClient = availableClients.find(
    (client) => String(client.externalClientId) === externalClientId
  )

  return selectedClient?.displayName ?? externalClientId
}
