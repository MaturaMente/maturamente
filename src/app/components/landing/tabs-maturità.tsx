"use client";

import { useState, useEffect, useRef } from "react";

import { ThemeImage } from "./theme-image";

export function LandingTabMaturità() {
  // Define three tab types
  type TabType = "teoria" | "esercizi" | "simulazioni";

  const [activeTab, setActiveTab] = useState<TabType>("teoria");
  const [isAutoScrolling, setIsAutoScrolling] = useState(true);
  const [animationProgress, setAnimationProgress] = useState(0);

  const autoScrollRef = useRef<NodeJS.Timeout | null>(null);
  const progressRef = useRef<NodeJS.Timeout | null>(null);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);

  // Tab content
  const tabContent = {
    teoria: {
      title: "Teoria",
      description:
        "Tutti gli argomenti di matematica spiegati in modo chiaro e organizzato: categorie, formule, grafici, immagini ed esercizi collegati.",
      lightImage:
        "https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/light/teoria.png",
      darkImage:
        "https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/dark/teoria.png",
      mobileLightImage:
        "https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/light/teoria-mobile.png",
      mobileDarkImage:
        "https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/dark/teoria-mobile.png",
    },
    esercizi: {
      title: "Esercizi",
      description:
        "Una raccolta completa di esercizi per ogni argomento, divisi per livello di difficoltà, e con la possibilità di fare domande all'AI.",
      lightImage:
        "https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/light/esercizi.png",
      darkImage:
        "https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/dark/esercizi.png",
      mobileLightImage:
        "https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/light/esercizi-mobile.png",
      mobileDarkImage:
        "https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/dark/esercizi-mobile.png",
    },
    simulazioni: {
      title: "Simulazioni",
      description:
        "Tutte le simulazioni d'esame ufficiali degli anni passati, pronte da svolgere per allenarti come se fossi il giorno della maturità.",
      lightImage:
        "https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/light/simulazioni.png",
      darkImage:
        "https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/dark/simulazioni.png",
      mobileLightImage:
        "https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/light/simulazioni-mobile.png",
      mobileDarkImage:
        "https://pmnothvdbyxdqaiyugpg.supabase.co/storage/v1/object/public/landing/dark/simulazioni-mobile.png",
    },
  };

  // Get the tab order for positioning and next tab selection
  const tabOrder: TabType[] = ["teoria", "esercizi", "simulazioni"];

  // Get the tab index (0, 1, or 2)
  const getTabIndex = (tab: TabType): number => tabOrder.indexOf(tab);

  // Get the next tab in sequence
  const getNextTab = (currentTab: TabType): TabType => {
    const currentIndex = getTabIndex(currentTab);
    const nextIndex = (currentIndex + 1) % tabOrder.length;
    return tabOrder[nextIndex];
  };

  // Controls the animation of the progress bar
  const startProgressAnimation = (nextTab: TabType) => {
    // Clear existing animation
    if (progressRef.current) clearInterval(progressRef.current);

    let progress = 0;
    setAnimationProgress(0);

    // Create a new interval to animate the progress
    progressRef.current = setInterval(() => {
      progress += 1;
      setAnimationProgress(progress);

      // When progress is complete, move to next tab
      if (progress >= 100) {
        clearInterval(progressRef.current!);
        setActiveTab(nextTab);
        setAnimationProgress(0);

        // Restart auto-scroll if enabled
        if (isAutoScrolling) {
          setTimeout(() => {
            startProgressAnimation(getNextTab(nextTab));
          }, 500); // Small pause between tabs
        }
      }
    }, 30); // Update more frequently for smoother animation
  };

  // Handle tab selection by user
  const handleTabClick = (tab: TabType) => {
    // Stop any running animations
    if (progressRef.current) clearInterval(progressRef.current);
    if (autoScrollRef.current) clearTimeout(autoScrollRef.current);
    if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);

    // Update state
    setActiveTab(tab);
    setAnimationProgress(0);
    setIsAutoScrolling(false);

    // Set a timeout to resume auto-scrolling after 5 seconds of inactivity
    resumeTimeoutRef.current = setTimeout(() => {
      setIsAutoScrolling(true);
    }, 5000);
  };

  // Watch for changes to isAutoScrolling state and restart animation when it becomes true
  useEffect(() => {
    if (isAutoScrolling && !progressRef.current) {
      const nextTab = getNextTab(activeTab);

      const timer = setTimeout(() => {
        startProgressAnimation(nextTab);
      }, 200);

      return () => clearTimeout(timer);
    }
  }, [isAutoScrolling, activeTab]);

  // Initial setup of auto-scrolling (only runs on mount)
  useEffect(() => {
    // Start auto-scrolling after initial delay
    const initialTimer = setTimeout(() => {
      if (isAutoScrolling) {
        const nextTab = getNextTab(activeTab);
        startProgressAnimation(nextTab);
      }
    }, 1000);

    // Force restart auto-scrolling every 30 seconds in case it gets stuck
    const forceRestartInterval = setInterval(() => {
      if (progressRef.current === null) {
        setIsAutoScrolling(true);
      }
    }, 30000);

    // Cleanup on unmount
    return () => {
      clearTimeout(initialTimer);
      if (autoScrollRef.current) clearTimeout(autoScrollRef.current);
      if (progressRef.current) clearInterval(progressRef.current);
      if (resumeTimeoutRef.current) clearTimeout(resumeTimeoutRef.current);
      clearInterval(forceRestartInterval);
    };
  }, []);

  // Calculate the current position and width of the progress indicator
  const calculateProgressStyle = () => {
    const tabWidth = 100 / tabOrder.length; // Width of each tab as percentage
    const currentTabIndex = getTabIndex(activeTab);

    // Base position is at the start of the current tab
    const basePosition = currentTabIndex * tabWidth;

    // Calculate how far across the tab the indicator should be
    const progressWidth = (animationProgress / 100) * tabWidth;

    return {
      left: `${basePosition}%`,
      width: `${progressWidth}%`,
    };
  };

  return (
    <div
      id="features"
      className="max-w-7xl w-full mx-auto flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8"
    >
      {/* Improved title and subtitle styling */}
      <h1 className="w-full text-center text-3xl font-bold tracking-tight text-foreground mb-6 sm:text-4xl md:text-5xl md:leading-tight">
        Maturità senza stress!{" "}
        {/* <span className="text-primary">non è semplice.</span> */}
      </h1>
      <p className="text-center max-w-3xl text-lg text-muted-foreground mb-12">
        Con MaturaMente affronti l’esame con serenità: simulazioni, spiegazioni
        chiare e strumenti su misura per arrivare preparato. Niente più caos,
        solo un percorso sicuro fino al giorno della maturità.
      </p>

      <div className="w-full flex flex-col gap-8">
        {/* Content display area */}
        <div className="bg-white dark:bg-neutral-900 rounded-lg overflow-hidden shadow-xl min-h-[400px]">
          <div className="h-full w-full p-6">
            {/* Display content based on active tab */}
            <div className="h-full bg-gray-50 dark:bg-neutral-800 rounded-lg w-full flex items-center justify-center overflow-hidden transition-all duration-300 ease-in-out p-4">
              {activeTab === "teoria" && (
                <ThemeImage
                  lightImage={tabContent.teoria.lightImage}
                  darkImage={tabContent.teoria.darkImage}
                  mobileLightImage={tabContent.teoria.mobileLightImage}
                  mobileDarkImage={tabContent.teoria.mobileDarkImage}
                  alt={tabContent.teoria.title}
                  className="w-full h-full object-contain rounded-md shadow-lg transition-transform duration-300 hover:scale-[1.02]"
                  mobileBreakpoint={768}
                  width={1200}
                  height={800}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                />
              )}
              {activeTab === "esercizi" && (
                <ThemeImage
                  lightImage={tabContent.esercizi.lightImage}
                  darkImage={tabContent.esercizi.darkImage}
                  mobileLightImage={tabContent.esercizi.mobileLightImage}
                  mobileDarkImage={tabContent.esercizi.mobileDarkImage}
                  alt={tabContent.esercizi.title}
                  className="w-full h-full object-contain rounded-md shadow-lg transition-transform duration-300 hover:scale-[1.02]"
                  mobileBreakpoint={768}
                  width={1200}
                  height={800}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                />
              )}
              {activeTab === "simulazioni" && (
                <ThemeImage
                  lightImage={tabContent.simulazioni.lightImage}
                  darkImage={tabContent.simulazioni.darkImage}
                  mobileLightImage={tabContent.simulazioni.mobileLightImage}
                  mobileDarkImage={tabContent.simulazioni.mobileDarkImage}
                  alt={tabContent.simulazioni.title}
                  className="w-full h-full object-contain rounded-md shadow-lg transition-transform duration-300 hover:scale-[1.02]"
                  mobileBreakpoint={768}
                  width={1200}
                  height={800}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
                />
              )}
            </div>
          </div>
        </div>

        {/* Tab component with animation */}
        <div ref={tabsContainerRef} className="relative w-full">
          {/* Unified border across all tabs - only visible on desktop */}
          <div className="absolute top-0 left-0 w-full h-0.5 bg-trasparent dark:bg-neutral-700 overflow-hidden hidden md:block">
            {/* Animated progress indicator */}
            <div
              className="absolute top-0 h-full bg-primary transition-all duration-300 ease-out"
              style={calculateProgressStyle()}
            />
          </div>

          {/* Tab buttons container - no gaps */}
          <div className="grid grid-cols-1 md:grid-cols-3 w-full md:border-t md:border-gray-100 dark:md:border-neutral-800">
            {/* teoria Tab */}
            <button
              onClick={() => handleTabClick("teoria")}
              className={`relative text-left p-6 transition-all duration-300 focus:outline-none md:border-r border-t md:border-t-0 border-gray-100 dark:border-neutral-800 ${
                activeTab === "teoria" ? "bg-gray-50 dark:bg-neutral-800" : ""
              }`}
            >
              {/* Mobile progress indicator - only visible on mobile */}
              <div className="absolute top-0 left-0 w-full h-0.5 bg-trasparent dark:bg-neutral-700 md:hidden">
                {activeTab === "teoria" && (
                  <div
                    className="absolute top-0 h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${animationProgress}%` }}
                  />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <h3
                  className={`font-medium text-xl ${
                    activeTab === "teoria"
                      ? "text-primary"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {tabContent.teoria.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tabContent.teoria.description}
                </p>
              </div>
            </button>

            {/* esercizi Tab */}
            <button
              onClick={() => handleTabClick("esercizi")}
              className={`relative text-left p-6 transition-all duration-300 focus:outline-none md:border-r border-t md:border-t-0 border-gray-100 dark:border-neutral-800 ${
                activeTab === "esercizi" ? "bg-gray-50 dark:bg-neutral-800" : ""
              }`}
            >
              {/* Mobile progress indicator - only visible on mobile */}
              <div className="absolute top-0 left-0 w-full h-0.5 bg-trasparent dark:bg-neutral-700 md:hidden">
                {activeTab === "esercizi" && (
                  <div
                    className="absolute top-0 h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${animationProgress}%` }}
                  />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <h3
                  className={`font-medium text-xl ${
                    activeTab === "esercizi"
                      ? "text-primary"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {tabContent.esercizi.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tabContent.esercizi.description}
                </p>
              </div>
            </button>

            {/* simulazioni Tab */}
            <button
              onClick={() => handleTabClick("simulazioni")}
              className={`relative text-left p-6 transition-all duration-300 focus:outline-none border-t md:border-t-0 border-gray-100 dark:border-neutral-800 ${
                activeTab === "simulazioni"
                  ? "bg-gray-50 dark:bg-neutral-800"
                  : ""
              }`}
            >
              {/* Mobile progress indicator - only visible on mobile */}
              <div className="absolute top-0 left-0 w-full h-0.5 bg-trasparent dark:bg-neutral-700 md:hidden">
                {activeTab === "simulazioni" && (
                  <div
                    className="absolute top-0 h-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${animationProgress}%` }}
                  />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <h3
                  className={`font-medium text-xl ${
                    activeTab === "simulazioni"
                      ? "text-primary"
                      : "text-gray-900 dark:text-gray-100"
                  }`}
                >
                  {tabContent.simulazioni.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tabContent.simulazioni.description}
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
