import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthModal } from './components/auth/AuthModal';
import { NxtJobLayout } from './components/layout/NxtJobLayout';
import { LandingPage } from './pages/LandingPage';
import { DashboardPage } from './pages/DashboardPage';
import { JobBoardPage } from './pages/JobBoardPage';
import { TargetCompaniesPage } from './pages/TargetCompaniesPage';
import { RecruitmentAgenciesPage } from './pages/RecruitmentAgenciesPage';
import { CareerNavigatorPage } from './pages/CareerNavigatorPage';
import { ResumeStudioPage } from './pages/ResumeStudioPage';
import { AtsTailorPage } from './pages/AtsTailorPage';
import { MockInterviewPage } from './pages/MockInterviewPage';
import { JobTrackerPage } from './pages/JobTrackerPage';
import { ExecutiveToolsPage } from './pages/ExecutiveToolsPage';
import { InteractiveTrialPage } from './pages/InteractiveTrialPage';
import { NetworkerPage } from './pages/NetworkerPage';
import { ProfileSetupPage } from './pages/ProfileSetupPage';
import { NovaPage } from './pages/NovaPage';
import { api } from './services/api';
import './styles/apple-theme.css';
import './styles/nxtjob-theme.css';

function MainApp() {
  const { user, showAuthModal, closeAuthModal, refreshUser } = useAuth();
  const [activePage, setActivePage] = useState('jobs');
  const [activeSubTab, setActiveSubTab] = useState('jobs');
  const [showSetup, setShowSetup] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  // Check if profile is set up for current user
  useEffect(() => {
    const checkProfile = async () => {
      try {
        const resume = await api.getMasterResume();
        if (!resume?.is_profile_setup && !user?.is_profile_setup && activePage !== 'landing') {
          // Allow browsing without blocking immediately, but keep setup ready
        }
      } catch (e) {
        // API loading
      } finally {
        setProfileChecked(true);
      }
    };
    checkProfile();
  }, [user?.id, activePage]);

  const handleNavigate = (page) => {
    setActivePage(page);
    setActiveSubTab(page);
    if (page === 'profile-setup') {
      setShowSetup(true);
    }
  };

  // Handle LinkedIn OAuth callback params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('linkedin_connected') === 'true') {
      const name = params.get('li_name');
      alert(`✅ LinkedIn connected${name ? ` as ${name}` : ''}! You can now send connection requests directly.`);
      window.history.replaceState({}, '', window.location.pathname);
    }
    if (params.get('linkedin_error')) {
      alert(`LinkedIn error: ${params.get('linkedin_error')}`);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  return (
    <>
      {/* Auth Modal (Login / Signup / Quick Demo) */}
      <AuthModal isOpen={showAuthModal} onClose={closeAuthModal} />

      {/* Profile Setup Wizard — modal */}
      {showSetup && (
        <ProfileSetupPage
          onComplete={() => {
            setShowSetup(false);
            refreshUser();
            setActivePage('dashboard');
          }}
          onClose={() => setShowSetup(false)}
        />
      )}

      {/* Landing Page (Stand-alone view if explicitly on landing) */}
      {activePage === 'landing' ? (
        <LandingPage onNavigate={handleNavigate} />
      ) : (
        /* Authentic NxtJob Layout with Left Icon Rail, Top Subnav Pills, & Persistent Nova Copilot */
        <NxtJobLayout
          activePage={activePage}
          onNavigate={handleNavigate}
          activeSubTab={activeSubTab}
          onSubTabChange={(tab) => {
            setActiveSubTab(tab);
            setActivePage(tab);
          }}
        >
          {/* Main Views */}
          {activePage === 'dashboard'     && <DashboardPage onNavigate={handleNavigate} />}
          {(activePage === 'jobs' || activePage === 'my-jobs') && <JobBoardPage onNavigate={handleNavigate} />}
          {activePage === 'companies'    && <TargetCompaniesPage onNavigate={handleNavigate} />}
          {activePage === 'agencies'     && <RecruitmentAgenciesPage onNavigate={handleNavigate} />}
          {activePage === 'navigator'    && <CareerNavigatorPage onNavigate={handleNavigate} />}
          {activePage === 'resume'       && <ResumeStudioPage onNavigate={handleNavigate} />}
          {activePage === 'ats'          && <AtsTailorPage onNavigate={handleNavigate} />}
          {activePage === 'interview'    && <MockInterviewPage onNavigate={handleNavigate} />}
          {activePage === 'tracker'      && <JobTrackerPage onNavigate={handleNavigate} />}
          {activePage === 'executive'    && <ExecutiveToolsPage onNavigate={handleNavigate} />}
          {activePage === 'networker'    && <NetworkerPage onNavigate={handleNavigate} />}
          {activePage === 'influencer'   && <NetworkerPage onNavigate={handleNavigate} />}
          {activePage === 'nova'         && <NovaPage onNavigate={handleNavigate} />}
          {activePage === 'trial'        && <InteractiveTrialPage onNavigate={handleNavigate} />}
        </NxtJobLayout>
      )}
    </>
  );
}

export function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;
