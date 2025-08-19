import { Section } from "@/components/ui/section";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import Link from "next/link";
import { ReactNode } from "react";

interface FAQItemProps {
  question: string;
  answer: ReactNode;
  value?: string;
}

interface FAQProps {
  title?: string;
  items?: FAQItemProps[] | false;
  className?: string;
}

export default function Faq({
  title = "Domande frequenti",
  items = [
    {
      question: "MaturaMate è davvero gratuito?",
      answer: (
        <>
          <p className="text-muted-foreground mb-4 max-w-[640px] text-balance">
            Sì! Puoi iniziare subito con il piano Free, che ti dà accesso a
            esercizi e simulazioni ufficiali limitate. Nessuna carta di credito
            richiesta.
          </p>
        </>
      ),
    },
    {
      question: "Le simulazioni sono quelle ufficiali del Ministero?",
      answer: (
        <>
          <p className="text-muted-foreground mb-4 max-w-[580px]">
            Sì! Abbiamo raccolto tutte le simulazioni ufficiali degli anni
            precedenti e le mettiamo a disposizione. La simulazione più remota
            che offriamo è quella del 2001.
          </p>
        </>
      ),
    },
    {
      question: "Come faccio a sapere se sto migliorando?",
      answer: (
        <p className="text-muted-foreground mb-4 max-w-[580px]">
          Nel piano Premium, il tuo piano di studio si aggiorna in base ai
          risultati. Vedi i tuoi progressi per argomento, con grafici chiari e
          consigli pratici su dove concentrarti.
        </p>
      ),
    },
    {
      question: "Posso usare MaturaMate anche da smartphone?",
      answer: (
        <>
          <p className="text-muted-foreground mb-4 max-w-[580px]">
            Sì! La piattaforma è ottimizzata per mobile, tablet e desktop. Puoi
            studiare ovunque tu sia. È un segreto, ma a breve sarà disponibile
            anche l'app!
          </p>
        </>
      ),
    },
  ],
  className,
}: FAQProps) {
  return (
    <Section id="faq" className={className}>
      <div className="max-w-container mx-auto flex flex-col items-center gap-8">
        <h2 className="text-center text-3xl font-semibold sm:text-5xl">
          {title}
        </h2>
        {items !== false && items.length > 0 && (
          <Accordion type="single" collapsible className="w-full max-w-[800px]">
            {items.map((item, index) => (
              <AccordionItem
                key={index}
                value={item.value || `item-${index + 1}`}
              >
                <AccordionTrigger>{item.question}</AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </div>
    </Section>
  );
}
