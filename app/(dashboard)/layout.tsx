import { AppNav } from "@/components/nav/AppNav";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-void">
      <div className="max-w-4xl mx-auto px-8 py-10">
        <AppNav />
        {children}
      </div>
    </div>
  );
}
