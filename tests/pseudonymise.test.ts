import { describe, expect, it } from "vitest";
import { createPseudonymiser } from "@/lib/ai";

describe("createPseudonymiser", () => {
  it("removes a child's name from outgoing text and restores it in the reply", () => {
    const p = createPseudonymiser(["Aisha"]);
    const masked = p.mask("Name: Aisha. Make it fun for Aisha's love of space.");
    expect(masked).not.toContain("Aisha");
    expect(masked).toBe("Name: CHILD_A. Make it fun for CHILD_A's love of space.");
    expect(p.unmask("Well done, CHILD_A!")).toBe("Well done, Aisha!");
  });

  it("handles several children without mixing them up", () => {
    const p = createPseudonymiser(["Sam", "Samira"]);
    const masked = p.mask("Samira and Sam are siblings.");
    expect(masked).not.toMatch(/Sam/);
    expect(p.unmask(masked)).toBe("Samira and Sam are siblings.");
  });

  it("does not replace the name inside other words or in lowercase", () => {
    const p = createPseudonymiser(["Rose"]);
    expect(p.mask("Rose planted a rose. Roses are red.")).toBe(
      "CHILD_A planted a rose. Roses are red.",
    );
  });

  it("works with non-English names", () => {
    const p = createPseudonymiser(["Zoë", "Muhammad Ali"]);
    const masked = p.mask("Zoë and Muhammad Ali read together.");
    expect(masked).not.toMatch(/Zoë|Muhammad/);
    expect(p.unmask(masked)).toBe("Zoë and Muhammad Ali read together.");
  });

  it("ignores empty and one-letter names", () => {
    const p = createPseudonymiser([null, undefined, "", "A"]);
    expect(p.mask("A cat sat.")).toBe("A cat sat.");
  });
});
