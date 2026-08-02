import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'wouter'
import {
  HomeIcon,
  BoardIcon,
  CalendarIcon,
  AnalyticsIcon,
  SettingsIcon,
  ChevronLeftIcon,
} from './icons'
import { BrandMonogram } from './BrandMonogram'

const NAV_ITEMS = [
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/board', label: 'Board', Icon: BoardIcon },
  { href: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { href: '/analytics', label: 'Analytics', Icon: AnalyticsIcon },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
]

export function Sidebar({ isOpen, isCollapsed, onToggleCollapse, onNavigate }) {
  const [location] = useLocation()
  const activeIndex = NAV_ITEMS.findIndex((item) => item.href === location)
  const listRef = useRef(null)
  const [indicatorTop, setIndicatorTop] = useState(0)

  // Measure the active item rather than deriving its offset arithmetically:
  // a var()-based transform silently stops re-resolving once transitioned,
  // and measuring also survives any future change to nav item height.
  useLayoutEffect(() => {
    if (!listRef.current || activeIndex < 0) {
      return
    }

    const active = listRef.current.querySelectorAll('.nav-item')[activeIndex]

    if (active) {
      setIndicatorTop(active.offsetTop)
    }
  }, [activeIndex, isCollapsed, isOpen])

  return (
    <nav
      id="sidebar-nav"
      className={isOpen ? 'sidebar open' : 'sidebar'}
      aria-label="Main navigation"
    >
      <div className="sidebar-brand">
        <BrandMonogram />
        <span>Tidyline</span>
      </div>

      <ul className="nav-list" ref={listRef}>
        <li
          className={activeIndex < 0 ? 'nav-indicator hidden' : 'nav-indicator'}
          style={{ transform: `translateY(${indicatorTop}px)` }}
          aria-hidden="true"
        />

        {NAV_ITEMS.map((item) => {
          const ItemIcon = item.Icon

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                title={item.label}
                onClick={onNavigate}
                className={location === item.href ? 'nav-item active' : 'nav-item'}
              >
                <ItemIcon />
                <span>{item.label}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        className="sidebar-collapse"
        onClick={onToggleCollapse}
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        <ChevronLeftIcon />
        <span>Collapse</span>
      </button>
    </nav>
  )
}
