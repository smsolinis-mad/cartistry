import { Sidebar } from '@/components/dashboard/Sidebar';
import { SessionGate } from '@/components/auth/SessionGate';

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-paper">
      <Sidebar />
      <div className="lg:ml-60 min-h-screen">
        <SessionGate>{children}</SessionGate>
      </div>
    </div>
  );
}
