import React from 'react'

export default function LiveIndicator({ label = 'LIVE', size = 'sm' }) {
  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2'
  const fontSize = size === 'sm' ? 'text-xs' : 'text-sm'

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative flex items-center justify-center">
        <div className={`${dotSize} rounded-full bg-red-500`} />
        <div className={`absolute ${dotSize} rounded-full bg-red-500 animate-ping opacity-75`} />
      </div>
      <span className={`${fontSize} font-bold tracking-wider`} style={{ color: '#EF4444' }}>
        {label}
      </span>
    </div>
  )
}
