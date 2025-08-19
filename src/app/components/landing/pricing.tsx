"use client";

import { Section } from "@/components/ui/section";
import { User } from "lucide-react";
import {
  PricingColumn,
  PricingColumnProps,
} from "@/components/ui/pricing-column";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { Label } from "@/components/ui/label";

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
  const [isQuarterly, setIsQuarterly] = useState(false);

  const monthlyPrice = 14.99;
  const quarterlyPrice = 39.99;

  const plans: PricingColumnProps[] = [
    {
      name: "Free",
      description: "Per chi vuole iniziare a prepararsi con calma",
      price: 0,
      priceNote: "Per sempre gratuito",
      cta: {
        variant: "glow",
        label: "Inizia gratis",
        href: "/",
      },
      features: [
        "Accesso limitato a simulazioni ufficiali",
        "Esercizi giornalieri",
        "Piano base generato dall'AI (interazioni limitate)",
        "Possibilità di passare al Premium in ogni momento",
      ],
      variant: "default",
    },
    {
      name: "Premium",
      icon: <User className="size-4" />,
      description: "Per chi sceglie di prepararsi in modo completo",
      price: isQuarterly ? quarterlyPrice : monthlyPrice,
      priceNote: isQuarterly
        ? "Pagamento ogni 3 mesi. Annulla in ogni momento."
        : "Pagamento mensile. Annulla in ogni momento.",
      cta: {
        variant: "default",
        label: "Passa al Premium",
        href: "/",
      },
      features: [
        `Accesso illimitato a tutte le simulazioni ufficiali`,
        `Esercizi senza limiti per ogni argomento`,
        `Piano di studio personalizzato su misura`,
        `AI avanzata (Reasoning model) per spiegazioni più approfondite e complete`,
        `Conversazioni giornaliere con l'AI base fino a 10× più estese`,
        `Accesso prioritario a nuove funzionalità`,
      ],
      variant: "glow-brand",
    },
  ];

  // Pricing toggle component
  const PricingToggle = () => (
    <div className="flex items-center justify-center gap-2 mb-4">
      <Label
        htmlFor="pricing-toggle"
        className={!isQuarterly ? "font-medium" : "text-muted-foreground"}
      >
        Monthly
      </Label>
      <Switch
        id="pricing-toggle"
        checked={isQuarterly}
        onCheckedChange={setIsQuarterly}
      />
      <Label
        htmlFor="pricing-toggle"
        className={isQuarterly ? "font-medium" : "text-muted-foreground"}
      >
        3-Month
      </Label>
    </div>
  );

  return (
    <Section id="prezzi" className={cn(className)}>
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

        {/* Toggle visible on desktop */}
        <div className="hidden sm:block w-full">
          <PricingToggle />
        </div>

        <div className="max-w-container mx-auto grid grid-cols-1 gap-8 sm:grid-cols-2">
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

          {/* Toggle visible only on mobile between plans */}
          <div className="sm:hidden w-full flex justify-center my-4">
            <PricingToggle />
          </div>

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
      </div>
    </Section>
  );
}
