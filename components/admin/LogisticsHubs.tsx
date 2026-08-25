import React from 'react';

export const LogisticsHubs: React.FC = () => {
  const hubs = [
    { city: 'Rotterdam Central (HQ)', country: 'Netherlands', code: 'NL-RTM-01', capacity: '12,000 Pallets', dispatchSLA: '24 Hours', status: 'Operational (Green)' },
    { city: 'Munich Logistics Terminal', country: 'Germany', code: 'DE-MUC-02', capacity: '8,500 Pallets', dispatchSLA: '24 Hours', status: 'Operational (Green)' },
    { city: 'Milan Interporto', country: 'Italy', code: 'IT-MXP-03', capacity: '9,000 Pallets', dispatchSLA: '24 Hours', status: 'Operational (Green)' },
    { city: 'Paris Nord Depot', country: 'France', code: 'FR-CDG-04', capacity: '7,500 Pallets', dispatchSLA: '48 Hours', status: 'Operational (Green)' },
    { city: 'Madrid Sur Hub', country: 'Spain', code: 'ES-MAD-05', capacity: '6,200 Pallets', dispatchSLA: '48 Hours', status: 'Operational (Green)' },
    { city: 'Warsaw East Terminal', country: 'Poland', code: 'PL-WAW-06', capacity: '11,000 Pallets', dispatchSLA: '24 Hours', status: 'Operational (Green)' },
  ];

  return (
    <div className="p-6 sm:p-8 md:p-10 space-y-6 max-w-[1440px] mx-auto bg-[#f8f9ff]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#c5c6ce] pb-6">
        <div>
          <span className="font-mono-data text-xs text-[#735a31] uppercase tracking-widest block mb-1 font-semibold">
            Pan-European Distribution Network
          </span>
          <h1 className="font-headline text-2xl sm:text-3xl font-bold text-[#041632]">
            European Logistics Hubs &amp; Depots
          </h1>
          <p className="font-body text-sm text-[#44474d]">
            Real-time warehouse utilization, pallet safety buffers, and transit routing nodes.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {hubs.map((h) => (
          <div key={h.code} className="bg-white border border-[#c5c6ce] rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <span className="font-mono-data text-[10px] bg-[#dce9ff] text-[#041632] px-2 py-0.5 rounded font-bold">
                  {h.code}
                </span>
                <h3 className="font-headline text-lg font-bold text-[#041632] mt-2">{h.city}</h3>
                <p className="font-mono-data text-xs text-[#75777e]">{h.country}</p>
              </div>
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" title="Active"></span>
            </div>

            <div className="bg-[#f8f9ff] p-3 rounded border border-[#c5c6ce]/60 font-mono-data text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#75777e]">Staged Pallet Capacity:</span>
                <span className="font-bold text-[#041632]">{h.capacity}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#75777e]">Regional Dispatch SLA:</span>
                <span className="font-bold text-[#e77114]">{h.dispatchSLA}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs font-mono-data text-emerald-700">
              <span>Status: {h.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
