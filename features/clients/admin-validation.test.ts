import { describe, expect, it } from "vitest"

import {
  parseAdminClientInput,
  parseAdminGroupInput,
} from "./admin-validation"

describe("parseAdminClientInput", () => {
  it("allows a parent client without an external client id", () => {
    expect(
      parseAdminClientInput({
        displayName: "Corporativo Demo",
        clientKind: "parent",
        externalClientId: null,
      })
    ).toEqual({
      displayName: "Corporativo Demo",
      clientKind: "parent",
      externalClientId: null,
      isActive: undefined,
    })
  })

  it("requires an external client id for child and standalone clients", () => {
    expect(() =>
      parseAdminClientInput({
        displayName: "Sucursal Demo",
        clientKind: "child",
        externalClientId: null,
      })
    ).toThrow("El ID de cliente es obligatorio para clientes Asociados e Independientes.")
  })

  it("normalizes editable client fields", () => {
    expect(
      parseAdminClientInput({
        displayName: "  Sucursal Centro  ",
        clientKind: "child",
        externalClientId: "1200",
        isActive: false,
      })
    ).toEqual({
      displayName: "Sucursal Centro",
      clientKind: "child",
      externalClientId: 1200,
      isActive: false,
    })
  })
})

describe("parseAdminGroupInput", () => {
  it("requires at least one associated child client", () => {
    expect(() =>
      parseAdminGroupInput({
        parentClientId: "parent-client",
        displayName: "Grupo Demo",
        childClientIds: [],
      })
    ).toThrow("Group requires at least one associated child client")
  })

  it("normalizes valid group fields", () => {
    expect(
      parseAdminGroupInput({
        parentClientId: " parent-client ",
        displayName: " Grupo Demo ",
        childClientIds: ["child-1", "child-2"],
      })
    ).toEqual({
      parentClientId: "parent-client",
      displayName: "Grupo Demo",
      childClientIds: ["child-1", "child-2"],
    })
  })
})
