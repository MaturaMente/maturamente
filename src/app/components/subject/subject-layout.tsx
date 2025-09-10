"use client";

import { ReactNode } from "react";
import DashboardFooter from "../shared/navigation/footer";

export default function SubjectLayoutClient({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <section className="grid min-h-screen w-full">
        <div className="flex flex-col md:w-auto w-screen">
          <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-10">
            <div className="pointer-events-none absolute -top-24 left-1/2 h-32 w-full max-w-[960px] -translate-x-1/2 rounded-[50%] bg-[var(--subject-color)]/20 blur-[72px]" />
            {children}
          </main>
          <DashboardFooter />
        </div>
      </section>
    </>
  );
}
