"use client";
import {
  Navbar,
  NavBody,
  MobileNav,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Logo = () => {
  return (
    <Link href="/" className="relative z-20 mr-4 flex items-center px-2 py-1">
      <span className="font-extrabold text-xl text-blue-900 dark:text-primary">
        Matura
      </span>
      <span className="font-extrabold text-xl text-primary dark:text-blue-400">
        Mente
      </span>
    </Link>
  );
};

// Simple, reliable theme toggle component
const ThemeToggle = () => {
  // Use regular DOM manipulation for theme toggle
  const handleClick = () => {
    if (typeof window === "undefined" || typeof document === "undefined")
      return;

    // Get and toggle the current dark mode state
    const isDarkMode = document.documentElement.classList.contains("dark");
    const newDarkMode = !isDarkMode;

    // Apply the change to the document
    if (newDarkMode) {
      document.documentElement.classList.add("dark");
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("theme", "dark");
      }
    } else {
      document.documentElement.classList.remove("dark");
      if (typeof localStorage !== "undefined") {
        localStorage.setItem("theme", "light");
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className="relative flex h-10 w-10 items-center justify-center rounded-full"
      title="Toggle dark mode"
    >
      {/* Always show both icons with visibility controlled by CSS */}
      <Sun className="absolute h-5 w-5 text-gray-800 transition-opacity duration-300 opacity-100 dark:opacity-0" />
      <Moon className="absolute h-5 w-5 transition-opacity duration-300 opacity-0 dark:opacity-100" />
    </button>
  );
};

// Define the scroll handler component for landing page
const ScrollLink = ({
  href,
  children,
  section,
  onClick = () => {},
  className = "",
}: {
  href: string;
  children: React.ReactNode;
  section: string;
  onClick?: () => void;
  className?: string;
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Call any additional onClick handler
    onClick();

    console.log(`Trying to scroll to section: ${section}`);

    if (typeof window === "undefined") return;

    if (section === "top") {
      console.log("Scrolling to top");
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
      return;
    }

    // Try to find the element
    if (typeof document === "undefined") return;

    const element = document.getElementById(section);

    if (element) {
      console.log(`Found element with id ${section}, scrolling now`);
      element.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    } else {
      console.error(`Element with id "${section}" not found`);
      // Show all available ids for debugging
      const allIds = Array.from(document.querySelectorAll("[id]")).map(
        (el) => el.id
      );
      console.log("Available IDs on page:", allIds);
    }
  };

  return (
    <a href={href} onClick={handleClick} className={className}>
      {children}
    </a>
  );
};

// User Avatar Dropdown component for dashboard
const UserAvatarDropdown = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;
  const [hasSubscription, setHasSubscription] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check subscription status on component mount
  useEffect(() => {
    const checkSubscription = async () => {
      if (!user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/user/subscription-status");
        if (response.ok) {
          const data = await response.json();
          setHasSubscription(data?.isActive || false);
        } else {
          setHasSubscription(false);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
        setHasSubscription(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkSubscription();
  }, [user?.id]);

  const handleSettingsClick = () => {
    router.push("/dashboard/settings");
  };

  // Get first letter of name or email for avatar fallback
  const getAvatarFallback = () => {
    if (user?.name) return user.name[0];
    if (user?.email) return user.email[0];
    return "U";
  };

  return (
    <Avatar className="h-10 w-10 cursor-pointer ring-1 ring-foreground/10">
      {user?.image ? (
        <AvatarImage
          src={user.image}
          alt={user?.name || user?.email || "User"}
          onError={(e) => {
            // On error, hide the image and let the fallback show
            e.currentTarget.style.display = "none";
          }}
          onClick={handleSettingsClick}
        />
      ) : null}
      <AvatarFallback className="bg-primary">
        {getAvatarFallback()}
      </AvatarFallback>
    </Avatar>
  );
};

interface NavbarProps {
  variant?: "landing" | "dashboard";
}

/**
 * General purpose navbar component that can be used across different pages
 *
 * @param variant - "landing" (default) for landing page with scroll links and login/dashboard button
 *                  "dashboard" for dashboard pages with navigation links and user avatar dropdown
 *
 * Examples:
 * - Landing page: <GeneralNavbar variant="landing" /> or <GeneralNavbar />
 * - Dashboard page: <GeneralNavbar variant="dashboard" />
 */

export function GeneralNavbar({ variant = "landing" }: NavbarProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleDashboardClick = () => {
    router.push("/dashboard");
  };

  // Initialize dark mode on mount
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      typeof document === "undefined" ||
      typeof localStorage === "undefined"
    )
      return;

    // Check localStorage or system preference
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;

    // Set initial state
    if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Add scroll listener effect
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener("scroll", handleScroll);

    // Initialize on mount
    handleScroll();

    // Clean up
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  const navbarClass = cn(
    "bg-white dark:bg-background shadow-md",
    isScrolled &&
      "border-b border-muted-foreground/20 dark:border-muted transition-all duration-300"
  );

  // Check if a dashboard link is active
  const isLinkActive = (href: string): boolean => {
    if (href === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Dashboard navigation links
  const dashboardLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/dashboard/le-mie-materie", label: "Le mie materie" },
    { href: "/dashboard/chat", label: "PIT" },
  ];

  return (
    <div className="w-full fixed top-0 z-50">
      <div className="absolute w-full top-5 z-50">
        <Navbar disableShrink>
          {/* Desktop Navigation */}
          <NavBody className={navbarClass}>
            <Logo />

            {/* Navigation links - different for landing vs dashboard */}
            <div className="hidden md:flex items-center space-x-6">
              {variant === "landing" ? (
                <>
                  <ScrollLink
                    href="/"
                    section="top"
                    className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary"
                  >
                    Home
                  </ScrollLink>
                  <ScrollLink
                    href="#features"
                    section="features"
                    className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary"
                  >
                    Features
                  </ScrollLink>
                  <ScrollLink
                    href="#faq"
                    section="faq"
                    className="text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary"
                  >
                    FAQ
                  </ScrollLink>
                </>
              ) : (
                <>
                  {dashboardLinks.map((link) => {
                    const isActive = isLinkActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        className={cn(
                          "text-gray-700 dark:text-gray-300 hover:text-primary dark:hover:text-primary transition-colors",
                          isActive && "font-bold text-primary dark:text-primary"
                        )}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </>
              )}
            </div>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              {variant === "dashboard" && status === "authenticated" ? (
                <UserAvatarDropdown />
              ) : (
                <>
                  {status === "loading" ? (
                    <NavbarButton variant="secondary" disabled>
                      Loading...
                    </NavbarButton>
                  ) : session ? (
                    <>
                      <NavbarButton
                        variant="secondary"
                        onClick={handleDashboardClick}
                      >
                        Dashboard
                      </NavbarButton>
                    </>
                  ) : (
                    <NavbarButton variant="primary" onClick={handleGoogleLogin}>
                      Login con Google
                    </NavbarButton>
                  )}
                </>
              )}
            </div>
          </NavBody>

          {/* Mobile Navigation */}
          <MobileNav className={navbarClass}>
            <MobileNavHeader>
              <div className="pl-4">
                <Logo />
              </div>
              <div className="flex items-center gap-2 pr-8">
                <ThemeToggle />
                <MobileNavToggle
                  isOpen={isMobileMenuOpen}
                  onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                />
              </div>
            </MobileNavHeader>

            <MobileNavMenu
              isOpen={isMobileMenuOpen}
              onClose={() => setIsMobileMenuOpen(false)}
              className="bg-white dark:bg-neutral-900 text-gray-800 dark:text-gray-200"
            >
              {variant === "landing" ? (
                <>
                  <ScrollLink
                    href="/"
                    section="top"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="relative text-gray-700 dark:text-gray-300 block py-2"
                  >
                    <span className="block">Home</span>
                  </ScrollLink>

                  <ScrollLink
                    href="#features"
                    section="features"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="relative text-gray-700 dark:text-gray-300 block py-2"
                  >
                    <span className="block">Features</span>
                  </ScrollLink>

                  <ScrollLink
                    href="#faq"
                    section="faq"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="relative text-gray-700 dark:text-gray-300 block py-2"
                  >
                    <span className="block">FAQ</span>
                  </ScrollLink>
                </>
              ) : (
                <>
                  {dashboardLinks.map((link) => {
                    const isActive = isLinkActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className={cn(
                          "relative text-gray-700 dark:text-gray-300 block py-2 transition-colors",
                          isActive && "font-bold text-primary"
                        )}
                      >
                        <span className="block">{link.label}</span>
                      </Link>
                    );
                  })}
                </>
              )}

              <div className="flex w-full flex-col gap-4 mt-4">
                {variant === "dashboard" && status === "authenticated" ? (
                  <div className="flex justify-center">
                    <UserAvatarDropdown />
                  </div>
                ) : (
                  <>
                    {status === "loading" ? (
                      <NavbarButton
                        variant="primary"
                        className="w-full"
                        disabled
                      >
                        Loading...
                      </NavbarButton>
                    ) : session ? (
                      <>
                        <NavbarButton
                          onClick={() => {
                            router.push("/dashboard");
                            setIsMobileMenuOpen(false);
                          }}
                          variant="primary"
                          className="w-full"
                        >
                          Dashboard
                        </NavbarButton>
                      </>
                    ) : (
                      <NavbarButton
                        onClick={() => {
                          handleGoogleLogin();
                          setIsMobileMenuOpen(false);
                        }}
                        variant="primary"
                        className="w-full"
                      >
                        Login con Google
                      </NavbarButton>
                    )}
                  </>
                )}
              </div>
            </MobileNavMenu>
          </MobileNav>
        </Navbar>
      </div>
    </div>
  );
}

// Backward compatibility export
export const LandingNavbar = GeneralNavbar;
