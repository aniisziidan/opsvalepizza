'use client';

import React, { useMemo, useState, useTransition } from 'react';
import type { CountryOption, BoxConfigOption, LandedCalcRow } from '@/lib/admin/queries';
import {
  STAGES,
  STAGE_LABELS,
  computeLandedCalc,
  type CalcLine,
  type Stage,
} from '@/lib/pricing/landedCostCalc';
import {
  createLandedCalc,
  updateLandedCalc,
  toggleLandedCalcActive,
} from '@/app/admin/landed-cost/actions';

interface Props {
  calcs: LandedCalcRow[];
  countries: CountryOption[];
  boxConfigs: BoxConfigOption[];
}

interface DraftLine {
  label: string;
  stage: Stage;
  minEur: string;
  maxEur: string;
}

const eur2 = (n: number) => `€${n.toFixed(2)}`;
const eur4 = (n: number) => `€${n.toFixed(4)}`;
const rangeStr = (min: number, max: number, fmt: (n: number) => string) =>
  min === max ? fmt(min) : `${fmt(min)}–${fmt(max)}`;

const emptyLine = (): DraftLine => ({ label: '', stage: 'ORIGIN', minEur: '0', maxEur: '0' });

function toCalcLines(draft: DraftLine[]): CalcLine[] {
  return draft.map((d) => ({
    label: d.label.trim(),
    stage: d.stage,
    minEur: Number(d.minEur) || 0,
    maxEur: Number(d.maxEur) || 0,
  }));
}

