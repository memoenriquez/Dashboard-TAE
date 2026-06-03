"use client"

import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { getSelectedClientFilterLabel } from "./client-filter-labels"
import type { DashboardClientOption } from "./types"

export interface TransactionFilterState {
  from: string
  to: string
  status: string
  phoneNumber: string
  reference: string
  externalClientId: string
}

interface FilterBarProps {
  availableClients: DashboardClientOption[]
  filters: TransactionFilterState
  onFiltersChange: (filters: TransactionFilterState) => void
  onApply: () => void
}

export function FilterBar({
  availableClients,
  filters,
  onFiltersChange,
  onApply,
}: FilterBarProps) {
  const shouldShowClientFilter = availableClients.length > 1

  const handleChange = (key: keyof TransactionFilterState, value: string) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  return (
    <form
      className="rounded-2xl border bg-card shadow-sm"
      onSubmit={(event) => {
        event.preventDefault()
        onApply()
      }}
    >
      <div className="flex flex-col gap-4 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Filtros de consulta</p>
            <p className="text-xs text-muted-foreground">
              Actualizan el resumen, la tabla, el detalle y la exportación.
            </p>
          </div>
        </div>

        <FieldGroup className="grid gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(140px,1fr)_minmax(140px,1fr)_minmax(150px,1fr)_minmax(180px,1.2fr)_minmax(180px,1.2fr)_minmax(180px,1.2fr)_auto]">
          <Field>
          <FieldLabel htmlFor="from">Desde</FieldLabel>
          <Input
            id="from"
            type="date"
            className="bg-background"
            value={filters.from}
            onChange={(event) => handleChange("from", event.target.value)}
          />
          </Field>
          <Field>
          <FieldLabel htmlFor="to">Hasta</FieldLabel>
          <Input
            id="to"
            type="date"
            className="bg-background"
            value={filters.to}
            onChange={(event) => handleChange("to", event.target.value)}
          />
          </Field>
          <Field>
          <FieldLabel htmlFor="status">Estado</FieldLabel>
          <Select
            value={filters.status}
            onValueChange={(value) => {
              if (value) {
                handleChange("status", value)
              }
            }}
          >
            <SelectTrigger className="w-full bg-background" id="status">
              <SelectValue placeholder="Selecciona estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="successful">Exitosas</SelectItem>
              <SelectItem value="failed">Fallidas</SelectItem>
            </SelectContent>
          </Select>
          </Field>
          <Field>
          <FieldLabel htmlFor="phoneNumber">Teléfono</FieldLabel>
          <Input
            id="phoneNumber"
            inputMode="tel"
            className="bg-background"
            value={filters.phoneNumber}
            onChange={(event) => handleChange("phoneNumber", event.target.value)}
          />
          </Field>
          <Field>
          <FieldLabel htmlFor="reference">Referencia</FieldLabel>
          <Input
            id="reference"
            className="bg-background"
            value={filters.reference}
            onChange={(event) => handleChange("reference", event.target.value)}
          />
          </Field>
          {shouldShowClientFilter ? (
            <Field>
            <FieldLabel htmlFor="externalClientId">Cliente</FieldLabel>
            <Select
              value={filters.externalClientId}
              onValueChange={(value) => {
                if (value) {
                  handleChange("externalClientId", value)
                }
              }}
            >
              <SelectTrigger className="w-full bg-background" id="externalClientId">
                <SelectValue placeholder="Selecciona cliente">
                  {getSelectedClientFilterLabel(
                    availableClients,
                    filters.externalClientId
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {availableClients.map((client) => (
                  <SelectItem
                    key={client.externalClientId}
                    value={String(client.externalClientId)}
                  >
                    {client.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </Field>
          ) : null}
          <Field className="justify-end">
          <FieldLabel className="sr-only">Aplicar filtros</FieldLabel>
          <Button type="submit" className="w-full xl:w-auto">
            Consultar
          </Button>
          </Field>
        </FieldGroup>
      </div>
    </form>
  )
}
