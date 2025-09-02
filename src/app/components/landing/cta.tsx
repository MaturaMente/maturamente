"use client";

import { Section } from "@/components/ui/section";
import { Button, type ButtonProps } from "@/components/ui/button";
import Glow from "@/components/ui/glow";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { signIn } from "next-auth/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface CTAButtonProps {
  href: string;
  text: string;
  variant?: ButtonProps["variant"];
  icon?: ReactNode;
  iconRight?: ReactNode;
}

interface CTAProps {
  title?: string;
  buttons?: CTAButtonProps[] | false;
  className?: string;
}

export default function Cta({
  title = "Porta la tua preparazione al livello successivo",
  buttons = [
    {
      href: "/",
      text: "Provalo gratis",
      variant: "default",
    },
  ],
  className,
}: CTAProps) {
  const { data: session } = useSession();
  const isLoggedIn = !!session?.user?.id;

  const router = useRouter();

  return (
    <Section
      className={cn("group relative overflow-hidden lg:pb-24 pb-12", className)}
    >
      <div className="max-w-container relative z-10 mx-auto flex flex-col items-center gap-6 text-center sm:gap-8">
        <h2 className="max-w-[640px] text-3xl leading-tight font-semibold sm:text-5xl sm:leading-tight">
          {title}
        </h2>
        <div className="flex justify-center gap-4 ">
          {isLoggedIn ? (
            <Button
              onClick={() => {
                router.push("/dashboard");
              }}
              variant={"default"}
              size="lg"
              className="flex items-center justify-center gap-2"
            >
              <Link href="/dashboard" className="text-white">
                Provalo subito
              </Link>
              <ArrowRightIcon className="size-3 text-white" />
            </Button>
          ) : (
            <Button
              onClick={() => {
                signIn("google", { callbackUrl: "/dashboard" });
              }}
              variant={"default"}
              size="lg"
              className="flex items-center justify-center gap-2"
            >
              <Link href="/dashboard" className="text-white">
                Vai alla dashboard
              </Link>
              <ArrowRightIcon className="size-3 text-white" />
            </Button>
          )}
        </div>
      </div>
      <div className="absolute top-0 left-0 h-full w-full translate-y-[1rem] opacity-80 transition-all duration-500 ease-in-out group-hover:translate-y-[-2rem] group-hover:opacity-100">
        <Glow variant="bottom" />
      </div>
    </Section>
  );
}
