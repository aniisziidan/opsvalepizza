'use client';

import React, { useState, useTransition } from 'react';
import { LogisticsRow, CountryOption } from '@/lib/admin/queries';
import { formatCurrency } from '@/lib/admin/formatters';
import {
  createLogisticsCorridor,
  updateLogisticsCorridor,
  toggleLogisticsCorridorActive,
} from '@/app/admin/logistics/actions';

interface LogisticsHubsProps {
  corridors: LogisticsRow[];
  countries: CountryOption[];
}

export const LogisticsHubs: React.FC<LogisticsHubsProps> = ({ corridors, countries }) => {
  const [isPending, startTransition] = useTransition();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCorridor, setEditingCorridor] = useState<LogisticsRow | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    countryId: countries[0]?.id || '',
    route: 'Standard Central EU Corridor',
    port: 'Rotterdam Mainport',
    shipMethod: 'Intermodal Freight',
    freightEur: '0.0250',
    inlandEur: '0.0100',
    otherEur: '0.0050',
  });

  const handleOpenAdd = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setFormData({
      countryId: countries[0]?.id || '',
      route: '',
      port: '',
      shipMethod: 'Intermodal Freight',
      freightEur: '0.0250',
      inlandEur: '0.0100',
      otherEur: '0.0000',
    });
    setShowAddModal(true);
  };

  const handleOpenEdit = (c: LogisticsRow) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const country = countries.find((cnt) => cnt.code === c.countryCode);
    setFormData({
      countryId: country?.id || countries[0]?.id || '',
      route: c.route || '',
      port: c.port || '',
      shipMethod: c.shipMethod || '',
      freightEur: c.freightEur || '0.0000',
      inlandEur: c.inlandEur || '0.0000',
      otherEur: c.otherEur || '0.0000',
    });
    setEditingCorridor(c);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await createLogisticsCorridor(formData);
        setShowAddModal(false);
        setSuccessMsg('New logistics corridor successfully established.');
      } catch (err: any) {
        if (
          err?.message?.includes('failed-to-find-server-action') ||
          err?.message?.includes('was not found on the server') ||
          err?.digest?.includes('NEXT_NOT_FOUND')
        ) {
          window.location.reload();
          return;
        }
        setErrorMsg(err.message || 'Failed to create logistics corridor');
      }
    });
  };

  const handleSubmitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCorridor) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await updateLogisticsCorridor(editingCorridor.id, formData);
        setEditingCorridor(null);
        setSuccessMsg('Logistics corridor routing and rates updated.');
      } catch (err: any) {
        if (
          err?.message?.includes('failed-to-find-server-action') ||
          err?.message?.includes('was not found on the server') ||
          err?.digest?.includes('NEXT_NOT_FOUND')
        ) {
          window.location.reload();
          return;
        }
        setErrorMsg(err.message || 'Failed to update logistics corridor');
      }
    });
  };

  const handleToggleActive = (id: string, currentActive: boolean) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      try {
        await toggleLogisticsCorridorActive(id, !currentActive);
        setSuccessMsg(`Corridor status changed to ${!currentActive ? 'Active' : 'Inactive'}.`);
      } catch (err: any) {
        if (
          err?.message?.includes('failed-to-find-server-action') ||
          err?.message?.includes('was not found on the server') ||
          err?.digest?.includes('NEXT_NOT_FOUND')
        ) {
          window.location.reload();
          return;
        }
        setErrorMsg(err.message || 'Failed to toggle corridor status');
      }
    });
  };

  return (
    <div className="p-6 sm:p-8 md:p-10 space-y-6 max-w-[1440px] mx-auto bg-[#f8f9ff]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#c5c6ce] pb-6">
        <div>
          <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
            Pan-European Distribution Network
          </span>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            European Logistics Corridors &amp; Freight Rates
          </h1>
          <p className="font-body text-sm text-[#44474d]">
            Active freight routes, port entry terminals, and inland delivery rates across European territories.
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-[#041632] hover:bg-[#1b2b48] text-white font-mono-data text-xs uppercase tracking-wider py-2.5 px-5 rounded-lg transition-colors flex items-center gap-2 shadow-sm font-semibold cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          Add Logistics Corridor
        </button>
      </div>

      {/* Alerts */}
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

      {/* Corridors Grid */}
      {corridors.length === 0 ? (
        <div className="bg-white border border-[#c5c6ce] rounded-xl p-12 text-center text-[#75777e] font-mono-data text-sm space-y-2">
          <span className="material-symbols-outlined text-4xl text-[#c5c6ce] block">
            local_shipping
          </span>
          <p className="font-bold text-[#041632]">No logistics corridors configured</p>
          <p className="text-xs">
            Add a logistics corridor using the button above to establish freight and terminal routing records.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {corridors.map((c) => (
            <div
              key={c.id}
              className={`bg-white border ${c.active ? 'border-[#c5c6ce]' : 'border-dashed border-gray-300 opacity-75'} rounded-xl p-6 shadow-sm space-y-4 font-mono-data text-xs transition-all`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] bg-[#dce9ff] text-[#041632] px-2 py-0.5 rounded font-bold">
                    {c.countryCode}
                  </span>
                  <h3 className="font-headline text-lg font-bold text-[#041632] mt-2">
                    {c.countryName}
                  </h3>
                  <p className="text-[#75777e]">{c.route || 'Standard Central EU Corridor'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${c.active ? 'bg-emerald-500' : 'bg-gray-400'} shadow-sm`}
                    title={c.active ? 'Active Corridor' : 'Inactive'}
                  ></span>
                  <button
                    onClick={() => handleToggleActive(c.id, c.active)}
                    disabled={isPending}
                    className="text-[10px] px-2 py-0.5 rounded border border-[#c5c6ce] hover:bg-[#eff4ff] text-[#041632] transition-colors cursor-pointer"
                  >
                    {c.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>

              <div className="bg-[#f8f9ff] p-3.5 rounded-lg border border-[#c5c6ce]/60 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#75777e]">Entry Port / Terminal:</span>
                  <span className="font-bold text-[#041632]">{c.port || 'Rotterdam Mainport'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#75777e]">Transit Method:</span>
                  <span className="font-bold text-[#041632]">{c.shipMethod || 'Intermodal Freight'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#75777e]">Ocean/Cross-border Freight:</span>
                  <span className="font-bold text-[#e77114]">{formatCurrency(c.freightEur)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#75777e]">Inland Hub Surcharge:</span>
                  <span className="font-bold text-[#041632]">{formatCurrency(c.inlandEur)}</span>
                </div>
                {c.otherEur && (
                  <div className="flex justify-between">
                    <span className="text-[#75777e]">Ancillary / Port Fees:</span>
                    <span className="font-bold text-[#041632]">{formatCurrency(c.otherEur)}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#c5c6ce]/40">
                <span className={`text-[11px] ${c.active ? 'text-emerald-700' : 'text-gray-500'}`}>
                  {c.active ? 'Operational' : 'Disabled'}
                </span>
                <button
                  onClick={() => handleOpenEdit(c)}
                  className="text-xs text-[#041632] hover:text-[#e77114] flex items-center gap-1 font-semibold cursor-pointer transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">edit</span>
                  Edit Rates
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {(showAddModal || editingCorridor) && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-[#c5c6ce] space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-[#c5c6ce] pb-4">
              <h3 className="font-headline text-lg font-bold text-[#041632]">
                {editingCorridor ? 'Edit Logistics Corridor Rates' : 'Add New Logistics Corridor'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingCorridor(null);
                }}
                className="text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={editingCorridor ? handleSubmitEdit : handleSubmitAdd} className="space-y-4 font-mono-data text-xs">
              <div>
                <label className="block text-gray-700 mb-1 font-semibold">Target Country</label>
                <select
                  value={formData.countryId}
                  onChange={(e) => setFormData({ ...formData, countryId: e.target.value })}
                  disabled={Boolean(editingCorridor)}
                  className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg bg-white focus:ring-2 focus:ring-[#041632]"
                >
                  {countries.map((cnt) => (
                    <option key={cnt.id} value={cnt.id}>
                      {cnt.name} ({cnt.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 mb-1 font-semibold">Corridor Name / Route</label>
                  <input
                    type="text"
                    value={formData.route}
                    placeholder="e.g. Rotterdam -> Ruhr Valley"
                    onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                    className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 font-semibold">Entry Port / Terminal</label>
                  <input
                    type="text"
                    value={formData.port}
                    placeholder="e.g. Antwerp Euroterminal"
                    onChange={(e) => setFormData({ ...formData, port: e.target.value })}
                    className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-700 mb-1 font-semibold">Shipping / Transit Method</label>
                <input
                  type="text"
                  value={formData.shipMethod}
                  placeholder="e.g. Intermodal Rail / Dedicated Road Freight"
                  onChange={(e) => setFormData({ ...formData, shipMethod: e.target.value })}
                  className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-gray-700 mb-1 font-semibold">Freight (EUR)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.freightEur}
                    onChange={(e) => setFormData({ ...formData, freightEur: e.target.value })}
                    className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 font-semibold">Inland Hub (EUR)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.inlandEur}
                    onChange={(e) => setFormData({ ...formData, inlandEur: e.target.value })}
                    className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
                  />
                </div>
                <div>
                  <label className="block text-gray-700 mb-1 font-semibold">Other (EUR)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={formData.otherEur}
                    onChange={(e) => setFormData({ ...formData, otherEur: e.target.value })}
                    className="w-full h-10 px-3 border border-[#c5c6ce] rounded-lg focus:ring-2 focus:ring-[#041632]"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#c5c6ce]">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingCorridor(null);
                  }}
                  className="px-4 py-2 border border-[#c5c6ce] rounded-lg hover:bg-gray-50 text-gray-700 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
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
                  ) : editingCorridor ? (
                    'Save Changes'
                  ) : (
                    'Create Corridor'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
