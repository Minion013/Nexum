import { redirect } from 'next/navigation';

export default function NewContractReviewTermsRoute() {
  redirect('/contracts/new/choose-person');
}
