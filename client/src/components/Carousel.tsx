import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { motion, useMotionValue, useTransform } from 'motion/react'
import './Carousel.css'

export type CarouselSlide = {
  id: number | string
  title?: string
  description?: string
  icon?: ReactNode
  content?: ReactNode
}

const DEFAULT_ITEMS: CarouselSlide[] = [
  { title: 'Your Plant', description: 'Income and savings.', id: 1 },
  { title: 'Essentials', description: 'What you have to cover.', id: 2 },
]

const DRAG_BUFFER = 0
const VELOCITY_THRESHOLD = 500
const GAP = 16
const SPRING_OPTIONS = { type: 'spring' as const, stiffness: 300, damping: 30 }

function CarouselItem({
  item,
  index,
  itemWidth,
  round,
  trackItemOffset,
  x,
  transition,
}: {
  item: CarouselSlide
  index: number
  itemWidth: number
  round: boolean
  trackItemOffset: number
  x: ReturnType<typeof useMotionValue<number>>
  transition: typeof SPRING_OPTIONS | { duration: number }
}) {
  const range = [-(index + 1) * trackItemOffset, -index * trackItemOffset, -(index - 1) * trackItemOffset]
  const outputRange = [90, 0, -90]
  const rotateY = useTransform(x, range, outputRange, { clamp: false })

  return (
    <motion.div
      className={`carousel-item ${round ? 'round' : ''}`}
      style={{
        width: itemWidth,
        height: round ? itemWidth : '100%',
        rotateY,
        ...(round && { borderRadius: '50%' }),
      }}
      transition={transition}
    >
      <div className={`carousel-item-header ${round ? 'round' : ''}`}>
        {item.icon && <span className="carousel-icon-container">{item.icon}</span>}
      </div>
      <div className="carousel-item-content">
        {item.title && <div className="carousel-item-title">{item.title}</div>}
        {item.content ? item.content : <p className="carousel-item-description">{item.description}</p>}
      </div>
    </motion.div>
  )
}

