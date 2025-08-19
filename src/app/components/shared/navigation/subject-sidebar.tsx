"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  LogOut,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "next-auth/react";
import type { UserSubject } from "@/types/subjectsTypes";
import { getSubjectIcon } from "@/utils/subject-icons";

// Define the navigation link type
type NavLink =
  | {
      name: string;
      href: string;
      icon: React.ComponentType<any>;
      type?: undefined;
      label?: undefined;
    }
  | {
      type: "divider";
      label: string;
      name?: undefined;
      href?: undefined;
      icon?: undefined;
    };

interface SidebarProps {
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
  onItemClick?: () => void;
  isMobile?: boolean;
  navLinks: NavLink[];
  currentSubject?: UserSubject | null;
}

export default function SubjectSidebar({
  collapsed,
  setCollapsed,
  onItemClick,
  isMobile = false,
  navLinks,
  currentSubject,
}: SidebarProps) {
  const { data: session } = useSession();
  const user = session?.user;
  const router = useRouter();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);
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

  const handleSubscribeClick = () => {
    router.push("/pricing");
  };

  // Function to check if a link should be active based on the current pathname
  const isLinkActive = (href: string): boolean => {
    // Get the current subject slug from href (first part after /)
    const subjectSlug = href.split("/")[1];

    // For the base subject page (e.g., "/matematica"), only match exactly
    if (href === `/${subjectSlug}`) {
      return pathname === href;
    }

    // For sub-pages (e.g., "/matematica/tutor"), check if pathname matches exactly
    // or starts with the href followed by a "/"
    return pathname === href || pathname.startsWith(href + "/");
  };

  // Mock user subscription data
  const subscriptionData = {
    plan: "Free",
    simulationsLeft: 3,
    aiCredits: 20,
  };

  // Handle navigation with mobile menu closing
  const handleMobileItemClick = (href: string, name: string) => {
    if (onItemClick) {
      onItemClick();
    }
    router.push(href);
  };

  // Get first letter of name or email for avatar fallback
  const getAvatarFallback = () => {
    if (user?.name) return user.name[0];
    if (user?.email) return user.email[0];
    return "U";
  };

  // Get user's full name or email
  const getUserDisplayName = () => {
    if (user?.name) return user.name;
    if (user?.email) return user.email;
    return "";
  };

  // Handle client-side mounting to prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Set CSS custom properties for dynamic theming
  useEffect(() => {
    if (currentSubject?.color) {
      document.documentElement.style.setProperty(
        "--subject-color",
        currentSubject.color
      );
      // Set as primary color for dynamic theming
      document.documentElement.style.setProperty(
        "--color-primary",
        currentSubject.color
      );
    } else {
      // Reset to defaults when no subject
      document.documentElement.style.removeProperty("--subject-color");
      document.documentElement.style.removeProperty("--color-primary");
    }
  }, [currentSubject?.color]);

  return (
    <div
      className={cn(
        "flex flex-col border-r bg-background",
        isMobile ? "h-full" : "h-screen sticky top-0 left-0"
      )}
    >
      {/* Logo */}
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] justify-between">
        {!collapsed ? (
          <div>
            {currentSubject ? (
              <span className="flex items-center gap-2">
                {(() => {
                  const Icon = getSubjectIcon(currentSubject.name);
                  return Icon ? (
                    <Icon
                      className="h-6 w-6"
                      style={{ color: `${currentSubject.color}90` }}
                    />
                  ) : null;
                })()}
                <span
                  className="font-semibold transition-colors text-2xl"
                  style={{ color: currentSubject.color }}
                >
                  {currentSubject.name}
                </span>
              </span>
            ) : (
              navLinks.length > 0 && (
                // Show loading state when we have navLinks (indicates we're in a subject page)
                <span className="text-muted-foreground animate-pulse">...</span>
              )
            )}
          </div>
        ) : (
          <span
            className="w-full text-center text-2xl font-bold transition-colors"
            style={{
              color: currentSubject?.color || "var(--color-primary)",
            }}
          >
            {currentSubject
              ? (() => {
                  const Icon = getSubjectIcon(currentSubject.name);
                  return Icon ? (
                    <Icon
                      className="h-6 w-6"
                      style={{ color: `${currentSubject.color}90` }}
                    />
                  ) : null;
                })()
              : navLinks.length > 0 && (
                  // Show loading state when we have navLinks (indicates we're in a subject page)
                  <span className="text-muted-foreground animate-pulse">
                    ...
                  </span>
                )}
          </span>
        )}
      </div>

      {/* User Profile Section */}
      <div
        className={cn("p-4 border-b", collapsed ? "flex justify-center" : "")}
      >
        {!collapsed ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {user?.image ? (
                  <AvatarImage
                    src={user.image}
                    alt={getUserDisplayName()}
                    onError={(e) => {
                      // On error, hide the image and let the fallback show
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : null}
                <AvatarFallback className="bg-primary/10">
                  {getAvatarFallback()}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-muted-foreground truncate max-w-[160px]">
                  {user?.email || ""}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className="px-2 py-1 text-xs bg-foreground/5 border-foreground/10 text-foreground"
              >
                {subscriptionData.plan}
              </Badge>

              {isMobile ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={handleSettingsClick}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleSettingsClick}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Impostazioni</span>
                    </DropdownMenuItem>

                    {/* Only show subscribe option if user doesn't have an active subscription */}
                    {!isLoading && !hasSubscription && (
                      <DropdownMenuItem onClick={handleSubscribeClick}>
                        <Sparkles className="mr-2 h-4 w-4" />
                        <span>Iscriviti subito</span>
                      </DropdownMenuItem>
                    )}

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={() => signOut()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Esci</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        ) : (
          <TooltipProvider>
            {isMobile ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar
                    className="h-10 w-10 cursor-pointer"
                    onClick={handleSettingsClick}
                  >
                    {user?.image ? (
                      <AvatarImage
                        src={user.image}
                        alt={getUserDisplayName()}
                        onError={(e) => {
                          // On error, hide the image and let the fallback show
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary/10">
                      {getAvatarFallback()}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="text-xs font-medium">
                    {getUserDisplayName()}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {subscriptionData.plan}
                  </div>
                </TooltipContent>
              </Tooltip>
            ) : (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-10 w-10 cursor-pointer">
                    {user?.image ? (
                      <AvatarImage
                        src={user.image}
                        alt={getUserDisplayName()}
                        onError={(e) => {
                          // On error, hide the image and let the fallback show
                          e.currentTarget.style.display = "none";
                        }}
                      />
                    ) : null}
                    <AvatarFallback className="bg-primary/10">
                      {getAvatarFallback()}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" side="right" className="w-48">
                  <DropdownMenuItem onClick={handleSettingsClick}>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem onClick={() => signOut()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </TooltipProvider>
        )}
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4">
        <nav className="grid items-start gap-2 relative w-full">
          {navLinks.length === 0 ? (
            // Show loading state when navLinks is empty
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Caricamento...</p>
            </div>
          ) : (
            navLinks.map((link, index) => {
              if (link.type === "divider") {
                return (
                  <div key={index} className="relative mt-6">
                    {!collapsed && (
                      <>
                        <div className="px-2 flex flex-col w-full">
                          <p className="text-xs font-medium text-muted-foreground ">
                            {link.label}
                          </p>
                          <Separator className="my-2" />
                        </div>
                      </>
                    )}
                    {collapsed && <Separator className="my-4" />}
                  </div>
                );
              }

              if (link.href && link.icon) {
                const Icon = link.icon;

                return (
                  <TooltipProvider key={index}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {isMobile ? (
                          // For mobile, we need to close the menu on navigation
                          <div
                            onClick={() =>
                              handleMobileItemClick(link.href!, link.name)
                            }
                            className={cn(
                              "flex items-center gap-2 py-2 px-3 rounded-md text-sm transition-colors cursor-pointer relative w-full",
                              isLinkActive(link.href)
                                ? "bg-accent font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                              link.href === "/dashboard/coming-soon" &&
                                "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )}
                            style={
                              isLinkActive(link.href) && currentSubject?.color
                                ? { color: currentSubject.color }
                                : {}
                            }
                          >
                            <Icon className="h-5 w-5" />
                            {!collapsed && <span>{link.name}</span>}
                          </div>
                        ) : (
                          // For desktop, we can use Link directly
                          <Link
                            href={link.href}
                            className={cn(
                              "flex items-center gap-2 py-2 px-3 rounded-md text-sm transition-colors cursor-pointer relative w-full",
                              isLinkActive(link.href)
                                ? "bg-accent font-medium"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                              link.href === "/dashboard/coming-soon" &&
                                "bg-transparent text-muted-foreground hover:text-foreground hover:bg-accent/50"
                            )}
                            style={
                              isLinkActive(link.href) && currentSubject?.color
                                ? { color: currentSubject.color }
                                : {}
                            }
                          >
                            <Icon className="h-5 w-5" />
                            {!collapsed && <span>{link.name}</span>}
                          </Link>
                        )}
                      </TooltipTrigger>
                    </Tooltip>
                  </TooltipProvider>
                );
              }

              return null;
            })
          )}
        </nav>
      </div>

      {isMobile && isMounted && (
        <div className="mx-2 flex mb-8 px-4">
          <Link href="/dashboard" className="w-full">
            <Button
              variant="outline"
              className="flex items-center gap-2 cursor-pointer w-full justify-between"
            >
              <span className="text-sm">Torna alla dashboard</span>
              <ArrowRight size={16} />
            </Button>
          </Link>
        </div>
      )}

      {/* Collapse button - hide on mobile */}
      {!isMobile && (
        <div className="border-t p-2 flex justify-end pr-4">
          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "transition-all text-muted-foreground",
              collapsed ? "h-8 w-8" : "gap-2"
            )}
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span className="text-xs">Comprimi</span>
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
