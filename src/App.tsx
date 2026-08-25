import React, { useState } from 'react';
import { AppView, Lead, ActivityItem, CalculatorState, LeadStatus } from './types';
import { INITIAL_LEADS, INITIAL_ACTIVITIES } from './data/mockData';

// Customer Components
import { TopNavBar } from './components/TopNavBar';
import { HeroSection } from './components/HeroSection';
import { PillarsSection } from './components/PillarsSection';
import { CalculatorPromoSection } from './components/CalculatorPromoSection';
import { SavingsCalculatorPage } from './components/SavingsCalculatorPage';
import { MultiStepQuotePage } from './components/MultiStepQuotePage';
import { ProductsPage } from './components/ProductsPage';
import { HowItWorksPage } from './components/HowItWorksPage';
import { AboutPage } from './components/AboutPage';
import { Footer } from './components/Footer';

// Admin Components
import { SideNavBar } from './components/admin/SideNavBar';
import { OpsDashboard } from './components/admin/OpsDashboard';
import { LeadDetailView } from './components/admin/LeadDetailView';
import { PricingManagement } from './components/admin/PricingManagement';
import { AdminLeadsList } from './components/admin/AdminLeadsList';
import { AdminQuotesList } from './components/admin/AdminQuotesList';
import { LogisticsHubs } from './components/admin/LogisticsHubs';

