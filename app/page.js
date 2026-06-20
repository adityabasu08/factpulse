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
          setTimeout(() => setScreen('results'), 400);
          return 100;
        }
        return next;
      });
    }, 60);
    return () => clearInterval(interval);
  }, [screen]);

  /* ── Stats animation ── */
  useEffect(() => {
    if (screen === 'results') {
      const t = setTimeout(() => setShowStats(true), 100);
      return () => clearTimeout(t);
    }
    setShowStats(false);
  }, [screen]);

  const handleVerify  = query => { if (query.trim()) setScreen('scanning'); };
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

            {/* Theme toggle — only rendered after mount to prevent hydration mismatch */}
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

            {/* Hero */}
            <section className="relative min-h-[600px] flex items-center justify-center overflow-hidden hero-mesh">
              <div className="relative z-10 w-full max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop text-center py-12">
                <div className="max-w-3xl mx-auto space-y-lg">


                  <h1 className="font-headline-xl text-headline-xl md:text-[64px] text-on-surface leading-tight tracking-tight">
                    Uncover the <span className="text-primary italic">Truth</span> in Every Bite.
                  </h1>

                  <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl mx-auto">
                    A scientific lens for your plate. We analyze 1,000+ clinical sources to provide instant, evidence-based ingredient clarity.
                  </p>

                  {/* Search bar */}
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

            {/* Features Bento Grid */}
            <section id="features-section" className="py-xl px-margin-mobile md:px-margin-desktop bg-surface border-t border-outline-variant/20">
              <div className="max-w-max-width mx-auto">
                <div className="text-center mb-xl">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Precision Built on Proof</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant mt-sm">Data-driven insights for the conscious consumer.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">

                  {/* Card 1 — Deep Scans */}
                  <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30 food-shadow-hover flex flex-col items-start gap-4 group">
                    <div className="w-14 h-14 rounded-2xl bg-primary/8 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors duration-300">
                      <span className="material-symbols-outlined text-[32px]">biotech</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">Deep Scans</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">Proprietary AI cross-references peer-reviewed journals, FDA filings, and global chemical databases in milliseconds.</p>

                  </div>

                  {/* Card 2 — Verified Sources */}
                  <div className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/30 food-shadow-hover flex flex-col items-start gap-4 group">
                    <div className="w-14 h-14 rounded-2xl bg-tertiary/8 flex items-center justify-center text-tertiary group-hover:bg-tertiary-container group-hover:text-on-tertiary-container transition-colors duration-300">
                      <span className="material-symbols-outlined text-[32px]">history_edu</span>
                    </div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">Verified Sources</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">Total transparency with direct citations to clinical studies. We never use anecdotal evidence for health claims.</p>

                  </div>

                  {/* Card 3 — Safety Alerts */}
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
          <div id="scanning-screen" className="bg-surface-container-low transition-all duration-500 ease-in-out min-h-screen">
            <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-xl">

              {/* Scanning status bar */}
              <div className="mb-lg flex flex-col items-center text-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-secondary flex items-center justify-center text-white shadow-md">
                    <span className="material-symbols-outlined text-base animate-spin" style={{ animationDuration: '2s' }}>biotech</span>
                  </div>
                  <h3 className="font-headline-md text-xl font-bold text-on-surface">Analyzing Claim</h3>
                </div>
                <p className="font-body-md text-on-surface-variant text-sm min-h-[20px] transition-all duration-200">{scanStatus}</p>
                <div className="w-full max-w-md h-1.5 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-200 ease-out" style={{ width: `${scanProgress}%` }}></div>
                </div>
                <p className="font-label-sm text-on-surface-variant/50 text-xs">{Math.round(scanProgress)}%</p>
              </div>

              {/* Skeleton — mirrors results page layout */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-xl">

                {/* Verdict card skeleton */}
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

                {/* Stats sidebar skeleton */}
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

              {/* Evidence section skeleton */}
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

              {/* Source cards skeleton */}
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
          <div id="results-screen" className="bg-surface-container-low transition-all duration-500 ease-in-out">
            <div className="max-w-max-width mx-auto px-margin-mobile md:px-margin-desktop py-xl">

              {/* Header */}
              <section className="mb-lg text-center md:text-left">
                <h2 className="font-headline-xl text-headline-xl text-on-surface mb-6 max-w-4xl">
                  &apos;{searchQuery || "Is there plastic in bread?"}&apos;
                </h2>
              </section>

              {/* Main bento grid */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter mb-xl">

                {/* Verdict card */}
                <div className="md:col-span-8 minimal-card p-lg rounded-2xl flex flex-col gap-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>
                          cancel
                        </span>
                        <span className="font-label-md text-error uppercase font-bold tracking-wider">
                          Verdict: False
                        </span>
                      </div>
                      <h3 className="font-headline-lg text-headline-lg text-on-surface">
                        Highly Inaccurate
                      </h3>
                    </div>
                    <div className="text-right">
                      <span className="block text-4xl font-bold text-on-surface">92%</span>
                      <span className="font-label-sm text-outline uppercase tracking-widest">Confidence Score</span>
                    </div>
                  </div>

                  <div className="confidence-bar">
                    <div className="confidence-fill" id="main-confidence-fill" style={{ width: showStats ? '92%' : '0%' }}></div>
                  </div>

                  <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed">
                    Our verification system concludes that the claim of added plastic in commercial bread is <strong>false</strong>. The rumor originates from a misunderstanding of specific dough conditioners, which are chemically distinct from industrial polymers used in plastic production.
                  </p>

                  <div className="pt-4 border-t border-outline-variant/30">
                    <div className="flex flex-wrap gap-4">
                      <div className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-full">
                        <span className="material-symbols-outlined text-primary text-sm">verified_user</span>
                        <span className="font-label-sm text-on-surface">FDA Regulated Ingredients</span>
                      </div>
                      <div className="flex items-center gap-2 px-4 py-2 bg-surface-container rounded-full">
                        <span className="material-symbols-outlined text-primary text-sm">biotech</span>
                        <span className="font-label-sm text-on-surface">Molecular Analysis Matched</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats aside */}
                <div className="md:col-span-4 flex flex-col gap-gutter">
                  <div className="minimal-card p-md rounded-2xl flex-1">
                    <h4 className="font-label-md text-on-surface-variant mb-6 uppercase tracking-widest text-xs">
                      Statistical Distribution
                    </h4>
                    <div className="space-y-8">

                      {/* Contains Plastic */}
                      <div className="space-y-3">
                        <div className="flex justify-between font-label-md text-sm">
                          <span className="text-on-surface-variant">Contains Plastic</span>
                          <span className="text-on-surface font-semibold">5%</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container rounded-full">
                          <div id="stat-bar-1" className="h-full bg-outline-variant rounded-full transition-all duration-1000 ease-out" style={{ width: showStats ? '5%' : '0%' }}></div>
                        </div>
                      </div>

                      {/* Plastic Free */}
                      <div className="space-y-3">
                        <div className="flex justify-between font-label-md text-sm">
                          <span className="text-primary font-bold">Plastic Free</span>
                          <span className="text-primary font-bold">92%</span>
                        </div>
                        <div className="w-full h-1.5 bg-primary-container/25 rounded-full">
                          <div id="stat-bar-2" className="h-full bg-primary rounded-full transition-all duration-1000 ease-out" style={{ width: showStats ? '92%' : '0%' }}></div>
                        </div>
                      </div>

                      {/* Inconclusive */}
                      <div className="space-y-3">
                        <div className="flex justify-between font-label-md text-sm">
                          <span className="text-on-surface-variant">Inconclusive</span>
                          <span className="text-on-surface font-semibold">3%</span>
                        </div>
                        <div className="w-full h-1.5 bg-surface-container rounded-full">
                          <div id="stat-bar-3" className="h-full bg-outline-variant rounded-full transition-all duration-1000 ease-out" style={{ width: showStats ? '3%' : '0%' }}></div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>

              {/* Evidence summary */}
              <section className="mb-xl">
                <div className="minimal-card p-lg rounded-2xl border-l-4 border-l-primary">
                  <div className="flex items-center gap-3 mb-6">
                    <span className="material-symbols-outlined text-primary">menu_book</span>
                    <h3 className="font-headline-md text-on-surface">Scientific Evidence Summary</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-lg font-body-md text-on-surface-variant leading-relaxed">
                    <div className="space-y-4">
                      <p>
                        Analysis of over 14 regulatory databases and 2,400 chemical ingredient listings confirms that modern bread production does not involve &ldquo;plastic&rdquo; (polymers like PE or PVC). The rumor often confuses <strong className="text-on-surface">Azodicarbonamide</strong>, a legal dough conditioner, with components used in yoga mats.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <p>
                        Azodicarbonamide is FDA-approved for use as a bleaching agent and dough conditioner. While it has industrial uses, its application in food is strictly regulated and chemically distinct from consumer plastics used in construction or packaging.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-8 pt-6 border-t border-outline-variant/30">
                    <span className="bg-[#e8f5e9] dark:bg-[#0a2010] text-[#2e7d32] dark:text-[#6fcf80] border border-[#c8e6c9] dark:border-[#1a4d25] px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest">Lab Verified</span>
                    <span className="bg-[#e8f5e9] dark:bg-[#0a2010] text-[#2e7d32] dark:text-[#6fcf80] border border-[#c8e6c9] dark:border-[#1a4d25] px-4 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest">Peer Reviewed</span>
                  </div>
                </div>
              </section>

              {/* Sources */}
              <section className="mb-xl">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary/60">hub</span>
                    <h3 className="font-label-md text-on-surface uppercase tracking-widest text-sm">Verified Entities</h3>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-gutter">
                  {[
                    { icon: 'verified',  label: 'U.S. FDA',     sub: 'Regulatory' },
                    { icon: 'public',    label: 'WHO',          sub: 'Guidelines' },
                    { icon: 'science',   label: 'Nature Food',  sub: 'Journal' },
                    { icon: 'policy',    label: 'EFSA',         sub: 'EU Safety' },
                  ].map(({ icon, label, sub }) => (
                    <div key={label} className="minimal-card p-6 rounded-xl text-center">
                      <span className="material-symbols-outlined text-primary mb-3 block">{icon}</span>
                      <p className="font-label-md text-on-surface text-sm">{label}</p>
                      <p className="font-label-sm text-outline text-[10px] uppercase mt-1">{sub}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* CTAs */}
              <section className="flex flex-col md:flex-row items-center justify-center gap-md py-lg border-t border-outline-variant/20">
                <button
                  id="back-button"
                  onClick={resetToHome}
                  className="primary-gradient text-white px-10 py-4 rounded-xl font-label-md shadow-sm active:scale-95"
                >
                  Verify Another Rumor
                </button>
                <button className="bg-surface-container-lowest border border-outline-variant text-on-surface px-10 py-4 rounded-xl font-label-md hover:bg-surface-container transition-all active:scale-95">
                  Share Full Report
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
