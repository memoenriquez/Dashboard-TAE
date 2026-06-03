import { describe, expect, it } from "vitest"

import {
  applyExternalClientFilterToScope,
  listAvailableTransactionClients,
  resolveTransactionScope,
  type ScopeRepository,
} from "./scope"
import type { Client, Profile } from "./types"

const baseTimestamp = "2026-01-01T00:00:00.000Z"

const createClient = (
  overrides: Partial<Client> & Pick<Client, "id" | "clientKind">
): Client => ({
  displayName: `Cliente ${overrides.externalClientId}`,
  isActive: true,
  externalClientId: 100,
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
  ...overrides,
})

const createProfile = (overrides: Partial<Profile>): Profile => ({
  id: "profile-1",
  clientId: null,
  isInternalAdmin: false,
  displayName: "Usuario Demo",
  createdAt: baseTimestamp,
  updatedAt: baseTimestamp,
  ...overrides,
})

describe("resolveTransactionScope", () => {
  it("returns global scope for an internal admin", async () => {
    const repository: ScopeRepository = {
      getClientById: async () => {
        throw new Error("admin scope should not load a client")
      },
      listChildClientsForParent: async () => {
        throw new Error("admin scope should not load child clients")
      },
    }

    await expect(
      resolveTransactionScope({
        profile: createProfile({ isInternalAdmin: true }),
        repository,
      })
    ).resolves.toEqual({ type: "global" })
  })

  it("returns parent and child external client ids for a parent client", async () => {
    const parentClient = createClient({
      id: "parent-client",
      externalClientId: 100,
      clientKind: "parent",
    })
    const repository: ScopeRepository = {
      getClientById: async () => parentClient,
      listChildClientsForParent: async () => [
        createClient({ id: "child-client-1", externalClientId: 201, clientKind: "child" }),
        createClient({ id: "child-client-2", externalClientId: 202, clientKind: "child" }),
        createClient({ id: "inactive-child", externalClientId: 203, clientKind: "child", isActive: false }),
      ],
    }

    await expect(
      resolveTransactionScope({
        profile: createProfile({ clientId: parentClient.id }),
        repository,
      })
    ).resolves.toEqual({
      type: "external_client_ids",
      externalClientIds: [100, 201, 202],
    })
  })

  it("returns only active child external client ids for a parent without an external client id", async () => {
    const parentClient = createClient({
      id: "parent-client",
      externalClientId: null,
      clientKind: "parent",
    })
    const repository: ScopeRepository = {
      getClientById: async () => parentClient,
      listChildClientsForParent: async () => [
        createClient({ id: "child-client-1", externalClientId: 201, clientKind: "child" }),
        createClient({ id: "inactive-child", externalClientId: 203, clientKind: "child", isActive: false }),
      ],
    }

    await expect(
      resolveTransactionScope({
        profile: createProfile({ clientId: parentClient.id }),
        repository,
      })
    ).resolves.toEqual({
      type: "external_client_ids",
      externalClientIds: [201],
    })
  })

  it("returns an empty scoped result for a parent without an external client id or active children", async () => {
    const parentClient = createClient({
      id: "parent-client",
      externalClientId: null,
      clientKind: "parent",
    })
    const repository: ScopeRepository = {
      getClientById: async () => parentClient,
      listChildClientsForParent: async () => [],
    }

    await expect(
      resolveTransactionScope({
        profile: createProfile({ clientId: parentClient.id }),
        repository,
      })
    ).resolves.toEqual({
      type: "external_client_ids",
      externalClientIds: [],
    })
  })

  it("returns only the user's own external client id for child and standalone clients", async () => {
    const childClient = createClient({
      id: "child-client",
      externalClientId: 201,
      clientKind: "child",
    })
    const repository: ScopeRepository = {
      getClientById: async () => childClient,
      listChildClientsForParent: async () => {
        throw new Error("child scope should not load sibling clients")
      },
    }

    await expect(
      resolveTransactionScope({
        profile: createProfile({ clientId: childClient.id }),
        repository,
      })
    ).resolves.toEqual({
      type: "external_client_ids",
      externalClientIds: [201],
    })
  })

  it("rejects a non-parent client without an external client id", async () => {
    const childClient = createClient({
      id: "child-client",
      externalClientId: null,
      clientKind: "child",
    })
    const repository: ScopeRepository = {
      getClientById: async () => childClient,
      listChildClientsForParent: async () => {
        throw new Error("child scope should not load sibling clients")
      },
    }

    await expect(
      resolveTransactionScope({
        profile: createProfile({ clientId: childClient.id }),
        repository,
      })
    ).rejects.toMatchObject({
      name: "DashboardAccessDeniedError",
      message: "Forbidden",
    })
  })

  it("rejects a non-admin profile without a client as expected access denial", async () => {
    const repository: ScopeRepository = {
      getClientById: async () => {
        throw new Error("missing client id should not load a client")
      },
      listChildClientsForParent: async () => {
        throw new Error("missing client id should not load child clients")
      },
    }

    await expect(
      resolveTransactionScope({
        profile: createProfile({ clientId: null }),
        repository,
      })
    ).rejects.toMatchObject({
      name: "DashboardAccessDeniedError",
      message: "Forbidden",
    })
  })

  it("rejects a non-admin profile linked to a missing client as expected access denial", async () => {
    const repository: ScopeRepository = {
      getClientById: async () => null,
      listChildClientsForParent: async () => {
        throw new Error("missing client should not load child clients")
      },
    }

    await expect(
      resolveTransactionScope({
        profile: createProfile({ clientId: "missing-client" }),
        repository,
      })
    ).rejects.toMatchObject({
      name: "DashboardAccessDeniedError",
      message: "Forbidden",
    })
  })

  it("rejects a non-admin profile linked to an inactive client as expected access denial", async () => {
    const inactiveClient = createClient({
      id: "inactive-client",
      externalClientId: 100,
      clientKind: "standalone",
      isActive: false,
    })
    const repository: ScopeRepository = {
      getClientById: async () => inactiveClient,
      listChildClientsForParent: async () => {
        throw new Error("inactive client should not load child clients")
      },
    }

    await expect(
      resolveTransactionScope({
        profile: createProfile({ clientId: inactiveClient.id }),
        repository,
      })
    ).rejects.toMatchObject({
      name: "DashboardAccessDeniedError",
      message: "Forbidden",
    })
  })
})

