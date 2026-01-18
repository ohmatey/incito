import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ResizeHandleProps {
  side: 'left' | 'right'
  onResize: (delta: number) => void
  onResizeEnd?: () => void
  className?: string
}

export function ResizeHandle({ side, onResize, onResizeEnd, className }: ResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false)
  const startXRef = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsDragging(true)
    startXRef.current = e.clientX
  }, [])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - startXRef.current
      startXRef.current = e.clientX
      // For left side panels, positive delta = increase width
      // For right side panels, negative delta = increase width
      onResize(side === 'left' ? delta : -delta)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      onResizeEnd?.()
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    // Add cursor style to body while dragging
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, onResize, onResizeEnd, side])

  return (
    <div
      onMouseDown={handleMouseDown}
      className={cn(
        'group relative z-10 flex w-0 cursor-col-resize items-center justify-center',
        className
      )}
    >
      {/* Invisible hit area that extends beyond the zero-width container */}
      <div
        className={cn(
          'absolute inset-y-0 flex w-3 -translate-x-1/2 items-center justify-center',
          'hover:bg-blue-500/20 active:bg-blue-500/30',
          'transition-colors duration-150',
          isDragging && 'bg-blue-500/30'
        )}
      >
        <div
          className={cn(
            'h-8 w-1 rounded-full bg-gray-300 opacity-0 transition-opacity',
            'group-hover:opacity-100',
            'dark:bg-gray-600',
            isDragging && 'opacity-100 bg-blue-500 dark:bg-blue-400'
          )}
        />
      </div>
    </div>
  )
}
