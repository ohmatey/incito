import { cn } from '@/lib/utils'

interface SparklineProps {
  data: number[]          // Array of values (0-100 for percentages)
  width?: number
  height?: number
  strokeWidth?: number
  className?: string
  showDots?: boolean
  fillColor?: string
  strokeColor?: string
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  strokeWidth = 1.5,
  className,
  showDots = false,
  fillColor,
  strokeColor,
}: SparklineProps) {
  if (data.length === 0) {
    return (
      <div
        className={cn('flex items-center justify-center text-xs text-gray-400', className)}
        style={{ width, height }}
      >
        No data
      </div>
    )
  }

  // Handle single data point
  if (data.length === 1) {
    return (
      <svg
        width={width}
        height={height}
        className={className}
        viewBox={`0 0 ${width} ${height}`}
      >
        <circle
          cx={width / 2}
          cy={height / 2}
          r={3}
          className={cn(
            'fill-current',
            strokeColor || 'text-primary-500 dark:text-primary-400'
          )}
        />
      </svg>
    )
  }

  const padding = 2
  const chartWidth = width - padding * 2
  const chartHeight = height - padding * 2

  // Normalize data to chart coordinates
  const minValue = Math.min(...data)
  const maxValue = Math.max(...data)
  const range = maxValue - minValue || 1 // Avoid division by zero

  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * chartWidth
    const y = padding + chartHeight - ((value - minValue) / range) * chartHeight
    return { x, y }
  })

  // Create path for line
  const linePath = points
    .map((point, index) => (index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`))
    .join(' ')

  // Create path for filled area
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`

  // Determine colors based on trend
  const isPositive = data.length >= 2 && data[data.length - 1] >= data[0]
  const defaultStroke = isPositive
    ? 'text-green-500 dark:text-green-400'
    : 'text-red-500 dark:text-red-400'
  const defaultFill = isPositive
    ? 'text-green-500/10 dark:text-green-400/10'
    : 'text-red-500/10 dark:text-red-400/10'

  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox={`0 0 ${width} ${height}`}
    >
      {/* Filled area under the line */}
      {fillColor !== 'none' && (
        <path
          d={areaPath}
          className={cn('fill-current', fillColor || defaultFill)}
        />
      )}

      {/* Line */}
      <path
        d={linePath}
        fill="none"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={cn('stroke-current', strokeColor || defaultStroke)}
      />

      {/* Dots at data points */}
      {showDots &&
        points.map((point, index) => (
          <circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={2}
            className={cn('fill-current', strokeColor || defaultStroke)}
          />
        ))}

      {/* Highlight last point */}
      <circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={2.5}
        className={cn('fill-current', strokeColor || defaultStroke)}
      />
    </svg>
  )
}
