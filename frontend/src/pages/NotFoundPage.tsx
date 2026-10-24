import { MdOutlineExplore } from 'react-icons/md'
import { Link } from 'react-router-dom'
import { PageContainer } from '../components/ui/Page'
import { EmptyState } from '../components/ui/States'

export function NotFoundPage() {
  return (
    <PageContainer>
      <EmptyState
        icon={MdOutlineExplore}
        title="This page doesn’t exist"
        description="The link may be broken or the page may have moved. Head back to your dashboard to keep going."
        action={<Link to="/" className="inline-flex h-10 items-center rounded-md bg-brand-600 px-4 font-semibold text-white shadow-xs hover:bg-brand-700 focus-ring">Go to dashboard</Link>}
      />
    </PageContainer>
  )
}
