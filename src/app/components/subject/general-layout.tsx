"use client";

import { ReactNode, useState, useEffect, lazy, Suspense, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserSubject } from "@/types/subjectsTypes";
import {
  Menu,
  BookMinus,
  Notebook,
  SquareLibrary,
  Bot,
  ChartNoAxesColumn,
  FileText,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import Link from "next/link";

// Dynamic imports for non-critical components
const SubjectSidebar = lazy(
  () => import("@/app/components/shared/navigation/subject-sidebar")
);
const ThemeToggle = lazy(() =>
  import("@/app/components/shared/theme/themeToggle").then((mod) => ({
    default: mod.ThemeToggle,
  }))
);

// Navigation links function that takes subject slug as parameter
export const getNavLinks = (subjectSlug: string, maturita: boolean = true) => {
  const baseLinks = [
    {
      name: "I miei appunti",
      href: `/${subjectSlug}`,
      icon: FileText,
    },
    {
      name: "Pit",
      href: `/${subjectSlug}/pit`,
      icon: Bot,
    },
    {
      name: "Statistiche",
      href: `/${subjectSlug}/statistiche`,
      icon: ChartNoAxesColumn,
    },
  ];

  // Only add Maturità section if maturita is true
  const maturitaLinks = maturita
    ? [
        {
          type: "divider" as const,
          label: "Maturità",
        },
        {
          name: "Teoria",
          href: `/${subjectSlug}/teoria`,
          icon: BookMinus,
        },
        {
          name: "Esercizi",
          href: `/${subjectSlug}/esercizi`,
          icon: Notebook,
        },
        {
          name: "Simulazioni",
          href: `/${subjectSlug}/simulazioni`,
          icon: SquareLibrary,
        },
      ]
    : [];

  return [...baseLinks, ...maturitaLinks];
};

export default function GeneralLayout({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [currentSubject, setCurrentSubject] = useState<UserSubject | null>(
    null
  );
  const { data: session } = useSession();
  const router = useRouter();
  const params = useParams();

  // Get the current subject slug from params
  const subjectSlug = (params?.["subject-slug"] as string) || "";

  // Generate navigation links based on current subject slug and the subject's maturita field
  // Recompute when either the slug or the maturita flag changes
  const navLinks = useMemo(() => {
    if (!subjectSlug) return [];
    return getNavLinks(subjectSlug, Boolean(currentSubject?.maturita));
  }, [subjectSlug, currentSubject?.maturita]);

  // Fetch current subject data when slug changes
  useEffect(() => {
    const fetchCurrentSubject = async () => {
      if (session?.user?.id && subjectSlug) {
        try {
          const response = await fetch(`/api/subjects/${subjectSlug}`);
          if (response.ok) {
            const subject = await response.json();
            setCurrentSubject(subject);
          } else {
            console.warn(
              `Failed to fetch subject ${subjectSlug}:`,
              response.status
            );
            setCurrentSubject(null);
          }
        } catch (error) {
          console.error("Error fetching current subject:", error);
          setCurrentSubject(null);
        }
      } else {
        setCurrentSubject(null);
      }
    };

    // Only fetch if session is fully loaded
    if (session !== undefined) {
      fetchCurrentSubject();
    }
  }, [session, subjectSlug]);

  // Prevent hydration errors by only rendering on client side
  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <>
      {/* Fixed desktop sidebar to guarantee stickiness across all pages */}
      <div className="hidden md:block fixed top-0 left-0 h-screen z-40">
        <Suspense
          fallback={
            <div className="bg-background h-screen w-[280px] border-r" />
          }
        >
          <SubjectSidebar
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            onItemClick={() => {}}
            navLinks={navLinks}
            currentSubject={currentSubject}
          />
        </Suspense>
      </div>

      {/* Content area shifted by sidebar width on desktop */}
      <section className="min-h-screen w-full bg-background">
        <div
          className={cn(
            "flex flex-col bg-background",
            collapsed ? "md:ml-[64px]" : "md:ml-[240px]"
          )}
        >
          <div className="bg-background sticky top-0 z-30">
            <header className="flex h-14 items-center gap-4 px-6 lg:h-[60px] lg:px-6 border-b">
              {/* Theme toggle on mobile - placed where the logo was */}
              <div className="md:hidden">
                <Suspense fallback={<div className="h-8 w-8" />}>
                  <ThemeToggle />
                </Suspense>
              </div>
              <div className="ml-auto flex items-center gap-x-4">
                {/* Only show theme toggle on desktop */}
                <div className="hidden md:flex items-center gap-x-4">
                  <ThemeToggle />
                  <Link href="/dashboard">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <span className="text-sm">Torna alla dashboard</span>
                      <ArrowRight size={16} />
                    </Button>
                  </Link>
                </div>

                {/* Mobile hamburger menu on the right */}
                <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                  <SheetTrigger asChild className="md:hidden block">
                    <Button
                      variant="ghost"
                      className="align-end items-end flex px-0 py-4 pl-5 h-auto"
                    >
                      <Menu style={{ width: "20px", height: "20px" }} />
                      <span className="sr-only">Menu</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="p-0 w-[300px] border-l">
                    <SheetTitle className="sr-only">Navigation Menu</SheetTitle>{" "}
                    <SheetDescription className="sr-only">
                      Application navigation links
                    </SheetDescription>
                    <div className="flex h-full flex-col">
                      <Suspense
                        fallback={
                          <div className="h-full w-full flex justify-center items-center">
                            Loading...
                          </div>
                        }
                      >
                        <SubjectSidebar
                          collapsed={false}
                          setCollapsed={() => {}}
                          onItemClick={() => setMobileMenuOpen(false)}
                          isMobile={true}
                          navLinks={navLinks}
                          currentSubject={currentSubject}
                        />
                      </Suspense>
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </header>
          </div>
          <main className="flex flex-1 flex-col">{children}</main>
        </div>
      </section>
    </>
  );
}
