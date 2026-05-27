import { PageHeader } from '@/components/layout/dashboard-bits';
import { DefenseForm } from '@/components/defense/defense-form';

export default function NewDefensePage() {
  return (
    <>
      <PageHeader
        title="Schedule a defense"
        subtitle="Choose stage, project, date, venue, and panel members."
      />
      <DefenseForm />
    </>
  );
}
