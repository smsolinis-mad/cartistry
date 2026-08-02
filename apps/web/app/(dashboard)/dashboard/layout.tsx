import { Sidebar } from '@/components/dashboard/Sidebar';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper">
      <Sidebar />
      <div className="lg:ml-60 min-h-screen">{children}</div>
    </div>
  );
}
