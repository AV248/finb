import React, { useEffect, useRef, useState } from 'react';

const particles = ['✦', '◇', '◈', '⊹', '✳', '¢', '⋆', '✧', '⟡', '◌', '✦', '▱', '✧', '¢', '◇', '✳'];
const skyline = Array.from({ length: 21 }, (_, index) => index);

export function WorldAtmosphere() {
  const scene = useRef(null);
  useEffect(() => {
    const onScroll = () => {
      if (!scene.current) return;
      const y = Math.min(240, window.scrollY * 0.12);
      scene.current.style.setProperty('--sky-drift', `${-y}px`);
      scene.current.style.setProperty('--hq-drift', `${-y * 0.42}px`);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="world-atmosphere" ref={scene} aria-hidden="true">
      <div className="world-nebula nebula-magenta" />
      <div className="world-nebula nebula-cyan" />
      <div className="world-nebula nebula-gold" />
      <div className="world-stars" />
      <div className="world-city" style={{ transform: 'translateY(var(--sky-drift, 0px))' }}>
        <div className="city-sun" />
        <div className="skyline-far">{skyline.map(index => <i key={index} style={{ '--building-index': index, '--building-height': `${50 + ((index * 37) % 147)}px`, '--building-width': `${18 + ((index * 13) % 29)}px` }} />)}</div>
        <div className="skyline-near">{skyline.slice(0, 15).map(index => <i key={index} style={{ '--building-index': index, '--building-height': `${36 + ((index * 31) % 107)}px`, '--building-width': `${23 + ((index * 11) % 34)}px` }} />)}</div>
      </div>
      <div className="hq-stage" style={{ transform: 'translateY(var(--hq-drift, 0px))' }}>
        <div className="hq-shadow" />
        <div className="hq-platform hq-platform-back" />
        <div className="hq-platform hq-platform-front"><span>FINB / PRIVATE PLAY NETWORK</span><i>✳</i></div>
        <div className="hq-building">
          <div className="hq-roof"><span>F</span><i>✦</i></div>
          <div className="hq-facade hq-facade-left"><i /><i /><i /><i /><i /><i /></div>
          <div className="hq-facade hq-facade-right"><i /><i /><i /><i /><i /><i /></div>
          <div className="hq-glass-spire" />
          <div className="hq-laser-line" />
        </div>
        <div className="hq-sign">FAKE INTERNATIONAL BANK <span>ESTD. 2024</span></div>
      </div>
      <div className="world-particles">{particles.map((glyph, index) => <i key={index} className={`drift-particle particle-${index % 5}`} style={{ '--particle-index': index, '--particle-left': `${(index * 37 + 7) % 97}%`, '--particle-top': `${(index * 23 + 9) % 90}%`, '--particle-delay': `${index * -1.87}s`, '--particle-duration': `${11 + (index % 6) * 2}s` }}>{glyph}</i>)}</div>
      <div className="world-vignette" />
    </div>
  );
}

export function CursorController() {
  const cursor = useRef(null);
  const trailNodes = useRef([]);
  const frame = useRef(0);
  const latest = useRef({ x: -40, y: -40 });
  const trail = useRef([]);
  const [hover, setHover] = useState('');
  const [pressed, setPressed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia('(pointer: fine) and (prefers-reduced-motion: no-preference)');
    if (!media.matches) return undefined;
    document.documentElement.classList.add('finb-cursor-active');
    const paint = () => {
      frame.current = 0;
      const { x, y } = latest.current;
      if (cursor.current) cursor.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      trailNodes.current.forEach((node, index) => {
        const item = trail.current[index];
        if (node && item) {
          node.style.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
          node.style.opacity = String((index + 1) / trail.current.length * 0.28);
        }
      });
    };
    const onMove = event => {
      latest.current = { x: event.clientX, y: event.clientY };
      trail.current = [...trail.current, { x: event.clientX, y: event.clientY }].slice(-3);
      if (!frame.current) frame.current = window.requestAnimationFrame(paint);
    };
    const onOver = event => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) setHover('cursor-input');
      else if (target.closest('button, a, [role="button"], summary')) setHover('cursor-interactive');
      else setHover('');
    };
    const onDown = () => setPressed(true);
    const onUp = () => setPressed(false);
    const onLeave = () => { if (cursor.current) cursor.current.style.opacity = '0'; };
    const onEnter = () => { if (cursor.current) cursor.current.style.opacity = '1'; };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    window.addEventListener('pointerup', onUp, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    document.documentElement.addEventListener('pointerenter', onEnter);
    return () => {
      document.documentElement.classList.remove('finb-cursor-active');
      window.cancelAnimationFrame(frame.current);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      document.documentElement.removeEventListener('pointerenter', onEnter);
    };
  }, []);

  return (
    <div className="cursor-effects" aria-hidden="true">
      {[0, 1, 2].map(index => <i className={`cursor-trail cursor-trail-${index}`} ref={node => { trailNodes.current[index] = node; }} key={index} />)}
      <div className={`cursor-controller ${hover} ${pressed ? 'cursor-pressed' : ''}`} ref={cursor}>
        <span className="cursor-crosshair" />
        <span className="cursor-core">{hover === 'cursor-interactive' ? '✦' : hover === 'cursor-input' ? '│' : '◈'}</span>
        <span className="cursor-ring" />
      </div>
    </div>
  );
}

