import { describe, expect, it } from "vitest";
import { getPrompt, listPromptRegistry } from "@/lib/prompts/registry";

describe("prompt registry", () => {
  it("lists registered prompts without duplicate keys", () => {
    const prompts = listPromptRegistry();
    expect(prompts.length).toBeGreaterThanOrEqual(4);
    expect(new Set(prompts.map((prompt) => prompt.key)).size).toBe(prompts.length);
  });

  it("interpolates variables", () => {
    const rendered = getPrompt("dashboard.agent-brief", { roleName: "CEO" });
    expect(rendered).toContain("CEO");
  });

  it("throws on missing variables and unknown keys", () => {
    expect(() => getPrompt("dashboard.agent-brief")).toThrow(/missing_prompt_variable/);
    expect(() => getPrompt("missing.prompt")).toThrow(/unknown_prompt_key/);
  });
});