export function Carousel({
  items = DEFAULT_ITEMS,
  baseWidth = 300,
  autoplay = false,
  autoplayDelay = 3000,
  pauseOnHover = false,
  loop = false,
  round = false,
  swipe = true,
  index,
  onIndexChange,
}: {
  items?: CarouselSlide[]
  baseWidth?: number
  autoplay?: boolean
  autoplayDelay?: number
  pauseOnHover?: boolean
  loop?: boolean
  round?: boolean
  swipe?: boolean
  index?: number
  onIndexChange?: (index: number) => void
}) {
  const containerPadding = 16
  const shellRef = useRef<HTMLDivElement>(null)
  const [measured, setMeasured] = useState(baseWidth)
  const itemWidth = Math.max(measured - containerPadding * 2, 0)
  const trackItemOffset = itemWidth + GAP

  useLayoutEffect(() => {
    const el = shellRef.current
    if (!el) return
    const apply = () => {
      const next = Math.round(el.getBoundingClientRect().width)
      if (next > 0) setMeasured((prev) => (prev === next ? prev : next))
    }
    apply()
    const ro = new ResizeObserver(apply)
    ro.observe(el)
    window.addEventListener('resize', apply)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', apply)
    }
  }, [])
  const itemsForRender = useMemo(() => {
    if (!loop) return items
    if (items.length === 0) return []
    return [items[items.length - 1], ...items, items[0]]
  }, [items, loop])

  const [uncontrolled, setUncontrolled] = useState(loop ? 1 : 0)
  const position = index == null ? uncontrolled : loop ? index + 1 : index
  const x = useMotionValue(0)
  const [isHovered, setIsHovered] = useState(false)
  const [isJumping, setIsJumping] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)

  function moveTo(next: number) {
    const max = itemsForRender.length - 1
    const clamped = Math.max(0, Math.min(next, max))
    const nextActive = items.length === 0 ? 0 : loop ? (clamped - 1 + items.length) % items.length : clamped
    onIndexChange?.(nextActive)
    if (index == null) setUncontrolled(clamped)
  }

  const containerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (pauseOnHover && containerRef.current) {
      const container = containerRef.current
      const handleMouseEnter = () => setIsHovered(true)
      const handleMouseLeave = () => setIsHovered(false)
      container.addEventListener('mouseenter', handleMouseEnter)
      container.addEventListener('mouseleave', handleMouseLeave)
      return () => {
        container.removeEventListener('mouseenter', handleMouseEnter)
        container.removeEventListener('mouseleave', handleMouseLeave)
      }
    }
  }, [pauseOnHover])

  useEffect(() => {
    if (!autoplay || itemsForRender.length <= 1) return undefined
    if (pauseOnHover && isHovered) return undefined

    const timer = setInterval(() => {
      moveTo(position + 1)
    }, autoplayDelay)

    return () => clearInterval(timer)
  }, [autoplay, autoplayDelay, isHovered, pauseOnHover, itemsForRender.length, position])

  useEffect(() => {
    const start = loop ? 1 : 0
    if (index == null) {
      setUncontrolled(start)
      x.set(-start * trackItemOffset)
      return
    }
    x.set(-(loop ? index + 1 : index) * trackItemOffset)
  }, [items.length, loop, trackItemOffset, x])

  useEffect(() => {
    if (!loop && position > itemsForRender.length - 1) {
      moveTo(Math.max(0, itemsForRender.length - 1))
    }
  }, [itemsForRender.length, loop, position])

  const effectiveTransition = isJumping ? { duration: 0 } : SPRING_OPTIONS

  const handleAnimationStart = () => {
    setIsAnimating(true)
  }

  const handleAnimationComplete = () => {
    if (!loop || itemsForRender.length <= 1) {
      setIsAnimating(false)
      return
    }
    const lastCloneIndex = itemsForRender.length - 1

    if (position === lastCloneIndex) {
      setIsJumping(true)
      moveTo(1)
      x.set(-1 * trackItemOffset)
      requestAnimationFrame(() => {
        setIsJumping(false)
        setIsAnimating(false)
      })
      return
    }

    if (position === 0) {
      setIsJumping(true)
      moveTo(items.length)
      x.set(-items.length * trackItemOffset)
      requestAnimationFrame(() => {
        setIsJumping(false)
        setIsAnimating(false)
      })
      return
    }

    setIsAnimating(false)
  }

  const handleDragEnd = (_: unknown, info: { offset: { x: number }; velocity: { x: number } }) => {
    const { offset, velocity } = info
    const direction =
      offset.x < -DRAG_BUFFER || velocity.x < -VELOCITY_THRESHOLD
        ? 1
        : offset.x > DRAG_BUFFER || velocity.x > VELOCITY_THRESHOLD
          ? -1
          : 0

    if (direction === 0) return
    moveTo(position + direction)
  }

  const dragProps = loop
    ? {}
    : {
        dragConstraints: {
          left: -trackItemOffset * Math.max(itemsForRender.length - 1, 0),
          right: 0,
        },
      }

  const activeIndex =
    items.length === 0 ? 0 : loop ? (position - 1 + items.length) % items.length : Math.min(position, items.length - 1)

  return (
    <div
      ref={shellRef}
      className="carousel-shell"
      style={{ width: '100%', maxWidth: baseWidth }}
    >
    <div
      ref={containerRef}
      className={`carousel-container ${round ? 'round' : ''}`}
      style={{
        width: '100%',
        ...(round && { height: measured, borderRadius: '50%' }),
      }}
    >
      <motion.div
        className="carousel-track"
        drag={swipe && !isAnimating ? 'x' : false}
        {...dragProps}
        style={{
          width: itemWidth,
          gap: `${GAP}px`,
          perspective: 1000,
          perspectiveOrigin: `${position * trackItemOffset + itemWidth / 2}px 50%`,
          x,
        }}
        onDragEnd={handleDragEnd}
        animate={{ x: -(position * trackItemOffset) }}
        transition={effectiveTransition}
        onAnimationStart={handleAnimationStart}
        onAnimationComplete={handleAnimationComplete}
      >
        {itemsForRender.map((item, itemIndex) => (
          <CarouselItem
            key={`${item?.id ?? itemIndex}-${itemIndex}`}
            item={item}
            index={itemIndex}
            itemWidth={itemWidth}
            round={round}
            trackItemOffset={trackItemOffset}
            x={x}
            transition={effectiveTransition}
          />
        ))}
      </motion.div>
      <div className={`carousel-indicators-container ${round ? 'round' : ''}`}>
        <div className="carousel-indicators">
          {items.map((_, itemIndex) => (
            <motion.button
              type="button"
              key={itemIndex}
              className={`carousel-indicator ${activeIndex === itemIndex ? 'active' : 'inactive'}`}
              aria-label={`Go to slide ${itemIndex + 1}`}
              aria-current={activeIndex === itemIndex}
              animate={{
                scale: activeIndex === itemIndex ? 1.2 : 1,
              }}
              onClick={() => moveTo(loop ? itemIndex + 1 : itemIndex)}
              transition={{ duration: 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
    </div>
  )
}
