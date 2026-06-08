'use client'

import { useEffect, useState } from 'react'
import { ShoppingBag } from 'lucide-react'

interface Props {
  enabled: boolean
  onBuy: () => void
  price: number
  comparePrice?: number | null
  currency: string
  buttonText?: string
  disabled?: boolean
  customCss?: string
}

export default function StickyBuyButton({
  enabled,
  onBuy,
  price,
  comparePrice,
  currency,
  buttonText = 'Order Now',
  disabled = false,
  customCss = '',
}: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setVisible(false)
      return
    }

    const el = document.getElementById('buy-button-section')
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setVisible(!entry.isIntersecting)
      },
      { threshold: 0, rootMargin: '0px' }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [enabled])

  if (!enabled) return null

  return (
    <>
      {customCss && <style>{customCss}</style>}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-transform duration-300 ${
          visible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="sh-sticky-bar-inner max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="sh-sticky-bar-price text-xl font-black text-slate-900">
              {currency} {price.toFixed(2)}
            </span>
            {comparePrice && (
              <span className="sh-sticky-bar-compare text-sm font-semibold text-slate-400 line-through">
                {currency} {comparePrice.toFixed(2)}
              </span>
            )}
          </div>
          <button
            onClick={onBuy}
            disabled={disabled}
            className="sh-sticky-bar-button flex items-center gap-2 px-8 py-3 rounded-xl font-black text-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: disabled ? '#94a3b8' : undefined,
              color: disabled ? '#f1f5f9' : undefined,
            }}
          >
            <ShoppingBag size={18} />
            {disabled ? 'SOLD OUT' : buttonText}
          </button>
        </div>
      </div>
    </>
  )
}
