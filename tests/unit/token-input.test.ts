import { describe, expect, it } from "vitest";
import { normalizeAccessTokenInput } from "@electron/main/services/config/tokenInput";

describe("normalizeAccessTokenInput", () => {
  it("returns a raw token unchanged except for surrounding whitespace", () => {
    expect(
      normalizeAccessTokenInput("  52f1465a-4318-475f-87dd-4aa3cdc9f269  "),
    ).toBe("52f1465a-4318-475f-87dd-4aa3cdc9f269");
  });

  it("extracts the token from the last non-empty URL segment", () => {
    expect(
      normalizeAccessTokenInput(
        "http://video2book.test/invite/52f1465a-4318-475f-87dd-4aa3cdc9f269",
      ),
    ).toBe("52f1465a-4318-475f-87dd-4aa3cdc9f269");
    expect(
      normalizeAccessTokenInput(
        "http://video2book.test/invite/52f1465a-4318-475f-87dd-4aa3cdc9f269/",
      ),
    ).toBe("52f1465a-4318-475f-87dd-4aa3cdc9f269");
  });
});
