'use client';

import { motion } from 'framer-motion';

/**
 * Penny — the FINB vault sprite. Original inline SVG mascot: a jelly coin
 * with orange/green halves, a lock-face and a floating halo of Liberals.
 */
export function Mascot({ mood = 'happy', size = 132, wave = false }: { mood?: 'happy' | 'wow' | 'cheer' | 'think'; size?: number; wave?: boolean }) {
  const eye = mood === 'wow' ? 4.6 : 3.4;
  return (
    <motion.div
      className="relative"
      style={{ width: size, height: size }}
      animate={{ y: [0, -7, 0], rotate: mood === 'cheer' ? [0, -3, 3, 0] : [0, 1.5, 0] }}
      transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut' }}
    >
      <svg viewBox="0 0 120 120" className="h-full w-full drop-shadow-[0_18px_30px_rgba(255,107,0,.35)]">
        <defs>
          <linearGradient id="pennyBody" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFB066" />
            <stop offset="46%" stopColor="#FF6B00" />
            <stop offset="100%" stopColor="#00C853" />
          </linearGradient>
          <linearGradient id="pennyFace" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FFF6E9" />
            <stop offset="100%" stopColor="#FFE9CF" />
          </linearGradient>
          <radialGradient id="pennyGlow" cx="30%" cy="20%">
            <stop offset="0%" stopColor="rgba(255,255,255,.75)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <circle cx="60" cy="62" r="44" fill="url(#pennyBody)" />
        <circle cx="60" cy="62" r="44" fill="url(#pennyGlow)" />
        <circle cx="60" cy="62" r="35" fill="url(#pennyFace)" />
        <circle cx="60" cy="62" r="35" fill="none" stroke="rgba(255,107,0,.35)" strokeWidth="1.4" strokeDasharray="4 5" />
        {/* vault door detail */}
        <circle cx="60" cy="62" r="24" fill="none" stroke="rgba(29,39,80,.35)" strokeWidth="2" />
        <circle cx="60" cy="62" r="24" fill="none" stroke="#FF6B00" strokeWidth="2" strokeDasharray="10 6" opacity=".8" />
        {/* eyes */}
        <circle cx="49" cy="56" r={eye} fill="#1D2750" />
        <circle cx="71" cy="56" r={eye} fill="#1D2750" />
        <circle cx="50.4" cy="54.6" r="1.3" fill="#fff" />
        <circle cx="72.4" cy="54.6" r="1.3" fill="#fff" />
        {/* mouth */}
        {mood === 'wow' ? (
          <ellipse cx="60" cy="72" rx="6" ry="7" fill="#1D2750" />
        ) : mood === 'cheer' ? (
          <path d="M52 70c3 7 13 7 16 0z" fill="#1D2750" />
        ) : mood === 'think' ? (
          <path d="M54 72h12" stroke="#1D2750" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M53 70c2.6 5 11.4 5 14 0" stroke="#1D2750" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        )}
        {/* halo of Liberals */}
        <g opacity=".95">
          {[0, 1, 2].map(index => (
            <motion.text
              key={index}
              x={20 + index * 32}
              y="18"
              fontSize="15"
              fill={index === 1 ? '#00E676' : '#FF9500'}
              animate={{ y: [16, 8, 16], rotate: [0, index % 2 ? 18 : -18, 0] }}
              transition={{ duration: 3.2 + index * 0.5, repeat: Infinity, ease: 'easeInOut' }}
              textAnchor="middle"
            >
              {index === 1 ? '✦' : '¢'}
            </motion.text>
          ))}
        </g>
      </svg>
      {wave && (
        <motion.span
          className="absolute -right-1 bottom-2 text-2xl"
          animate={{ rotate: [0, 22, -12, 0], y: [0, -4, 0] }}
          transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.4 }}
        >
          🟠
        </motion.span>
      )}
    </motion.div>
  );
}

export function MascotBubble({ children, tone = 'flame' }: { children: React.ReactNode; tone?: 'flame' | 'lime' }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={`relative max-w-sm rounded-2xl border px-4 py-3 text-sm leading-relaxed ${
        tone === 'flame'
          ? 'border-flame-500/45 bg-flame-500/12 text-cream-100'
          : 'border-lime-500/45 bg-lime-500/12 text-cream-100'
      }`}
    >
      {children}
      <span className={`absolute -left-1.5 bottom-4 h-3 w-3 rotate-45 border-b border-l ${
        tone === 'flame' ? 'border-flame-500/45 bg-flame-500/12' : 'border-lime-500/45 bg-lime-500/12'
      }`} />
    </motion.div>
  );
}