export function VaultTransition({ active, onSkip }) {
  const [charges, setCharges] = useState(0);
  useEffect(() => { if (active) setCharges(0); }, [active]);
  if (!active) return null;
  const charge = () => {
    setCharges(value => {
      const next = value + 1;
      if (next >= 3) window.setTimeout(onSkip, 90);
      return Math.min(3, next);
    });
  };
  return (
    <div className="vault-transition" role="status" aria-live="polite">
      <div className="transition-scan" />
      <div className="transition-shards">{Array.from({ length: 10 }, (_, index) => <i key={index} style={{ '--shard-index': index }} />)}</div>
      <div className="transition-center"><span className="transition-kicker">PLATINUM VAULT / FAST TRAVEL</span><b>Recompiling your<br />little universe.</b><button className="transition-crystal" onClick={charge} aria-label="Tap to charge the vault shortcut">✦</button><div className="transition-charge-track"><i style={{ width: `${(charges / 3) * 100}%` }} /></div><small>{charges === 3 ? 'VAULT CHARGED' : 'TAP THE CRYSTAL 3× TO CHARGE FASTER'}</small><button className="transition-skip" onClick={onSkip}>SKIP ↗</button></div>
    </div>
  );
}

const futureItems = [
  { id: 'loan', symbol: '↟', title: 'Loan Lab', flag: 'BORROW / BUILD', tint: 'loan', teaser: 'A tiny seed of Credit. A repayment plan with a personality.' },
  { id: 'community', symbol: '◌', title: 'The Common Room', flag: 'COMMUNITY', tint: 'community', teaser: 'Clubs, friendly dares, and a place to show off your ledger.' },
  { id: 'integrity', symbol: '⌁', title: 'Integrity Office', flag: 'TRUST / REPUTATION', tint: 'integrity', teaser: 'A reputation system where good play has a visible glow.' },
  { id: 'codes', symbol: '⌘', title: 'Code Cabinet', flag: 'SECRET CODES', tint: 'codes', teaser: 'A locked drawer for seasonal gifts and little surprises.' },
  { id: 'liberals', symbol: '✹', title: 'The Great Liberals Game', flag: 'COMING SOON / BIG IDEA', tint: 'liberals', teaser: 'A whole game-world built around curiosity, skill, and Liberals.' },
];

function TeaserCard({ item }) {
  const [open, setOpen] = useState(false);
  return (
    <button className={`teaser-card teaser-${item.tint} ${open ? 'teaser-open' : ''}`} onClick={() => setOpen(value => !value)} aria-expanded={open}>
      <span className="teaser-top"><i>{item.symbol}</i><small>LOCKED / NEXT</small></span>
      <span className="teaser-flag">{item.flag}</span>
      <b>{item.title}</b>
      <span className="teaser-bottom">{open ? item.teaser : 'TAP TO PEEK'} <i>{open ? '−' : '+'}</i></span>
      <span className="teaser-glow" />
    </button>
  );
}

export function ComingSoonShelf() {
  return (
    <section className="coming-shelf">
      <div className="coming-shelf-head"><div><span className="eyebrow"><i className="eyebrow-line" /> BEYOND THE VAULT</span><h2>The next strange thing.</h2><p>Five doors. A lot of blueprints. Tap one for a tiny peek.</p></div><span className="coming-edition">FUTURE BUILD / 05 MODULES</span></div>
      <div className="teaser-grid">{futureItems.map(item => <TeaserCard item={item} key={item.id} />)}</div>
    </section>
  );
}
