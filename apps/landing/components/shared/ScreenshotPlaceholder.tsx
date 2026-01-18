import Image from 'next/image'
import { cn } from '@/lib/utils'

interface ScreenshotPlaceholderProps {
  className?: string
  title?: string
  src?: string
  alt?: string
}

export function ScreenshotPlaceholder({
  className,
  title = 'Incito',
  src,
  alt = 'Incito screenshot'
}: ScreenshotPlaceholderProps) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900',
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={1920}
          height={1200}
          className="w-full h-auto"
          priority
        />
      ) : (
        <>
          {/* macOS window chrome */}
          <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <div className="h-3 w-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 text-center text-sm text-gray-500 dark:text-gray-400">
              {title}
            </div>
            <div className="w-14" />
          </div>
          {/* Placeholder content */}
          <div className="aspect-[16/10] bg-gradient-to-br from-gray-50 to-gray-100 p-8 dark:from-gray-800 dark:to-gray-900">
            <div className="flex h-full gap-4">
              {/* Sidebar placeholder */}
              <div className="w-48 space-y-2 rounded-lg bg-white/50 p-3 dark:bg-gray-800/50">
                <div className="h-4 w-3/4 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-full rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="h-4 w-full rounded bg-primary-200 dark:bg-primary-900" />
                <div className="h-4 w-1/2 rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              {/* Main content placeholder */}
              <div className="flex-1 space-y-3 rounded-lg bg-white/50 p-4 dark:bg-gray-800/50">
                <div className="h-6 w-1/3 rounded bg-gray-300 dark:bg-gray-600" />
                <div className="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-4 space-y-2">
                  <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
                  <div className="h-3 w-4/5 rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
              {/* Right panel placeholder */}
              <div className="w-56 space-y-3 rounded-lg bg-white/50 p-3 dark:bg-gray-800/50">
                <div className="h-5 w-1/2 rounded bg-gray-300 dark:bg-gray-600" />
                <div className="space-y-2">
                  <div className="h-8 w-full rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-8 w-full rounded bg-gray-100 dark:bg-gray-800" />
                  <div className="h-8 w-full rounded bg-gray-100 dark:bg-gray-800" />
                </div>
                <div className="mt-4 h-10 w-full rounded bg-primary-500" />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
