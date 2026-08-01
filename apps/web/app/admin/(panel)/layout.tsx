import { AdminSidebar } from '@/components/admin/AdminSidebar';

export const dynamic = 'force-dynamic';

export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cartistry-bg">
      <AdminSidebar />
      <div className="ml-56 min-h-screen">{children}</div>
    </div>
  );
}
