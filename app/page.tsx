import {
  ArrowRightIcon,
  DatabaseIcon,
  LayersIcon,
  LockKeyholeIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Home() {
  const readinessItems = [
    {
      label: "Inicio",
      value: "Con tu cuenta",
    },
    {
      label: "Transacciones",
      value: "Consulta y filtros",
    },
    {
      label: "Clientes",
      value: "Los asignados a tu cuenta",
    },
    {
      label: "Reportes",
      value: "Detalle y CSV",
    },
  ];

  return (
    <main className="min-h-dvh overflow-hidden bg-background">
      <section className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col justify-center gap-10 px-6 py-12 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <LayersIcon data-icon="inline-start" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight">
                  Dashboard TAE
                </span>
                <span className="text-xs text-muted-foreground">
                  Recargas Telcel en un solo lugar
                </span>
              </div>
            </div>

            <div className="flex max-w-3xl flex-col gap-5">
              <Badge variant="outline" className="w-fit border-primary/20 bg-card">
                Panel de transacciones
              </Badge>
              <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
                Consulta tus recargas Telcel con claridad y control.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-muted-foreground text-pretty">
                Revisa transacciones, filtra por fecha y teléfono, abre el
                detalle y exporta reportes cuando lo necesites.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button nativeButton={false} size="lg" render={<a href="/dashboard" />}>
                Ir al dashboard
                <ArrowRightIcon data-icon="inline-end" />
              </Button>
              <Button
                nativeButton={false}
                size="lg"
                variant="outline"
                render={<a href="/login" />}
              >
                Iniciar sesión
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-8 right-8 size-24 rounded-full bg-brand-accent/15 blur-2xl" />
            <div className="absolute -bottom-8 left-6 size-32 rounded-full bg-primary/12 blur-3xl" />
            <Card className="relative overflow-hidden border-primary/10 bg-card/95 shadow-xl shadow-primary/5">
              <CardHeader className="border-b bg-muted/30">
                <CardTitle>Todo en un solo panel</CardTitle>
                <CardDescription>
                  Consulta transacciones, revisa detalles, exporta CSV y
                  configura usuarios.
                </CardDescription>
                <CardAction>
                  <ShieldCheckIcon data-icon="inline-start" />
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-5 p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  {readinessItems.map((item) => (
                    <div
                      className="rounded-xl border bg-background px-3 py-3"
                      key={item.label}
                    >
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        {item.label}
                      </p>
                      <p className="mt-1 text-sm font-medium">{item.value}</p>
                    </div>
                  ))}
                </div>

                <div className="grid gap-3 rounded-xl border bg-muted/30 p-4 sm:grid-cols-[auto_1fr]">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-brand-accent/15 text-brand-accent-foreground">
                    <DatabaseIcon data-icon="inline-start" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="font-medium">Información lista para revisar</p>
                    <p className="text-sm text-muted-foreground">
                      Encuentra el historial de recargas, consulta cada detalle y
                      descarga reportes sin salir del dashboard.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LockKeyholeIcon data-icon="inline-start" />
                  Resultados claros para tomar decisiones más rápido.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </main>
  );
}
