import { useCallback, useEffect, useMemo, useRef } from 'react'
import { ContinentMap } from './ContinentMap.tsx'
import { LocalMap } from './LocalMap.tsx'
import { useGameState } from './useGameState.ts'
import { loadOrCreateMapState, saveMapState } from './mapStorage.js'
import './map.css'

/**
 * @param {{
 *   isOpen: boolean,
 *   onClose: () => void,
 *   slotIndex: number,
 *   onNewCell?: (layer: 'continent' | 'local', x: number, y: number, cell: import('./types').Cell) => void,
 *   onContinentMove?: (x: number, y: number) => void,
 *   mapWorldId?: import('./names').WorldId,
 * }} props
 */
export default function MapOverlay({
  isOpen,
  onClose,
  slotIndex,
  onNewCell,
  onContinentMove,
  mapWorldId,
}) {
  if (!isOpen) return null

  return (
    <MapOverlayInner
      slotIndex={slotIndex}
      mapWorldId={mapWorldId}
      onClose={onClose}
      onNewCell={onNewCell}
      onContinentMove={onContinentMove}
    />
  )
}

/**
 * @param {{
 *   slotIndex: number,
 *   onClose: () => void,
 *   onNewCell?: (layer: 'continent' | 'local', x: number, y: number, cell: import('./types').Cell) => void,
 *   onContinentMove?: (x: number, y: number) => void,
 *   mapWorldId?: import('./names').WorldId,
 * }} props
 */
function MapOverlayInner({ slotIndex, mapWorldId, onClose, onNewCell, onContinentMove }) {
  const initialState = useMemo(() => loadOrCreateMapState(slotIndex), [slotIndex])
  const persistSkipRef = useRef(true)

  const { state, moveTo, enterLocalMap, exitLocalMap } = useGameState({
    initialState,
    mapWorldId,
    onNewCell,
  })

  useEffect(() => {
    persistSkipRef.current = true
  }, [slotIndex])

  useEffect(() => {
    if (persistSkipRef.current) {
      persistSkipRef.current = false
      return
    }
    saveMapState(slotIndex, state)
  }, [slotIndex, state])

  const handleClose = useCallback(() => {
    saveMapState(slotIndex, state)
    onClose()
  }, [onClose, slotIndex, state])

  return (
    <div className="map-overlay" role="dialog" aria-modal="true" aria-label="世界地图">
      <header className="map-overlay__header">
        <button type="button" className="map-overlay__close" onClick={handleClose}>
          × 关闭
        </button>
        <h2 className="map-overlay__title">世界地图</h2>
        <span aria-hidden="true" />
      </header>
      <div className="map-overlay__body">
        <div className="map-overlay__inner">
          {state.layer === 'continent' ? (
            <ContinentMap
              grid={state.continentGrid}
              currentPos={state.continentPos}
              onMove={(x, y) => {
                moveTo('continent', x, y)
                onContinentMove?.(x, y)
              }}
              onEnterLocal={(x, y) => enterLocalMap(x, y)}
            />
          ) : (
            <LocalMap
              grid={state.localGrid}
              currentPos={state.localPos}
              onMove={(x, y) => moveTo('local', x, y)}
              onExit={exitLocalMap}
            />
          )}
        </div>
      </div>
    </div>
  )
}
