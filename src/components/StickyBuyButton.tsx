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
        <div className="sh-sticky-bar-inner max-w-6xl mx-auto px-4 py-3">
          <button
            onClick={onBuy}
            disabled={disabled}
            className="w-full sh-sticky-bar-button flex justify-center items-center gap-2 px-8 py-4 rounded-xl font-black text-lg transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              backgroundColor: disabled ? '#94a3b8' : undefined,
              color: disabled ? '#f1f5f9' : undefined,
            }}
          >
            <ShoppingBag size={20} />
            {disabled ? 'SOLD OUT' : `${buttonText} - ${price.toFixed(0)} ${currency}`}
          </button>
        </div>
      </div>
    </>
  )
}
