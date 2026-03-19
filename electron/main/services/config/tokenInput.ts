export function normalizeAccessTokenInput(rawInput: string): string {
  const trimmedValue = rawInput.trim();

  if (!trimmedValue) {
    return "";
  }

  return trimmedValue.split("/").filter(Boolean).at(-1) ?? "";
}
