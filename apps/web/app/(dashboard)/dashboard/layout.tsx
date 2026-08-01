import { Sidebar } from '@/components/dashboard/Sidebar';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cartistry-bg">
      <Sidebar />
      <div className="ml-56 min-h-screen">{children}</div>
    </div>
  );
}