export function App() {
  const [currentView, setCurrentView] = useState<AppView>('home');
  const [leads, setLeads] = useState<Lead[]>(INITIAL_LEADS);
  const [activities, setActivities] = useState<ActivityItem[]>(INITIAL_ACTIVITIES);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(INITIAL_LEADS[0]);

  // Calculator & Quote State transfer
  const [calcVolume, setCalcVolume] = useState<number>(20000);
  const [prefilledCalcState, setPrefilledCalcState] = useState<CalculatorState | null>(null);
  const [estimatedSavings, setEstimatedSavings] = useState<number>(12400);

  const isAdminView = currentView.startsWith('admin-');

  // Customer Navigation Handlers
  const handleGoToCalculatorWithVolume = (volume: number) => {
    setCalcVolume(volume);
    setCurrentView('calculator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleProceedToQuoteFromCalc = (calcState: CalculatorState, savings: number) => {
    setPrefilledCalcState(calcState);
    setEstimatedSavings(savings);
    setCurrentView('quote-request');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenGeneralQuote = () => {
    setCurrentView('quote-request');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuoteSubmitted = (newLead: Lead) => {
    setLeads((prev) => [newLead, ...prev]);
    const newAct: ActivityItem = {
      id: `act-${Date.now()}`,
      timeAgo: 'Just now',
      author: newLead.contactName,
      subject: 'submitted wholesale quote inquiry for',
      company: newLead.companyName,
      action: 'submitted',
      tag: `Quote ${newLead.code}`,
      type: 'quote'
    };
    setActivities((prev) => [newAct, ...prev]);
  };

  // Admin Handlers
  const handleSelectLead = (lead: Lead) => {
    setSelectedLead(lead);
    setCurrentView('admin-lead-detail');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUpdateStatus = (leadId: string, newStatus: LeadStatus) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === leadId) {
          const updatedHistory = [
            {
              id: `act-${Date.now()}`,
              timestamp: 'Just now',
              author: 'Sarah Jenkins',
              type: 'status_change' as const,
              content: `Changed status to ${newStatus}`
            },
            ...l.activityHistory
          ];
          return { ...l, status: newStatus, activityHistory: updatedHistory };
        }
        return l;
      })
    );

    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) => prev ? { ...prev, status: newStatus } : null);
    }

    const updatedLead = leads.find((l) => l.id === leadId);
    if (updatedLead) {
      const newAct: ActivityItem = {
        id: `act-${Date.now()}`,
        timeAgo: 'Just now',
        author: 'Sarah Jenkins',
        subject: `changed status to ${newStatus} for`,
        company: updatedLead.companyName,
        action: newStatus,
        type: newStatus === 'Closed Won' ? 'won' : 'status'
      };
      setActivities((prev) => [newAct, ...prev]);
    }
  };

  const handleAddNote = (leadId: string, noteText: string) => {
    setLeads((prev) =>
      prev.map((l) => {
        if (l.id === leadId) {
          const updatedHistory = [
            {
              id: `act-${Date.now()}`,
              timestamp: 'Just now',
              author: 'Sarah Jenkins',
              type: 'note' as const,
              content: noteText
            },
            ...l.activityHistory
          ];
          return { ...l, activityHistory: updatedHistory };
        }
        return l;
      })
    );

    if (selectedLead && selectedLead.id === leadId) {
      setSelectedLead((prev) =>
        prev
          ? {
              ...prev,
              activityHistory: [
                {
                  id: `act-${Date.now()}`,
                  timestamp: 'Just now',
                  author: 'Sarah Jenkins',
                  type: 'note' as const,
                  content: noteText
                },
                ...prev.activityHistory
              ]
            }
          : null
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9ff] text-[#0b1c30] flex flex-col selection:bg-[#ffdeac] selection:text-[#281900]">
      {isAdminView ? (
        /* ADMIN PORTAL LAYOUT */
        <div className="flex flex-row min-h-screen w-full">
          {/* Admin Sidebar */}
          <SideNavBar
            currentView={currentView}
            onNavigate={(v) => setCurrentView(v)}
            onNewQuoteClick={() => {
              setCurrentView('quote-request');
            }}
            newLeadsCount={leads.filter((l) => l.status === 'New').length}
          />

          {/* Admin Main Canvas */}
          <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
            {currentView === 'admin-dashboard' && (
              <OpsDashboard
                leads={leads}
                activities={activities}
                onSelectLead={handleSelectLead}
                onNavigate={(v) => setCurrentView(v)}
              />
            )}

            {currentView === 'admin-leads' && (
              <AdminLeadsList
                leads={leads}
                onSelectLead={handleSelectLead}
                onNewLeadClick={() => setCurrentView('quote-request')}
              />
            )}

            {currentView === 'admin-crm' && (
              <AdminLeadsList
                leads={leads}
                onSelectLead={handleSelectLead}
                onNewLeadClick={() => setCurrentView('quote-request')}
              />
            )}

            {currentView === 'admin-lead-detail' && selectedLead && (
              <LeadDetailView
                lead={selectedLead}
                onBack={() => setCurrentView('admin-leads')}
                onUpdateStatus={handleUpdateStatus}
                onAddNote={handleAddNote}
              />
            )}

            {currentView === 'admin-quotes' && (
              <AdminQuotesList
                leads={leads}
                onSelectLead={handleSelectLead}
              />
            )}

            {currentView === 'admin-pricing' && <PricingManagement />}

            {currentView === 'admin-logistics' && <LogisticsHubs />}

            {currentView === 'admin-settings' && (
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
            )}
          </main>
        </div>
      ) : (
        /* CUSTOMER FACING WEBSITE LAYOUT */
        <div className="flex flex-col min-h-screen">
          <TopNavBar
            currentView={currentView}
            onNavigate={(v) => {
              setCurrentView(v);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenQuote={handleOpenGeneralQuote}
          />

          <main className="flex-grow">
            {currentView === 'home' && (
              <>
                <HeroSection
                  onCheckSavings={() => handleGoToCalculatorWithVolume(50000)}
                  onRequestQuote={handleOpenGeneralQuote}
                />
                <PillarsSection />
                <CalculatorPromoSection
                  onGoToCalculatorWithVolume={handleGoToCalculatorWithVolume}
                />
              </>
            )}

            {currentView === 'calculator' && (
              <SavingsCalculatorPage
                initialVolume={calcVolume}
                onProceedToQuote={handleProceedToQuoteFromCalc}
              />
            )}

            {currentView === 'quote-request' && (
              <MultiStepQuotePage
                initialCalcState={prefilledCalcState}
                estimatedSavings={estimatedSavings}
                onQuoteSubmitted={handleQuoteSubmitted}
                onCancel={() => {
                  setCurrentView('home');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            )}

            {currentView === 'products' && (
              <ProductsPage onRequestQuote={handleOpenGeneralQuote} />
            )}

            {currentView === 'how-it-works' && (
              <HowItWorksPage
                onCheckSavings={() => handleGoToCalculatorWithVolume(50000)}
                onRequestQuote={handleOpenGeneralQuote}
              />
            )}

            {currentView === 'about' && <AboutPage />}
          </main>

          <Footer
            onNavigate={(v) => {
              setCurrentView(v);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        </div>
      )}
    </div>
  );
}

export default App;
