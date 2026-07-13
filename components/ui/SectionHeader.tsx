import Link from 'next/link'

interface SectionHeaderProps {
  title: string
  linkHref: string
  linkLabel: string
}

export default function SectionHeader({ title, linkHref, linkLabel }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
      <Link
        href={linkHref}
        className="text-primary hover:text-primary-dark font-medium text-sm flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm"
      >
        {linkLabel}
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  )
}
