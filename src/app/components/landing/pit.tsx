"use client";

import React, { useRef } from "react";
import {
  BookMinus,
  Notebook,
  SquareLibrary,
  BarChart,
  Bot,
} from "lucide-react";
import { AnimatedBeam } from "@/components/magicui/animated-beam";

export function Pit() {
  // Refs for the circles
  const containerRef = useRef<HTMLDivElement>(null);
  const centerRef = useRef<HTMLDivElement>(null);
  const leftTopRef = useRef<HTMLDivElement>(null);
  const leftBottomRef = useRef<HTMLDivElement>(null);
  const rightTopRef = useRef<HTMLDivElement>(null);
  const rightBottomRef = useRef<HTMLDivElement>(null);

  return (
    <div className="w-full bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto mb-16">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 sm:text-4xl md:text-5xl">
            Un tutor intelligente, sempre con te
          </h2>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
            Pit è il tuo Personal Intelligent Tutor. Conosce gli appunti, la
            teoria, gli esercizi, le simulazioni e le tue statistiche personali.
            Ti segue passo dopo passo, aiutandoti a prepararti al meglio per il
            tuo esame.
          </p>
        </div>

        {/* Main visualization container - exact layout as image */}
        <div
          ref={containerRef}
          className="relative h-[300px] w-full flex items-center justify-center"
        >
          <div className="relative">
            {/* Center circle with Bot - fixed position to be truly centered */}
            <div
              ref={centerRef}
              className="absolute z-10 flex items-center justify-center h-16 w-16 rounded-2xl bg-blue-500 text-background flex items-center justify-center shadow-sm"
              style={{
                left: "calc(50%)",
                top: "calc(50%)",
                transform: "translate(-50%, -50%)",
              }}
            >
              <Bot size={28} className="text-white" />
            </div>
          </div>

          {/* Left side - Top */}
          <div
            ref={leftTopRef}
            className="absolute z-10 flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-gray-100 dark:border-neutral-700"
            style={{ left: "15%", top: "30%" }}
          >
            <BookMinus size={24} className="text-primary" />
          </div>

          {/* Left side - Bottom */}
          <div
            ref={leftBottomRef}
            className="absolute z-10 flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-gray-100 dark:border-neutral-700"
            style={{ left: "15%", top: "70%" }}
          >
            <SquareLibrary size={24} className="text-primary" />
          </div>

          {/* Right side - Top */}
          <div
            ref={rightTopRef}
            className="absolute z-10 flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-gray-100 dark:border-neutral-700"
            style={{ right: "15%", top: "30%" }}
          >
            <Notebook size={24} className="text-primary" />
          </div>

          {/* Right side - Bottom */}
          <div
            ref={rightBottomRef}
            className="absolute z-10 flex items-center justify-center w-14 h-14 rounded-full bg-white dark:bg-neutral-800 shadow-sm border border-gray-100 dark:border-neutral-700"
            style={{ right: "15%", top: "70%" }}
          >
            <BarChart size={24} className="text-primary" />
          </div>

          {/* Animated beams with blue gradients */}
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={leftTopRef}
            toRef={centerRef}
            pathColor="#e5e7eb"
            pathWidth={1}
            gradientStartColor="#0066FF"
            gradientStopColor="#3498db"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={leftBottomRef}
            toRef={centerRef}
            pathColor="#e5e7eb"
            pathWidth={1}
            gradientStartColor="#0066FF"
            gradientStopColor="#3498db"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={rightTopRef}
            toRef={centerRef}
            pathColor="#e5e7eb"
            pathWidth={1}
            gradientStartColor="#0066FF"
            gradientStopColor="#3498db"
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={rightBottomRef}
            toRef={centerRef}
            pathColor="#e5e7eb"
            pathWidth={1}
            gradientStartColor="#0066FF"
            gradientStopColor="#3498db"
          />
        </div>
      </div>
    </div>
  );
}
