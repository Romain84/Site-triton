import CoachPasswordChangePrompt from '@/components/coach/CoachPasswordChangePrompt'

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <CoachPasswordChangePrompt />
      {children}
    </>
  )
}
