import {
  ArrowRightIcon,
  RadioTowerIcon,
} from "lucide-react";
import Image from "next/image";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  buildRootAuthCodeRedirectPath,
  type RootAuthCodeSearchParams,
} from "@/features/auth/root-code-redirect";

interface HomePageProps {
  searchParams?: Promise<RootAuthCodeSearchParams>;
}

export default async function Home({ searchParams }: HomePageProps) {
  const authRedirectPath = buildRootAuthCodeRedirectPath(
    (await searchParams) ?? {}
  );

  if (authRedirectPath) {
    redirect(authRedirectPath);
  }

  return (
    <main className="min-h-dvh overflow-hidden bg-background">
      <section className="mx-auto flex min-h-dvh w-full max-w-7xl flex-col justify-center gap-10 px-6 py-12 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="flex flex-col gap-8">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <RadioTowerIcon data-icon="inline-start" />
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
            <div className="relative flex min-h-[360px] items-center justify-center rounded-3xl border border-primary/10 bg-card/80 p-10 shadow-xl shadow-primary/5 backdrop-blur">
              <Image
                alt="Logo Dashboard TAE"
                className="h-auto w-full max-w-sm object-contain"
                height={180}
                priority
                src="/logo/logo.png"
                width={420}
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
