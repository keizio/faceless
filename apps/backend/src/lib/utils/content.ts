export function getEffectiveSlideCount(
  templateId: string | null | undefined,
  templateInputs: Record<string, unknown> | null | undefined,
  slideCount?: number,
): number | undefined {
  if (templateId === "listicle") {
    return (templateInputs?.itemCount as number) ?? undefined;
  }
  return slideCount;
}