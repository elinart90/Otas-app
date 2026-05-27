import { PageHeader } from '@/components/layout/dashboard-bits';
import { ProposalForm } from '@/components/projects/proposal-form';

export default function NewProposalPage() {
  return (
    <>
      <PageHeader
        title="Submit a proposal"
        subtitle="Complete the form below. Your title is checked against the institutional archive as you type."
      />
      <ProposalForm />
    </>
  );
}
