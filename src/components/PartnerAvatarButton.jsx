import CharacterSprite from './CharacterSprite.jsx'

/** @typedef {import('../config/characterSprites.js').SpriteState} SpriteState */

/**
 * @param {object} props
 * @param {SpriteState} props.spriteState
 * @param {() => void} props.onClick
 */
export default function PartnerAvatarButton({ spriteState, onClick }) {
  return (
    <button
      type="button"
      className="partner-avatar-btn btn-touch layout-mobile"
      aria-label="查看林知渺"
      onClick={onClick}
    >
      <span className="partner-avatar-btn__ring">
        <CharacterSprite state={spriteState} />
      </span>
    </button>
  )
}
