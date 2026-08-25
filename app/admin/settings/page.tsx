export default function AdminSettings() {
  return (
    <div className="p-8 max-w-[1440px] mx-auto space-y-6">
      <h1 className="font-headline text-2xl font-bold text-[#041632]">OpsVale System Settings</h1>
      <div className="bg-white border border-[#c5c6ce] p-6 rounded-xl space-y-4 font-mono-data text-xs max-w-xl">
        <div>
          <span className="text-[#75777e] block">Connected ERP:</span>
          <span className="font-bold text-[#041632]">SAP S/4HANA Supply Chain Gateway</span>
        </div>
        <div>
          <span className="text-[#75777e] block">EDI Dispatch Channel:</span>
          <span className="font-bold text-emerald-600">Active (AS2 Protocol)</span>
        </div>
        <div>
          <span className="text-[#75777e] block">Environment:</span>
          <span className="font-bold text-[#041632]">Production (ops-eur-prod-01)</span>
        </div>
      </div>
    </div>
  );
}
