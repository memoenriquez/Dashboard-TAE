import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface SourceErrorProps {
  message: string
  title?: string
}

export function SourceError({
  message,
  title = "No se pudo completar la consulta",
}: SourceErrorProps) {
  return (
    <Alert variant="destructive" className="shadow-sm">
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  )
}
