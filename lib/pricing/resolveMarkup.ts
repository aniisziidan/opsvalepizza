export type RuleScope = 'GLOBAL' | 'COUNTRY' | 'PRODUCT';
export interface MarkupRule { scope: RuleScope; countryId: string | null; boxConfigId: string | null; markupMin: number; markupMax: number; active: boolean; }
export interface ResolvedMarkup { markupMin: number; markupMax: number; source: RuleScope; }
const MIN = 0.15, MAX = 0.45;
const clamp = (v: number) => Math.min(MAX, Math.max(MIN, v));
export function resolveMarkup(rules: MarkupRule[], ctx: { countryId: string; boxConfigId: string }): ResolvedMarkup {
  const active = rules.filter((r) => r.active);
  const product = active.find((r) => r.scope === 'PRODUCT' && r.countryId === ctx.countryId && r.boxConfigId === ctx.boxConfigId);
  const country = active.find((r) => r.scope === 'COUNTRY' && r.countryId === ctx.countryId);
  const global = active.find((r) => r.scope === 'GLOBAL');
  const chosen = product ?? country ?? global;
  if (!chosen) throw new Error('No applicable pricing rule (missing GLOBAL default)');
  return { markupMin: clamp(chosen.markupMin), markupMax: clamp(chosen.markupMax), source: chosen.scope };
}
