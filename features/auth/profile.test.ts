import { describe, expect, it } from "vitest"

import {
  resolveCurrentDashboardUiAccess,
  resolveCurrentProfile,
  type ProfileRepository,
} from "./profile"
import type { Client, Profile } from "@/features/clients/types"

const baseTimestamp = "2026-01-01T00:00:00.000Z"

const activeClient: Client = {
  id: "client-1",
  externalClientId: 100,
  displayName: "Cliente Padre",
  clientKind: "parent",
  isActive: true,
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
}

const createProfile = (overrides: Partial<Profile>): Profile => ({
  id: "user-1",
  clientId: null,
  isInternalAdmin: false,
  displayName: "Usuario Demo",
  lastSeenAt: null,
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
  ...overrides,
})

describe("resolveCurrentProfile", () => {
  it("returns an internal admin profile without requiring a client", async () => {
    const repository: ProfileRepository = {
      getProfileByUserId: async () => createProfile({ isInternalAdmin: true }),
      getClientById: async () => {
        throw new Error("admin profile should not require a client")
      },
    }

    await expect(
      resolveCurrentProfile({ userId: "user-1", repository })
    ).resolves.toEqual({
      profile: createProfile({ isInternalAdmin: true }),
      client: null,
    })
  })

  it("returns a non-admin profile with its active linked client", async () => {
    const repository: ProfileRepository = {
      getProfileByUserId: async () => createProfile({ clientId: activeClient.id }),
      getClientById: async () => activeClient,
    }

    await expect(
      resolveCurrentProfile({ userId: "user-1", repository })
    ).resolves.toEqual({
      profile: createProfile({ clientId: activeClient.id }),
      client: activeClient,
    })
  })

  it("rejects an authenticated user without a dashboard profile as expected access denial", async () => {
    const repository: ProfileRepository = {
      getProfileByUserId: async () => null,
      getClientById: async () => {
        throw new Error("missing profile should not require a client")
      },
    }

    await expect(
      resolveCurrentProfile({ userId: "user-1", repository })
    ).rejects.toMatchObject({
      name: "DashboardAccessDeniedError",
      message: "Forbidden",
    })
  })

  it("rejects a non-admin profile without a client as expected access denial", async () => {
    const repository: ProfileRepository = {
      getProfileByUserId: async () => createProfile({ clientId: null }),
      getClientById: async () => {
        throw new Error("missing client id should not load a client")
      },
    }

    await expect(
      resolveCurrentProfile({ userId: "user-1", repository })
    ).rejects.toMatchObject({
      name: "DashboardAccessDeniedError",
      message: "Forbidden",
    })
  })

  it("rejects a non-admin profile linked to a missing client as expected access denial", async () => {
    const repository: ProfileRepository = {
      getProfileByUserId: async () => createProfile({ clientId: activeClient.id }),
      getClientById: async () => null,
    }

    await expect(
      resolveCurrentProfile({ userId: "user-1", repository })
    ).rejects.toMatchObject({
      name: "DashboardAccessDeniedError",
      message: "Forbidden",
    })
  })

  it("rejects a non-admin profile linked to an inactive client as expected access denial", async () => {
    const repository: ProfileRepository = {
      getProfileByUserId: async () => createProfile({ clientId: activeClient.id }),
      getClientById: async () => ({ ...activeClient, isActive: false }),
    }

    await expect(
      resolveCurrentProfile({ userId: "user-1", repository })
    ).rejects.toMatchObject({
      name: "DashboardAccessDeniedError",
      message: "Forbidden",
    })
  })
})

describe("resolveCurrentDashboardUiAccess", () => {
  it("allows admin UI only for internal admin profiles", async () => {
    const repository: ProfileRepository = {
      getProfileByUserId: async () => createProfile({ isInternalAdmin: true }),
      getClientById: async () => {
        throw new Error("admin profile should not require a client")
      },
    }

    await expect(
      resolveCurrentDashboardUiAccess({ userId: "user-1", repository })
    ).resolves.toEqual({ isInternalAdmin: true })
  })

  it("hides admin UI for non-admin profiles", async () => {
    const repository: ProfileRepository = {
      getProfileByUserId: async () => createProfile({ clientId: activeClient.id }),
      getClientById: async () => activeClient,
    }

    await expect(
      resolveCurrentDashboardUiAccess({ userId: "user-1", repository })
    ).resolves.toEqual({ isInternalAdmin: false })
  })

  it("rejects access resolution when the authenticated user has no profile", async () => {
    const repository: ProfileRepository = {
      getProfileByUserId: async () => null,
      getClientById: async () => {
        throw new Error("missing profile should not require a client")
      },
    }

    await expect(
      resolveCurrentDashboardUiAccess({ userId: "user-1", repository })
    ).rejects.toMatchObject({
      name: "DashboardAccessDeniedError",
      message: "Forbidden",
    })
  })
})
