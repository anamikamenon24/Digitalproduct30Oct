import { Compass } from 'lucide-react'
import { Page } from '../components/Motion'
import EmptyState from '../components/EmptyState'

export default function NotFound() {
  return (
    <Page className="section pt-10">
      <EmptyState icon={Compass} title="This page wandered off" text="The link might be broken, or the page has moved. Let's get you back to the good stuff." action="Back to the shop" />
    </Page>
  )
}
