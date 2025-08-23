import { GeneralNavbar } from "../../components/shared/navigation/general-navbar";
import DashboardFooter from "../../components/shared/navigation/footer";

export default function DashboardMaturamenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex h-screen flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/15 via-transparent to-transparent" />
        <div className="absolute -top-24 left-1/2 h-40 w-[90%] -translate-x-1/2 rounded-[50%] bg-blue-500/25 dark:bg-blue-400/25 blur-[80px]" />
      </div>
      <div className="shrink-0">
        <GeneralNavbar variant="dashboard" />
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
