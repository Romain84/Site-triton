'use client'

import { useState, useRef } from 'react'

interface TooltipProps {
  content: React.ReactNode
  children?: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  maxWidth?: number
}

export default function Tooltip({
  content,
  children,
  position = 'top',
  maxWidth = 320
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [adjustedPosition, setAdjustedPosition] = useState(position)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const recalculatePosition = () => {
    if (!tooltipRef.current || !containerRef.current) {
      setAdjustedPosition(position)
      return
    }

    const tooltipRect = tooltipRef.current.getBoundingClientRect()

    // Ajuste la position pour éviter que l'infobulle sorte de l'écran.
    if (position === 'top' && tooltipRect.top < 0) {
      setAdjustedPosition('bottom')
      return
    }

    if (position === 'bottom' && tooltipRect.bottom > window.innerHeight) {
      setAdjustedPosition('top')
      return
    }

    if (position === 'left' && tooltipRect.left < 0) {
      setAdjustedPosition('right')
      return
    }

    if (position === 'right' && tooltipRect.right > window.innerWidth) {
      setAdjustedPosition('left')
      return
    }

    setAdjustedPosition(position)
  }

  const handleMouseEnter = () => {
    setIsVisible(true)
    requestAnimationFrame(recalculatePosition)
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 border-y-transparent border-l-transparent',
  }

  return (
    <span
      ref={containerRef}
      className="relative inline-flex items-center"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || (
        <span className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-gray-500 bg-gray-100 rounded-full cursor-help hover:bg-gray-200 hover:text-gray-700 transition-colors">
          ?
        </span>
      )}

      {isVisible && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 ${positionClasses[adjustedPosition]}`}
          style={{ maxWidth: `${maxWidth}px` }}
        >
          <div className="bg-gray-800 text-white text-sm rounded-lg shadow-lg p-3">
            {content}
          </div>
          <div
            className={`absolute w-0 h-0 border-4 ${arrowClasses[adjustedPosition]}`}
          />
        </div>
      )}
    </span>
  )
}

// Composant d'aide avec icône "?" intégré
interface HelpTooltipProps {
  title?: string
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  maxWidth?: number
}

export function HelpTooltip({ title, children, position = 'top', maxWidth = 320 }: HelpTooltipProps) {
  return (
    <Tooltip
      position={position}
      maxWidth={maxWidth}
      content={
        <div>
          {title && <div className="font-semibold mb-1">{title}</div>}
          <div className="text-gray-200">{children}</div>
        </div>
      }
    />
  )
}

// Composant pour afficher les formules de calcul
interface CalculationTooltipProps {
  title: string
  formula: string
  explanation?: string
  example?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function CalculationTooltip({
  title,
  formula,
  explanation,
  example,
  position = 'top'
}: CalculationTooltipProps) {
  return (
    <Tooltip
      position={position}
      maxWidth={400}
      content={
        <div className="space-y-2">
          <div className="font-semibold text-cyan-300">{title}</div>
          <div className="bg-gray-700 rounded px-2 py-1 font-mono text-xs">
            {formula}
          </div>
          {explanation && (
            <div className="text-gray-300 text-xs">{explanation}</div>
          )}
          {example && (
            <div className="border-t border-gray-600 pt-2 mt-2">
              <div className="text-gray-400 text-xs">Exemple :</div>
              <div className="text-green-300 text-xs">{example}</div>
            </div>
          )}
        </div>
      }
    />
  )
}
