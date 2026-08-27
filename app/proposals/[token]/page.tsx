import { notFound } from 'next/navigation';
import { CustomerProposalView } from '@/components/CustomerProposalView';
import { getProposalByToken } from './actions';

export const dynamic = 'force-dynamic';

interface ProposalPageProps {
  params: Promise<{ token: string }>;
}

export default async function CustomerProposalPage({ params }: ProposalPageProps) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const proposal = await getProposalByToken(token);

  if (!proposal) {
    notFound();
  }

  return <CustomerProposalView token={token} proposal={proposal} />;
}
