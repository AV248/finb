'use client';

import { useEffect, useRef, useState } from 'react';
import { sfx } from '@/lib/audio';

export interface SoloGameProps {
  onFinish: (result: { credits: number; liberals: number; won: boolean; score: number; title: string; message: string; meta?: Record<string, number> }) => void;
  onToast: (text: string, tone?: 'good' | 'bad' | 'info', icon?: string) => void;
  seasonMultiplier: number;
}

interface RushCallbacks {
  onScore: (score: number, credits: number, riskHits: number) => void;
  onCombo: (combo: number) => void;
  onEnd: (score: number, credits: number, riskHits: number, lives: number) => void;
}

/**
 * Vault Rush — Phaser 3 endless runner.
 * The engine is loaded lazily so the app shell stays light; all art is generated
 * at runtime with Graphics + generated textures (zero binary assets).
 */
export function VaultRush({ onFinish, onToast }: SoloGameProps) {
  const host = useRef<HTMLDivElement>(null);
  const gameRef = useRef<{ destroy: (removeCanvas: boolean) => void } | null>(null);
  const callbacksRef = useRef<RushCallbacks | null>(null);
  const [hud, setHud] = useState({ score: 0, credits: 0, riskHits: 0, combo: 0 });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let disposed = false;
    const callbacks: RushCallbacks = {
      onScore: (score, credits, riskHits) => setHud(value => ({ ...value, score, credits, riskHits })),
      onCombo: combo => setHud(value => ({ ...value, combo })),
      onEnd: (score, credits, riskHits, lives) => {
        const won = score >= 60;
        sfx.reward();
        onFinish({
          credits,
          liberals: 2 + Math.floor(score / 25) + riskHits,
          won,
          score,
          title: `Vault Rush · ${score} pts`,
          message: `${credits} Credits collected across ${score} metres${riskHits ? ` with ${riskHits} Risk Zone hit${riskHits > 1 ? 's' : ''}` : ''}. ${lives > 0 ? 'Clean run.' : 'The lasers win sometimes.'}`,
          meta: { bestVaultRush: score },
        });
      },
    };
    callbacksRef.current = callbacks;

    (async () => {
      const Phaser = (await import('phaser')).default;
      if (disposed || !host.current) return;

      const WIDTH = 480;
      const HEIGHT = 720;

      class RushScene extends Phaser.Scene {
        private player!: Phaser.GameObjects.Container;
        private lane = 1;
        private laneTarget = 1;
        private speed = 320;
        private elapsed = 0;
        private spawnAt = 0;
        private riskHits = 0;
        private coins = 0;
        private lives = 3;
        private combo = 0;
        private invuln = 0;
        private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
        private obstacles: Phaser.GameObjects.Container[] = [];
        private pickups: Phaser.GameObjects.Container[] = [];

        constructor() {
          super('rush');
        }

        preload() {
          const g = this.make.graphics({ x: 0, y: 0 }, false);
          g.fillStyle(0xff6b00, 1).fillCircle(7, 7, 7);
          g.generateTexture('coin', 14, 14);
          g.clear();
          g.fillStyle(0x00e676, 1).fillRect(0, 0, 12, 18);
          g.generateTexture('crystal', 12, 18);
          g.destroy();
        }

        create() {
          const bg = this.add.rectangle(WIDTH / 2, HEIGHT / 2, WIDTH, HEIGHT, 0x070a18);
          bg.setDepth(-2);
          for (let laneIndex = 0; laneIndex < 3; laneIndex += 1) {
            this.add
              .rectangle(80 + laneIndex * 160, HEIGHT / 2, 2, HEIGHT, 0x00c853, 0.28)
              .setDepth(-1);
          }
          this.add
            .rectangle(WIDTH / 2, HEIGHT - 40, WIDTH, 80, 0xff6b00, 0.08)
            .setDepth(-1);

          this.player = this.add.container(80 + this.lane * 160, HEIGHT - 140);
          const shell = this.add.rectangle(0, 0, 54, 24, 0xff6b00, 1).setStrokeStyle(3, 0xff9500, 1);
          const core = this.add.circle(0, 0, 7, 0x00e676, 1);
          const spark = this.add.rectangle(0, 18, 30, 4, 0xffb066, 0.7);
          this.player.add([spark, shell, core]);
          this.tweens.add({ targets: spark, scaleX: 1.5, alpha: 0.3, duration: 380, yoyo: true, repeat: -1 });

          this.cursors = this.input.keyboard?.createCursorKeys();
          const onLeft = () => this.switchLane(-1);
          const onRight = () => this.switchLane(1);
          this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            const relative = pointer.x - (this.game.canvas.getBoundingClientRect().left || 0);
            if (relative < this.scale.width / 2) onLeft();
            else onRight();
          });
          this.input.keyboard?.on('keydown-LEFT', onLeft);
          this.input.keyboard?.on('keydown-A', onLeft);
          this.input.keyboard?.on('keydown-RIGHT', onRight);
          this.input.keyboard?.on('keydown-D', onRight);

          this.time.addEvent({ delay: 5400, loop: true, callback: () => this.speedUp() });
        }

        private switchLane(delta: number) {
          this.lane = Phaser.Math.Clamp(this.lane + delta, 0, 2);
          this.laneTarget = 80 + this.lane * 160;
          sfx.tap();
        }

        private speedUp() {
          this.speed += 46;
          this.combo = 0;
          callbacksRef.current?.onCombo(0);
        }

        private spawnRow() {
          const holes = Phaser.Math.Between(0, 2);
          for (let laneIndex = 0; laneIndex < 3; laneIndex += 1) {
            const x = 80 + laneIndex * 160;
            if (laneIndex === holes) {
              const isRisk = Math.random() < 0.32;
              const pickup = this.add.container(x, -30);
              const art = isRisk
                ? this.add.star(0, 0, 5, 6, 15, 0x00e676, 1)
                : this.add.image(0, 0, 'coin');
              pickup.add(art);
              pickup.setData('risk', isRisk);
              this.pickups.push(pickup);
            } else if (Math.random() < 0.55) {
              const obstacle = this.add.container(x, -30);
              const body = this.add.rectangle(0, 0, 44, 16, 0x24305e, 1).setStrokeStyle(2, 0x22e1ff, 0.9);
              obstacle.add(body);
              this.obstacles.push(obstacle);
            }
          }
        }

        update(_time: number, delta: number) {
          const step = delta / 1000;
          this.elapsed += step;
          this.speed += step * 4;
          this.spawnAt -= delta;
          if (this.spawnAt <= 0) {
            this.spawnRow();
            this.spawnAt = Phaser.Math.Clamp(760 - this.elapsed * 6, 300, 760);
          }

          this.player.x = Phaser.Math.Linear(this.player.x, this.laneTarget, 0.22);
          const travel = this.speed * step;

          const bump = (list: Phaser.GameObjects.Container[], handle: (item: Phaser.GameObjects.Container) => void) => {
            for (let index = list.length - 1; index >= 0; index -= 1) {
              const item = list[index];
              item.y += travel;
              if (item.y > HEIGHT + 50) {
                item.destroy();
                list.splice(index, 1);
                continue;
              }
              if (Math.abs(item.y - this.player.y) < 30 && Math.abs(item.x - this.player.x) < 34) {
                handle(item);
                item.destroy();
                list.splice(index, 1);
              }
            }
          };

          bump(this.pickups, pickup => {
            if (this.invuln > 0) return;
            const risk = Boolean(pickup.getData('risk'));
            if (risk) {
              this.riskHits += 1;
              this.combo += 1;
              this.coins += 30;
              this.invuln = 320;
              sfx.perfect();
            } else {
              this.combo += 1;
              this.coins += 10 + Math.min(10, this.combo);
              sfx.coin();
            }
            callbacksRef.current?.onCombo(this.combo);
            callbacksRef.current?.onScore(Math.floor(this.elapsed * 10), this.coins, this.riskHits);
          });

          bump(this.obstacles, () => {
            if (this.invuln > 0) return;
            this.lives -= 1;
            this.combo = 0;
            this.invuln = 900;
            this.coins = Math.max(0, this.coins - 15);
            sfx.bad();
            this.cameras.main.shake(220, 0.012);
            callbacksRef.current?.onCombo(0);
            if (this.lives <= 0) this.endRun();
          });

          if (this.invuln > 0) {
            this.invuln -= delta;
            this.player.alpha = Math.floor(this.invuln / 90) % 2 === 0 ? 1 : 0.45;
          } else {
            this.player.alpha = 1;
          }

          callbacksRef.current?.onScore(Math.floor(this.elapsed * 10), this.coins, this.riskHits);
          if (this.elapsed > 95) this.endRun();
        }

        private endRun() {
          this.scene.pause();
          callbacksRef.current?.onEnd(Math.floor(this.elapsed * 10), this.coins, this.riskHits, this.lives);
        }
      }

      const game = new Phaser.Game({
        type: Phaser.AUTO,
        width: WIDTH,
        height: HEIGHT,
        parent: host.current,
        backgroundColor: '#070a18',
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        scene: RushScene,
        physics: { default: 'arcade' },
        audio: { noAudio: true },
      });
      gameRef.current = game;
      setReady(true);
    })();

    return () => {
      disposed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [onFinish, onToast]);

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-flame-500/40 bg-navy-900">
      <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
        <span className="chip chip-flame">SCORE {hud.score}</span>
        <span className="chip chip-lime">¢ {hud.credits}</span>
        <span className="chip">RISK ×{(1 + hud.riskHits * 2).toFixed(1)}</span>
        {hud.combo > 1 && <span className="chip chip-flame">COMBO {hud.combo}</span>}
      </div>
      <div ref={host} className="mx-auto max-h-[70vh] w-full [&>canvas]:mx-auto [&>canvas]:max-h-[70vh] [&>canvas]:rounded-3xl" />
      {!ready && <div className="absolute inset-0 grid place-items-center text-sm text-white/60">Booting the Phaser engine…</div>}
      <div className="pointer-events-none absolute bottom-2 left-1/2 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] tracking-[0.2em] text-white/40">
        ← → / A D · TAP LEFT-RIGHT · HIT GREEN RISK ZONES FOR ×3
      </div>
    </div>
  );
}
