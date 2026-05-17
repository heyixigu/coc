/**
 * @param {object} props
 * @param {'left' | 'right'} props.side
 * @param {boolean} props.open
 * @param {() => void} props.onClose
 * @param {import('react').ReactNode} props.children
 */
export default function MobileDrawer({ side, open, onClose, children }) {
  return (
    <>
      <button
        type="button"
        className={`mobile-drawer-backdrop layout-mobile${open ? ' is-visible' : ''}`}
        aria-label="关闭面板"
        tabIndex={open ? 0 : -1}
        onClick={onClose}
      />
      <aside
        className={`mobile-drawer mobile-drawer--${side} layout-mobile${open ? ' is-open' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!open}
      >
        <div className="mobile-drawer__scroll">{children}</div>
      </aside>
    </>
  )
}