export const LandedCostCalculator: React.FC<Props> = ({ calcs, countries, boxConfigs }) => {
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [countryId, setCountryId] = useState(countries[0]?.id || '');
  const [boxConfigId, setBoxConfigId] = useState(boxConfigs[0]?.id || '');
  const [shipmentQty, setShipmentQty] = useState('100000');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine()]);

  const preview = useMemo(
    () => computeLandedCalc(toCalcLines(lines), Number(shipmentQty) || 0),
    [lines, shipmentQty]
  );

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setCountryId(countries[0]?.id || '');
    setBoxConfigId(boxConfigs[0]?.id || '');
    setShipmentQty('100000');
    setLines([emptyLine()]);
  };

  const loadForEdit = (row: LandedCalcRow) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setEditingId(row.id);
    setTitle(row.title);
    setCountryId(countries.find((c) => c.code === row.countryCode)?.id || countries[0]?.id || '');
    setBoxConfigId(row.boxConfigId);
    setShipmentQty(String(row.shipmentQty));
    setLines(
      row.lines.length
        ? row.lines.map((l) => ({
            label: l.label,
            stage: l.stage,
            minEur: String(l.minEur),
            maxEur: String(l.maxEur),
          }))
        : [emptyLine()]
    );
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const updateLine = (i: number, patch: Partial<DraftLine>) =>
    setLines((prev) => prev.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  const addLine = () => setLines((prev) => [...prev, emptyLine()]);
  const removeLine = (i: number) =>
    setLines((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    const payload = {
      title,
      countryId,
      boxConfigId,
      shipmentQty: Number(shipmentQty) || 0,
      lines: toCalcLines(lines),
    };
    startTransition(async () => {
      try {
        const res = editingId
          ? await updateLandedCalc({ ...payload, id: editingId })
          : await createLandedCalc(payload);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to save calculation');
          return;
        }
        setSuccessMsg(
          editingId ? 'Calculation saved as a new version.' : 'Calculation saved to the log.'
        );
        resetForm();
      } catch (err) {
        if (err instanceof Error && err.message.includes('server')) {
          window.location.reload();
          return;
        }
        setErrorMsg(err instanceof Error ? err.message : 'Failed to save calculation');
      }
    });
  };

  const handleToggle = (id: string, active: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      try {
        const res = await toggleLandedCalcActive(id, !active);
        if (!res.success) {
          setErrorMsg(res.error || 'Failed to change status');
          return;
        }
        setSuccessMsg(`Calculation ${!active ? 'restored' : 'archived'}.`);
      } catch (err) {
        setErrorMsg(err instanceof Error ? err.message : 'Failed to change status');
      }
    });
  };

  return (
    <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 md:py-10 space-y-6 bg-[#f8f9ff]">
      {/* Header */}
      <div className="border-b border-[#c5c6ce] pb-6">
        <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
          Sourcing &amp; Import Costing
        </span>
        <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
          Landed-Cost Calculator
        </h1>
        <p className="font-body text-sm text-[#44474d]">
          Itemize a shipment&apos;s expenses to derive the per-box landed cost, and save each
          calculation to the log.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 bg-[#ffdad6] border border-[#ba1a1a] text-[#93000a] rounded-lg font-mono-data text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span>
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-400 text-emerald-800 rounded-lg font-mono-data text-xs flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">check_circle</span>
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Builder */}
        <form
          onSubmit={handleSave}
          className="lg:col-span-2 bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm space-y-5 font-mono-data text-xs"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-headline text-lg font-bold text-[#041632]">
              {editingId ? 'Edit Calculation (saves as new version)' : 'New Calculation'}
            </h2>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="text-[#041632] hover:text-[#e77114] underline"
              >
                Cancel edit
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-gray-700 mb-1 font-semibold">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Alexandria → Milan container (Q3)"
                className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
              />
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">Destination Country</label>
              <select
                value={countryId}
                onChange={(e) => setCountryId(e.target.value)}
                className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg bg-white focus:ring-2 focus:ring-[#041632]"
              >
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">Box Configuration</label>
              <select
                value={boxConfigId}
                onChange={(e) => setBoxConfigId(e.target.value)}
                className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg bg-white focus:ring-2 focus:ring-[#041632]"
              >
                {boxConfigs.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.sizeLabel} · {b.material} · {b.print}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-gray-700 mb-1 font-semibold">Boxes per Shipment</label>
              <input
                type="number"
                min="1"
                step="1"
                value={shipmentQty}
                onChange={(e) => setShipmentQty(e.target.value)}
                className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
              />
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-gray-700 font-semibold">Expense Lines</label>
              <button
                type="button"
                onClick={addLine}
                className="text-[#041632] hover:text-[#e77114] flex items-center gap-1 font-semibold"
              >
                <span className="material-symbols-outlined text-sm">add_circle</span> Add line
              </button>
            </div>
            <div className="space-y-2">
              {lines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    type="text"
                    value={l.label}
                    placeholder="e.g. Ocean freight"
                    onChange={(e) => updateLine(i, { label: e.target.value })}
                    className="col-span-5 h-9 px-2 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
                  />
                  <select
                    value={l.stage}
                    onChange={(e) => updateLine(i, { stage: e.target.value as Stage })}
                    className="col-span-3 h-9 px-2 border border-[#c5c6ce] rounded-lg bg-white focus:ring-2 focus:ring-[#041632]"
                  >
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABELS[s]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={l.minEur}
                    onChange={(e) => updateLine(i, { minEur: e.target.value })}
                    className="col-span-1 h-9 px-2 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
                    title="Min €"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={l.maxEur}
                    onChange={(e) => updateLine(i, { maxEur: e.target.value })}
                    className="col-span-2 h-9 px-2 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
                    title="Max €"
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="col-span-1 text-gray-400 hover:text-[#ba1a1a] flex justify-center"
                    title="Remove line"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-[#c5c6ce]">
            <button
              type="submit"
              disabled={isPending}
              className="bg-[#041632] hover:bg-[#1b2b48] text-white px-5 py-2 rounded-lg font-semibold cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isPending ? (
                <>
                  <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Saving...
                </>
              ) : editingId ? (
                'Save New Version'
              ) : (
                'Save Calculation'
              )}
            </button>
          </div>
        </form>

        {/* Live totals */}
        <div className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm space-y-3 font-mono-data text-xs h-fit sticky top-6">
          <h2 className="font-headline text-lg font-bold text-[#041632]">Live Landed Cost</h2>
          {STAGES.map((s) => {
            const sub = preview.stageSubtotals[s];
            return (
              <div key={s} className="flex justify-between">
                <span className="text-[#75777e]">{STAGE_LABELS[s]}</span>
                <span className="font-bold text-[#041632]">{rangeStr(sub.min, sub.max, eur2)}</span>
              </div>
            );
          })}
          <div className="flex justify-between pt-2 border-t border-[#c5c6ce]/60">
            <span className="text-[#75777e]">Shipment total</span>
            <span className="font-bold text-[#e77114]">
              {rangeStr(preview.shipmentMin, preview.shipmentMax, eur2)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#75777e]">Landed cost / box</span>
            <span className="font-bold text-[#e77114]">
              {rangeStr(preview.perBoxMin, preview.perBoxMax, eur4)}
            </span>
          </div>
        </div>
      </div>

      {/* Log */}
      <div className="bg-white border border-[#c5c6ce] rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-[#c5c6ce]">
          <h2 className="font-headline text-lg font-bold text-[#041632]">Landed-Cost Log</h2>
        </div>
        {calcs.length === 0 ? (
          <div className="p-12 text-center text-[#75777e] font-mono-data text-sm">
            No saved calculations yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-mono-data text-xs">
              <thead className="bg-[#f8f9ff] text-[#75777e] uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="text-left px-6 py-3">Title</th>
                  <th className="text-left px-4 py-3">Country</th>
                  <th className="text-left px-4 py-3">Box</th>
                  <th className="text-right px-4 py-3">€/box</th>
                  <th className="text-left px-4 py-3">Updated</th>
                  <th className="text-right px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {calcs.map((c) => (
                  <tr key={c.id} className="border-t border-[#c5c6ce]/50 hover:bg-[#f8f9ff]">
                    <td className="px-6 py-3 font-bold text-[#041632]">{c.title}</td>
                    <td className="px-4 py-3">
                      {c.countryName} ({c.countryCode})
                    </td>
                    <td className="px-4 py-3">{c.boxLabel}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#e77114]">
                      {rangeStr(Number(c.perBoxMinEur), Number(c.perBoxMaxEur), eur4)}
                    </td>
                    <td className="px-4 py-3 text-[#75777e]">
                      {new Date(c.effectiveFrom).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-right space-x-3">
                      <button
                        onClick={() => loadForEdit(c)}
                        className="text-[#041632] hover:text-[#e77114] font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggle(c.id, c.active)}
                        disabled={isPending}
                        className="text-[#041632] hover:text-[#ba1a1a] font-semibold"
                      >
                        Archive
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
