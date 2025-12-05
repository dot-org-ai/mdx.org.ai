'use client'

import * as React from 'react'

export interface WavesProps {
  className?: string
}

export function Waves({ className = '' }: WavesProps) {
  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 2560 1920"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mix-blend-multiply dark:mix-blend-screen opacity-40 dark:opacity-50"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient
            id="waveGrad"
            x1="-200"
            y1="2120"
            x2="2760"
            y2="-200"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="var(--background)" />
            <stop offset="20%" stopColor="var(--primary)" stopOpacity="0.20" />
            <stop offset="50%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="80%" stopColor="var(--accent, var(--primary))" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--background)" />
          </linearGradient>

          <radialGradient id="fade" cx="0.5" cy="0.5" r="0.65">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
            <stop offset="70%" stopColor="#ffffff" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0" />
          </radialGradient>
          <mask id="fadeMask">
            <rect x="0" y="0" width="2560" height="1920" fill="url(#fade)" />
          </mask>
        </defs>

        <g mask="url(#fadeMask)">
          <g fill="url(#waveGrad)">
            <path d="M -400 1700 C 200 1200, 1200 2000, 2800 420 L 2800 1920 L -400 1920 Z" fillOpacity="0.55" />
            <path d="M -420 1520 C 230 1080, 1230 1840, 2800 300 L 2800 1920 L -420 1920 Z" fillOpacity="0.45" />
            <path d="M -440 1340 C 260 960, 1260 1680, 2800 220 L 2800 1920 L -440 1920 Z" fillOpacity="0.34" />
            <path d="M -460 1180 C 300 840, 1300 1500, 2800 140 L 2800 1920 L -460 1920 Z" fillOpacity="0.26" />
            <path d="M -480 1020 C 340 780, 1340 1360, 2800 60 L 2800 1920 L -480 1920 Z" fillOpacity="0.20" />
          </g>
        </g>
      </svg>
    </div>
  )
}
