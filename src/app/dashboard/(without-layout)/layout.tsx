import { GeneralNavbar } from "../../components/shared/navigation/general-navbar";
import DashboardFooter from "../../components/shared/navigation/footer";

export default function DashboardMaturamenteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-16 md:gap-24 h-screen">
      <div className="mb-10">
        <GeneralNavbar variant="dashboard" />
      </div>
      <div>{children}</div>
    </div>
  );
}
