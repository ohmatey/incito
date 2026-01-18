import { cn } from '@/lib/utils'

interface LogoProps {
  className?: string
  size?: number
}

export function Logo({ className, size = 32 }: LogoProps) {
  return (
    <svg
      viewBox="0 0 512 512"
      fill="none"
      width={size}
      height={size}
      className={cn('text-primary-500', className)}
    >
      <path
        d="M33.346 427.526L253.376 84.4732L478.654 427.527M33.346 427.526L478.654 427.527M33.346 427.526L253.274 339.649L478.654 427.527M253.274 92.0396V339.882"
        stroke="currentColor"
        strokeWidth="31.3647"
      />
    </svg>
  )
}
