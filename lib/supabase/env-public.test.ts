import { readFileSync } from "node:fs"
import { join } from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"

import { getSupabasePublishableKey } from "./env-public"

const rootPath = process.cwd()

const readProjectFile = (path: string) =>
  readFileSync(join(rootPath, path), "utf8")

describe("Supabase environment module boundaries", () => {
  it("keeps browser and session clients on the public env module", () => {
    const publicEnvSource = readProjectFile("lib/supabase/env-public.ts")

    expect(readProjectFile("lib/supabase/client.ts")).toContain(
      'from "./env-public"'
    )
    expect(readProjectFile("lib/supabase/server.ts")).toContain(
      'from "./env-public"'
    )
    expect(readProjectFile("proxy.ts")).toContain(
      'from "@/lib/supabase/env-public"'
    )
    expect(publicEnvSource).not.toContain("SUPABASE_SECRET_KEY")
    expect(publicEnvSource).not.toContain("SUPABASE_SERVICE_ROLE_KEY")
  })

  it("keeps the admin secret behind a server-only env module", () => {
    expect(readProjectFile("lib/supabase/admin.ts")).toContain(
      'from "./env-server"'
    )
    expect(readProjectFile("lib/supabase/admin.ts")).toContain(
      'import "server-only"'
    )
    expect(readProjectFile("lib/supabase/env-server.ts")).toContain(
      'import "server-only"'
    )
  })

  it("limits admin client imports to trusted server API modules", () => {
    const allowedAdminClientImporters = [
      "app/api/_lib/dashboard-context.ts",
      "app/api/admin/invitations/resend/route.ts",
      "app/api/admin/invitations/route.ts",
      "app/api/admin/profiles/route.ts",
    ]
    const projectFiles = [
      "app/api/_lib/dashboard-context.ts",
      "app/api/admin/clients/route.ts",
      "app/api/admin/external-clients/route.ts",
      "app/api/admin/groups/route.ts",
      "app/api/admin/invitations/resend/route.ts",
      "app/api/admin/invitations/route.ts",
      "app/api/admin/profiles/route.ts",
      "app/api/admin/setup/route.ts",
      "app/api/transactions/[ticket]/route.ts",
      "app/api/transactions/export/route.ts",
      "app/api/transactions/route.ts",
      "app/dashboard/admin/layout.tsx",
      "app/dashboard/layout.tsx",
      "components/dashboard/dashboard-nav.tsx",
      "lib/supabase/client.ts",
      "lib/supabase/server.ts",
      "proxy.ts",
    ]

    const filesImportingAdminClient = projectFiles.filter((path) =>
      readProjectFile(path).includes("@/lib/supabase/admin")
    )

    expect(filesImportingAdminClient).toEqual(allowedAdminClientImporters)
  })
})

describe("getSupabasePublishableKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("falls back to the legacy anon key when the publishable key is absent", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined)
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "legacy-anon-key")

    expect(getSupabasePublishableKey()).toBe("legacy-anon-key")
  })
})
