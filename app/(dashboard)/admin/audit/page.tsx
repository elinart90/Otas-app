import { AuditTable } from '@/components/audit/audit-table';

export default function AdminAuditPage() {
  return (
    <AuditTable
      title="Audit log"
      subtitle="Every archive document view, system-wide, ordered most recent first."
    />
  );
}
