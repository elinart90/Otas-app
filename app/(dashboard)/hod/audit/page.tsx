import { AuditTable } from '@/components/audit/audit-table';

export default function HodAuditPage() {
  return (
    <AuditTable
      title="Archive access log"
      subtitle="Department-wide record of who has accessed archived projects."
    />
  );
}
