import { describe, expect, it } from "vitest";
import { parsePartyCommand } from "./commandParser";

const names = ["Elias", "Lira", "Rook", "Kael"];

describe("parsePartyCommand", () => {
  it("understands named natural tactics", () => expect(parsePartyCommand("Elias, cover me", names)).toMatchObject({ targetName: "Elias", action: "guard" }));
  it("understands party-wide regrouping", () => expect(parsePartyCommand("Everyone regroup and stay with me", names)).toMatchObject({ everyone: true, action: "follow" }));
  it("distinguishes abilities from conversation", () => {
    expect(parsePartyCommand("Lira use your special ability", names).action).toBe("ability");
    expect(parsePartyCommand("Someone heal the party", names).action).toBe("ability");
    expect(parsePartyCommand("Rook, how are you?", names).action).toBe("chat");
  });
});
