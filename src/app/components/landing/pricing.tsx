"use client";

import { Section } from "@/components/ui/section";
import { User } from "lucide-react";
import {
  PricingColumn,
  PricingColumnProps,
} from "@/components/ui/pricing-column";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

interface PricingProps {
  title?: string | false;
  description?: string | false;
  className?: string;
}

export default function Pricing({
  title = "Sblocca la tua preparazione ideale.",
  description = "Scegli il piano che meglio si adatta di più alle tue esigenze. Nessun costo nascosto. Solo ciò che ti serve per superare al meglio la maturità.",
  className = "",
}: PricingProps) {
  const { data: session } = useSession();
  const router = useRouter();

  const plans: PricingColumnProps[] = [
    {
      name: "Free",
      description: "Per chi vuole iniziare a prepararsi con calma",
      price: 0,
      priceNote: "Per sempre gratuito",
      cta: {
        variant: "glow",
        label: "Inizia Gratis",
        href: "/pricing",
      },
      features: [
        "Accesso a due materie a tua scelta",
        "Accesso agli appunti delle materie selezionate",
        "Piano base generato dall'AI (interazioni limitate)",
        "Possibilità di passare al Premium in ogni momento",
      ],
      variant: "default",
    },
    {
      name: "Premium personalizzato",
      icon: <User className="size-4" />,
      description: "Per chi vuole appunti e materie complete",
      price: 5.99,
      priceNote:
        "5,99€ per la prima materia, 2,49€ per ogni materia aggiuntiva",
      cta: {
        variant: "default",
        label: "Passa al Premium",
        href: "/pricing",
      },
      features: [
        "Appunti completi e aggiornati per tutte le materie",
        "Schemi, mappe e riepiloghi pronti per il ripasso",
        "Esercizi per ogni argomento di maturità",
        "Piano di studio personalizzato su misura",
        "AI per chiarimenti sugli appunti e sugli esercizi",
        "Accesso prioritario a nuove funzionalità",
      ],
      variant: "glow-brand",
    },
  ];

  return (
    <Section id="pricing" className={cn(className)}>
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-12">
        {(title || description) && (
          <div className="flex flex-col items-center gap-4 px-4 text-center sm:gap-8">
            {title && (
              <h2 className="text-3xl leading-tight font-semibold sm:text-5xl sm:leading-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-md text-muted-foreground max-w-[600px] font-medium sm:text-xl">
                {description}
              </p>
            )}
          </div>
        )}

        <div className="hidden md:grid max-w-container mx-auto grid-cols-1 gap-8 sm:grid-cols-2">
          {/* Free plan */}
          <PricingColumn
            key={plans[0].name}
            name={plans[0].name}
            icon={plans[0].icon}
            description={plans[0].description}
            price={plans[0].price}
            priceNote={plans[0].priceNote}
            cta={plans[0].cta}
            features={plans[0].features}
            variant={plans[0].variant}
            className={plans[0].className}
          />

          {/* Premium plan */}
          <PricingColumn
            key={plans[1].name}
            name={plans[1].name}
            icon={plans[1].icon}
            description={plans[1].description}
            price={plans[1].price}
            priceNote={plans[1].priceNote}
            cta={plans[1].cta}
            features={plans[1].features}
            variant={plans[1].variant}
            className={plans[1].className}
          />
        </div>
        <div className="grid md:hidden max-w-container mx-auto grid-cols-1 gap-8">
          {/* Premium plan */}
          <PricingColumn
            key={plans[1].name}
            name={plans[1].name}
            icon={plans[1].icon}
            description={plans[1].description}
            price={plans[1].price}
            priceNote={plans[1].priceNote}
            cta={plans[1].cta}
            features={plans[1].features}
            variant={plans[1].variant}
            className={plans[1].className}
          />

          {/* Free plan */}
          <PricingColumn
            key={plans[0].name}
            name={plans[0].name}
            icon={plans[0].icon}
            description={plans[0].description}
            price={plans[0].price}
            priceNote={plans[0].priceNote}
            cta={plans[0].cta}
            features={plans[0].features}
            variant={plans[0].variant}
            className={plans[0].className}
          />
        </div>
      </div>
    </Section>
  );
}
