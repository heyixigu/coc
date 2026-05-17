import CharacterSprite from './CharacterSprite.jsx'

/** @typedef {import('../config/characterSprites.js').SpriteState} SpriteState */

/**
 * 林知渺旧照片风格立绘框
 * @param {{ spriteState: SpriteState, variant?: 'dock' | 'mini' }} props
 */
export default function CharacterPhotoFrame({ spriteState, variant = 'dock' }) {
  const dockClass =
    variant === 'mini' ? 'character-photo-dock character-photo-dock--mini' : 'character-photo-dock'

  return (
    <div className={dockClass}>
      <figure
        className={`character-photo-frame character-photo-frame--${spriteState}`}
        data-state={spriteState}
        aria-label="林知渺立绘"
      >
        <div className="character-photo-frame__paper">
          <div className="character-photo-frame__sprite">
            <CharacterSprite state={spriteState} />
          </div>
          <figcaption className="character-photo-frame__caption">林知渺 · 2024</figcaption>
        </div>
        <div className="character-photo-frame__vignette" aria-hidden />
      </figure>
    </div>
  )
}