describe("applyExternalClientFilterToScope", () => {
  it("narrows scoped clients to the requested client when it is allowed", () => {
    expect(
      applyExternalClientFilterToScope(
        { type: "external_client_ids", externalClientIds: [100, 201, 202] },
        201
      )
    ).toEqual({ type: "external_client_ids", externalClientIds: [201] })
  })

  it("rejects requested clients outside the resolved scope", () => {
    expect(() =>
      applyExternalClientFilterToScope(
        { type: "external_client_ids", externalClientIds: [100, 201] },
        999
      )
    ).toThrow("Forbidden")
  })

  it("keeps the original scope when no client filter is requested", () => {
    const scope = { type: "external_client_ids" as const, externalClientIds: [201] }

    expect(applyExternalClientFilterToScope(scope, null)).toBe(scope)
  })
})

describe("listAvailableTransactionClients", () => {
  it("lists active transaction clients for an internal admin without requiring a direct client relation", async () => {
    const repository: ScopeRepository = {
      getClientById: async () => {
        throw new Error("admin available clients should not load a profile client")
      },
      listChildClientsForParent: async () => {
        throw new Error("admin available clients should not load child groups")
      },
      listClients: async () => [
        createClient({ id: "parent-container", externalClientId: null, clientKind: "parent" }),
        createClient({ id: "parent-account", externalClientId: 100, clientKind: "parent" }),
        createClient({ id: "child-client", externalClientId: 201, clientKind: "child" }),
        createClient({
          id: "inactive-child",
          externalClientId: 202,
          clientKind: "child",
          isActive: false,
        }),
      ],
    }

    await expect(
      listAvailableTransactionClients({
        client: null,
        isInternalAdmin: true,
        repository,
      })
    ).resolves.toEqual([
      expect.objectContaining({ externalClientId: 100, displayName: "Cliente 100" }),
      expect.objectContaining({ externalClientId: 201, displayName: "Cliente 201" }),
    ])
  })
})
