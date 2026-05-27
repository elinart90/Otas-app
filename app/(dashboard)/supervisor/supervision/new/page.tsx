import { PageHeader } from '@/components/layout/dashboard-bits';
import { SessionForm } from '@/components/supervision/session-form';

export default function NewSessionPage({
  searchParams,
}: {
  searchParams: { project?: string };
}) {
  return (
    <>
      <PageHeader
        title="Log a supervision session"
        subtitle="Record what happened in this session. The student will see your entry on their timeline."
      />
      <SessionForm preselectProjectId={searchParams.project} />
    </>
  );
}
