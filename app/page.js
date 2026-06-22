'use client';

import React, { useState, useEffect } from 'react';

const scanSteps = [
  "Accessing PubMed & global food databases...",
  "Querying FDA azodicarbonamide regulations...",
  "Analyzing molecular structure of dough conditioners...",
  "Cross-referencing 2,400+ chemical ingredient safety metrics...",
  "Synthesizing scientific consensus...",
  "Scan complete. Generating report..."
];

export default function EpicureanApp() {
  const [screen, setScreen]           = useState('landing');
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme]             = useState('light');
  const [mounted, setMounted]         = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanStatus, setScanStatus]   = useState(scanSteps[0]);
  const [showStats, setShowStats]     = useState(false);
  const [resultData, setResultData]   = useState(null);
  const [apiCallInProgress, setApiCallInProgress] = useState(false);
  const [apiError, setApiError]       = useState(null);

  /* ── Theme init ── */
  useEffect(() => {
    const saved  = localStorage.getItem('color-theme');
    const sysDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && sysDark)) {
      setTheme('dark');
      document.documentElement.classList.add('dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
    }
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    if (theme === 'light') {
      setTheme('dark');
      document.documentElement.classList.add('dark');
      localStorage.setItem('color-theme', 'dark');
    } else {
      setTheme('light');
      document.documentElement.classList.remove('dark');
      localStorage.setItem('color-theme', 'light');
    }
  };

  /* ── Scanning progress ── */
  useEffect(() => {
    if (screen !== 'scanning') return;
    setScanProgress(0);
    setScanStatus(scanSteps[0]);
    const interval = setInterval(() => {
      setScanProgress(prev => {
        const next = prev + 4;
        setScanStatus(scanSteps[Math.min(Math.floor(next / 18), scanSteps.length - 1)]);
        if (next >= 100) {
          clearInterval(interval);
          return 100;
        }
        return next;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [screen]);

  /* ── Transition to results when API responds OR on error ── */
  useEffect(() => {
    if (screen !== 'scanning') return;
    if (resultData !== null || apiError !== null) {
      setScreen('results');
    }
  }, [screen, resultData, apiError]);

  /* ── Stats animation ── */
  useEffect(() => {
    if (screen === 'results') {
      const t = setTimeout(() => setShowStats(true), 100);
      return () => clearTimeout(t);
    }
    setShowStats(false);
  }, [screen]);

  const handleVerify = async (query) => {
    if (!query.trim() || apiCallInProgress) return;
    setApiCallInProgress(true);
    setScreen('scanning');
    setResultData(null);
    setApiError(null);
    try {
      const response = await fetch('/api/check-rumor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rumorText: query }),
      });
      if (!response.ok) throw new Error(`API returned ${response.status}`);
      const data = await response.json();
      setResultData(data);
    } catch (err) {
      setApiError(err.message);
      setResultData(null);
    } finally {
      setApiCallInProgress(false);
    }
  };
  const handleKeyDown = e     => { if (e.key === 'Enter') handleVerify(searchQuery); };
  const resetToHome   = ()    => { setScreen('landing'); setSearchQuery(''); };

  return (
    <div className="font-body-md bg-background text-on-surface min-h-screen transition-colors duration-300 selection:bg-primary-container selection:text-on-primary-container flex flex-col justify-between">

      {/* ── Navigation ── */}
      <header className="bg-surface-container-low/80 backdrop-blur-xl border-b border-outline-variant/40 top-0 sticky z-50 transition-colors duration-300">
        <nav className="flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 w-full max-w-max-width mx-auto">
          <div className="flex items-center gap-2 cursor-pointer" id="logo-button" onClick={resetToHome}>
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              restaurant
            </span>
            <span className="font-headline-md text-headline-md font-bold text-primary">
              FactPulse
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button
              id="theme-toggle"
              onClick={toggleTheme}
              className="p-2 rounded-xl bg-surface-container text-on-surface-variant hover:bg-primary/10 hover:text-primary transition-all active:scale-95 flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {mounted ? (
                theme === 'light'
                  ? <span className="material-symbols-outlined">dark_mode</span>
                  : <span className="material-symbols-outlined">light_mode</span>
              ) : (
                <span className="material-symbols-outlined">dark_mode</span>
              )}
            </button>

            <div className="md:hidden">
              <span className="material-symbols-outlined text-primary cursor-pointer">menu</span>
            </div>
          </div>
        </nav>
      </header>

      {/* ── Main ── */}
      <main className="relative flex-grow">

        {/* ════════════════════════════════
            1. LANDING SCREEN
           ════════════════════════════════ */}
        {screen === 'landing' && (
          <div id="landing-screen" className="transition-all duration-500 ease-in-out">
            <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden hero-mesh">
              <div className="relative z-10 w-full max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop text-center py-12">
                <div className="max-w-3xl mx-auto space-y-lg">
                  <h1 className="font-headline-xl text-headline-xl md:text-[64px] text-on-surface leading-tight tracking-tight">
                    Uncover the <span className="text-primary italic">Truth</span> in Every Bite.
                  </h1>
                  <div className="mt-xl glass-card p-2 md:p-3 rounded-2xl food-shadow max-w-2xl mx-auto flex flex-col md:flex-row gap-2 transition-all duration-500 ease-out">
                    <div className="relative flex-grow flex items-center px-4">
                      <span className="material-symbols-outlined text-outline mr-3">search</span>
                      <input
                        id="search-input"
                        className="w-full bg-transparent border-none focus:ring-0 text-body-md font-body-md py-4 text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none"
                        placeholder='Ask a rumor (e.g., "Is there plastic in bread?")'
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                      />
                    </div>
                    <button
                      id="verify-button"
                      onClick={() => handleVerify(searchQuery)}
                      disabled={!searchQuery.trim()}
                      className="primary-gradient text-white px-8 py-4 rounded-xl font-label-md font-bold shadow-lg active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Verify Truth
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section id="features-section" className="py-xl px-margin-mobile md:px-margin-desktop bg-surface border-t border-outline-variant/20">
              <div className="max-w-max-width mx-auto">
                <div className="text-center mb-xl">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Precision Built on Proof</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-sm">Data-driven insights for the conscious consumer.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
                  <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30 food-shadow-hover flex flex-col items-start gap-4 group">
                    <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors duration-300">
                      <span className="material-symbols-outlined text-[32px]">biotech</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">Deep Scans</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">Proprietary AI cross-references peer-reviewed journals, FDA filings, and global chemical databases in milliseconds.</p>
                  </div>
                  <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30 food-shadow-hover flex flex-col items-start gap-4 group">
                    <div className="w-14 h-14 rounded-2xl bg-tertiary/8 flex items-center justify-center text-tertiary group-hover:bg-tertiary-container group-hover:text-on-tertiary-container transition-colors duration-300">
                      <span className="material-symbols-outlined text-[32px]">history_edu</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">Verified Sources</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">Total transparency with direct citations to clinical studies. We never use anecdotal evidence for health claims.</p>
                  </div>
                  <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30 food-shadow-hover flex flex-col items-start gap-4 group">
                    <div className="w-14 h-14 rounded-2xl bg-secondary/8 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-colors duration-300">
                      <span className="material-symbols-outlined text-[32px]">shield_with_heart</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">Safety Alerts</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">Proactive monitoring of global food recalls and emerging allergen research tailored to your dietary profile.</p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ════════════════════════════════
            2. SCANNING SCREEN — Skeleton Loader
           ════════════════════════════════ */}
        {screen === 'scanning' && (
          <div id="scanning-screen" className="bg-background transition-colors duration-500 ease-in-out min-h-screen">
            <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-xl">
              <div className="mb-lg flex flex-col items-center text-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-md">
                    <span className="material-symbols-outlined text-base animate-spin" style={{ animationDuration: '2s' }}>biotech</span>
                  </div>
                  <h3 className="font-headline-md text-xl font-bold text-on-surface">{apiError ? 'Error in Analysis' : (scanProgress >= 100 ? 'Waiting for Results...' : 'Analyzing Claim')}</h3>
                </div>
                <p className="font-body-md text-on-surface-variant text-sm min-h-[20px] transition-all duration-200">
                  {apiError ? apiError : (scanProgress >= 100 ? 'Finalizing analysis report...' : scanStatus)}
                </p>
                <div className="w-full max-w-md h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-200 ease-out" style={{ width: `${Math.min(scanProgress, 100)}%` }}></div>
                </div>
                <p className="font-label-sm text-on-surface-variant/50 text-xs">{Math.round(scanProgress)}%</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-xl">
                <div className="md:col-span-8 minimal-card p-lg rounded-2xl flex flex-col gap-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="skeleton-bone-circle w-5 h-5"></div>
                        <div className="skeleton-bone h-4 w-28"></div>
                      </div>
                      <div className="skeleton-bone h-7 w-48"></div>
                    </div>
                    <div className="text-right space-y-2">
                      <div className="skeleton-bone h-10 w-16 ml-auto"></div>
                      <div className="skeleton-bone h-3 w-24 ml-auto"></div>
                    </div>
                  </div>
                  <div className="skeleton-bone h-2 w-full rounded-full"></div>
                  <div className="space-y-3">
                    <div className="skeleton-bone h-4 w-full"></div>
                    <div className="skeleton-bone h-4 w-11/12"></div>
                    <div className="skeleton-bone h-4 w-3/4"></div>
                  </div>
                  <div className="pt-4 border-t border-outline-variant/20">
                    <div className="flex gap-3">
                      <div className="skeleton-bone h-8 w-44 rounded-full"></div>
                      <div className="skeleton-bone h-8 w-52 rounded-full"></div>
                    </div>
                  </div>
                </div>
                <div className="md:col-span-4 flex flex-col gap-gutter">
                  <div className="minimal-card p-md rounded-2xl flex-1">
                    <div className="skeleton-bone h-3 w-36 mb-8"></div>
                    <div className="space-y-8">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="space-y-3">
                          <div className="flex justify-between">
                            <div className="skeleton-bone h-3 w-24"></div>
                            <div className="skeleton-bone h-3 w-8"></div>
                          </div>
                          <div className="skeleton-bone h-1.5 w-full rounded-full"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="minimal-card p-lg rounded-2xl border-l-4 border-l-outline-variant/40 mb-xl">
                <div className="flex items-center gap-3 mb-6">
                  <div className="skeleton-bone-circle w-6 h-6"></div>
                  <div className="skeleton-bone h-5 w-56"></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                  <div className="space-y-3">
                    <div className="skeleton-bone h-4 w-full"></div>
                    <div className="skeleton-bone h-4 w-11/12"></div>
                    <div className="skeleton-bone h-4 w-5/6"></div>
                    <div className="skeleton-bone h-4 w-3/4"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="skeleton-bone h-4 w-full"></div>
                    <div className="skeleton-bone h-4 w-10/12"></div>
                    <div className="skeleton-bone h-4 w-4/5"></div>
                    <div className="skeleton-bone h-4 w-2/3"></div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="minimal-card p-6 rounded-xl flex flex-col items-center gap-3">
                    <div className="skeleton-bone-circle w-8 h-8"></div>
                    <div className="skeleton-bone h-3.5 w-20"></div>
                    <div className="skeleton-bone h-2.5 w-14"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════
            3. RESULTS SCREEN
           ════════════════════════════════ */}
        {screen === 'results' && (
          <div id="results-screen" className="bg-background transition-colors duration-500 ease-in-out">
            <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-xl">

              {apiError && !resultData && (
                <div className="minimal-card p-lg rounded-2xl border-l-4 border-l-error mb-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>error</span>
                    <h3 className="font-headline-md text-on-surface">Analysis Failed</h3>
                  </div>
                  <p className="font-body-md text-on-surface-variant">
                    Sorry, we couldn't complete the analysis. The API encountered an error: {apiError}. Please try again.
                  </p>
                </div>
              )}

              <section className="mb-lg text-center md:text-left">
                <h2 className="font-headline-xl text-headline-xl text-on-surface mb-6 max-w-4xl">
                  '{searchQuery || "Is there plastic in bread?"}'
                </h2>
              </section>

              {/* Invalid Response */}
              {resultData && (resultData.status === 'invalid' || resultData.status === 'inappropriate') && (
                <div className="flex flex-col items-center justify-center w-full">
                  {/* Confidence Score — Large Circular Badge */}
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="flex items-center justify-center w-44 h-44 rounded-full border-[5px] border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">
                      <div className="text-center">
                        <span className="text-5xl font-bold text-gray-400 dark:text-gray-500">0%</span>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Evidence Strength</p>
                      </div>
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="mt-10"></div>

                  {/* Agrees/Disagrees/Inconclusive — Plain Text Row */}
                  <div className="flex justify-center gap-10">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-green-500 dark:text-green-400">0%</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Agrees</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-red-500 dark:text-red-400">0%</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Disagrees</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-amber-500 dark:text-amber-400">100%</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Inconclusive</span>
                    </div>
                  </div>

                  {/* Source Count — Proper spacing */}
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">0</span>
                      {' '}out of{' '}
                      <span className="font-semibold text-gray-700 dark:text-gray-300">8</span>
                      {' '}sources agree
                    </p>
                  </div>
                </div>
              )}

              {/* Results Section */}
              {resultData && resultData.status !== 'invalid' && resultData.status !== 'inappropriate' && (
                <div className="flex flex-col items-center justify-center w-full">
                  {/* Confidence Score — Large Circular Badge */}
                  <div className="flex flex-col items-center justify-center w-full">
                    <div className="flex items-center justify-center w-44 h-44 rounded-full border-[5px] border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20">
                      <div className="text-center">
                        <span className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                          {resultData.confidence !== undefined ? `${resultData.confidence}%` : '0%'}
                        </span>
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-0.5">Evidence Strength</p>
                      </div>
                    </div>
                  </div>

                  {/* Spacer */}
                  <div className="mt-10"></div>

                  {/* Agrees/Disagrees/Inconclusive — Plain Text Row */}
                  <div className="flex justify-center gap-10">
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-green-500 dark:text-green-400">
                        {resultData.agrees !== undefined ? `${resultData.agrees}%` : '0%'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Agrees</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-red-500 dark:text-red-400">
                        {resultData.disagrees !== undefined ? `${resultData.disagrees}%` : '0%'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Disagrees</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span className="text-2xl font-bold text-amber-500 dark:text-amber-400">
                        {resultData.inconclusive !== undefined ? `${resultData.inconclusive}%` : '0%'}
                      </span>
                      <span className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Inconclusive</span>
                    </div>
                  </div>

                  {/* Source Count — Proper spacing */}
                  <div className="text-center mt-4">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{resultData.sourcesWithMatches || 0}</span>
                      {' '}out of{' '}
                      <span className="font-semibold text-gray-700 dark:text-gray-300">{resultData.totalSourcesChecked || 8}</span>
                      {' '}sources agree
                    </p>
                  </div>
                </div>
              )}

              {/* Evidence summary */}
              <section className="mb-xl">
                <div className="minimal-card p-lg rounded-2xl border-l-4 border-l-primary">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-primary">menu_book</span>
                    <h3 className="font-headline-md text-on-surface">AI Analysis Summary</h3>
                  </div>
                  <div className="font-body-md text-on-surface-variant leading-relaxed">
                    <p>
                      {resultData
                        ? resultData.summary
                        : 'No summary available. The API may have encountered an issue.'}
                    </p>
                  </div>
                  <div className="flex gap-4 mt-8 pt-6 border-t border-outline-variant/30">
                    <span className="bg-[#e8f5e9] dark:bg-[#0a2010] text-[#2e7d32] dark:text-[#6fcf80] border border-[#c8e6c9] dark:border-[#1a4d25] px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest">AI Generated</span>
                    <span className="bg-[#fff3e0] dark:bg-[#1a1500] text-[#e65100] dark:text-[#ffb74d] border border-[#ffe0b2] dark:border-[#3a2500] px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest">FDA Referenced</span>
                  </div>
                </div>
              </section>

              {/* DATA SOURCES Section - Blends with Background */}
              <div className="mt-8">
                <h3 className="text-center text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
                  Data Sources
                </h3>
                <div className="flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
                  
                  <div className="px-3 py-1.5 text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 cursor-default">
                    🇺🇸 FDA
                  </div>
                  
                  <div className="px-3 py-1.5 text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 cursor-default">
                    🇺🇸 USDA
                  </div>
                  
                  <div className="px-3 py-1.5 text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 cursor-default">
                    🇬🇧 UK FSA
                  </div>
                  
                  <div className="px-3 py-1.5 text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 cursor-default">
                    🇨🇦 CFIA
                  </div>
                  
                  <div className="px-3 py-1.5 text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 cursor-default">
                    🌍 WHO
                  </div>
                  
                  <div className="px-3 py-1.5 text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 cursor-default">
                    🌐 Open Food Facts
                  </div>
                  
                  <div className="px-3 py-1.5 text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 cursor-default">
                    🇪🇺 RASFF
                  </div>
                  
                  <div className="px-3 py-1.5 text-xs bg-transparent border border-gray-300 dark:border-gray-600 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-200 cursor-default">
                    🇺🇸 CDC
                  </div>
                  
                </div>
              </div>

              {/* CTAs */}
              <section className="flex flex-col md:flex-row items-center justify-center gap-md py-lg border-t border-outline-variant/20">
                <button
                  id="back-button"
                  onClick={resetToHome}
                  className="primary-gradient text-white px-10 py-4 rounded-xl font-label-md shadow-sm active:scale-95"
                >
                  Verify Another Rumor
                </button>
              </section>

            </div>
          </div>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="bg-surface-container-low border-t border-outline-variant/30 mt-xl transition-colors duration-300">
        <div className="flex flex-col md:flex-row justify-between items-center px-margin-mobile md:px-margin-desktop py-lg w-full max-w-max-width mx-auto gap-gutter">
          <div className="space-y-2 text-center md:text-left">
            <div className="font-headline-sm text-headline-sm font-bold text-on-surface">
              FactPulse
            </div>
            <p className="font-body-md text-body-md text-on-surface-variant">
              Truth in every bite. Built on science.
            </p>
          </div>
          <div className="flex flex-col items-center md:items-end gap-2">
            <div className="flex gap-6">
              {['Scientific Sources', 'Privacy'].map(link => (
                <a key={link} className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors" href="#">
                  {link}
                </a>
              ))}
            </div>
            <div className="flex gap-4 mt-2 items-center">
              <span className="material-symbols-outlined text-on-surface-variant cursor-pointer hover:text-primary transition-colors">public</span>
              <p className="text-label-sm text-on-surface-variant">© 2026 FactPulse</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}