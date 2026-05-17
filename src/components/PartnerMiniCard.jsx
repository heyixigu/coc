import { useRef } from 'react'
import CharacterPhotoFrame from './CharacterPhotoFrame.jsx'

/** @typedef {import('../config/characterSprites.js').SpriteState} SpriteState */

/**
 * @param {object} props
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {SpriteState} props.spriteState
 * @param {{ name: string, hp: number, mp: number, san: number } | null} props.partner
 * @param {import('react').RefObject<HTMLElement | null>} [props.cardRef]
 */
export default function PartnerMiniCard({ open, onClose, spriteState, partner, cardRef: cardRefProp }) {
  const innerRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const cardRef = cardRefProp ?? innerRef

  if (!open) return null

  return (
    <>
      <button
        type="button"
        className="partner-mini-card-backdrop layout-mobile"
        aria-label="关闭"
        onClick={onClose}
      />
      <div
        ref={cardRef}
        className="partner-mini-card layout-mobile"
        role="dialog"
        aria-modal="true"
        aria-label="林知渺"
      >
        <CharacterPhotoFrame spriteState={spriteState} variant="mini" />
        {partner ? (
          <div className="partner-mini-card__stats">
            <span>HP {partner.hp}</span>
            <span>MP {partner.mp}</span>
            <span>SAN {partner.san}</span>
          </div>
        ) : null}
      </div>
    </>
  )
}
