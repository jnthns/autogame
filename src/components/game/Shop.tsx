import { HERO_MAP } from '../../data/heroes';
import { spriteCss } from '../../data/sprites';
import { shopPrice } from '../../game/hyperRoll';
import type { GameState } from '../../game/types';
import { PixelSprite } from '../PixelSprite';

interface ShopProps {
  game: GameState;
  rerollLabel: string;
  canReroll: boolean;
  fightLabel: string;
  onBuy: (i: number) => void;
  onReroll: () => void;
  onStartCombat: () => void;
}

const BENCH_MAX = 8;

export function Shop({
  game: g,
  rerollLabel,
  canReroll,
  fightLabel,
  onBuy,
  onReroll,
  onStartCombat,
}: ShopProps) {
  return (
    <>
      <div className="om-shop__row">
        {g.shop.map((offer, i) => {
          if (!offer) {
            return (
              <div key={i} className="om-shop-card om-shop-card--sold">
                <span aria-hidden style={{ lineHeight: '30px' }}>
                  ·
                </span>
                <span className="om-shop-card__name">sold</span>
              </div>
            );
          }
          const h = HERO_MAP[offer.hid];
          const price = shopPrice(offer);
          const afford = g.gold >= price && g.bench.length < BENCH_MAX;
          return (
            <button
              key={i}
              type="button"
              className={`om-shop-card btn-active-sm${afford ? '' : ' om-shop-card--locked'}`}
              onClick={() => onBuy(i)}
            >
              <PixelSprite src={spriteCss(offer.hid)} />
              <span className="om-shop-card__name">
                {h.name.split(' ')[0]}
                {offer.star > 1 ? ` ${'★'.repeat(offer.star)}` : ''}
              </span>
              <span className="om-shop-card__price">◈{price}</span>
            </button>
          );
        })}
      </div>
      <div className="om-shop-actions">
        <button
          type="button"
          className={`om-btn om-btn--lg btn-active-sm${canReroll ? '' : ' om-btn--disabled'}`}
          onClick={onReroll}
        >
          ↻ {rerollLabel}
        </button>
        <button
          type="button"
          className={`om-btn om-btn--lg om-btn--fight btn-active-sm${g.board.length ? ' om-btn--danger' : ' om-btn--disabled'}`}
          onClick={onStartCombat}
        >
          {fightLabel}
        </button>
      </div>
    </>
  );
}
