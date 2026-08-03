import { useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'wouter'
import {
  HomeIcon,
  BoardIcon,
  CalendarIcon,
  AnalyticsIcon,
  SettingsIcon,
  ChevronLeftIcon,
  CommandIcon,
} from './icons'
import { BrandMonogram } from './BrandMonogram'

const NAV_ITEMS = [
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/board', label: 'Board', Icon: BoardIcon },
  { href: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { href: '/analytics', label: 'Analytics', Icon: AnalyticsIcon },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
]

export function Sidebar({ isOpen, isCollapsed, onToggleCollapse, onNavigate, onOpenPalette }) {
  const [location] = useLocation()
  const activeIndex = NAV_ITEMS.findIndex((item) => item.href === location)
  const listRef = useRef(null)
  const [indicator, setIndicator] = useState({ top: 0, height: 42 })

  // Measure the active item rather than deriving its offset arithmetically:
  // a var()-based transform silently stops re-resolving once transitioned,
  // and measuring also survives any future change to nav item height.
  useLayoutEffect(() => {
    if (!listRef.current || activeIndex < 0) {
      return undefined
    }

    const list = listRef.current
    const active = list.querySelectorAll('.nav-item')[activeIndex]

    function measure() {
      if (!active) {
        return
      }

      const listRect = list.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      setIndicator({
        top: activeRect.top - listRect.top,
        height: activeRect.height,
      })
    }

    if (active) {
      measure()
    }

    const observer = typeof ResizeObserver === 'undefined'
      ? null
      : new ResizeObserver(measure)
    observer?.observe(list)
    observer?.observe(active)
    window.addEventListener('resize', measure)

    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
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

        <button
          type="button"
          className="icon-mini brand-command"
          onClick={onOpenPalette}
          aria-label="Open command palette (Ctrl+K)"
          title="Command palette — Ctrl+K"
        >
          <CommandIcon />
        </button>
      </div>

      <ul className="nav-list" ref={listRef}>
        <li
          className={activeIndex < 0 ? 'nav-indicator hidden' : 'nav-indicator'}
          style={{
            height: `${indicator.height}px`,
            transform: `translateY(${indicator.top}px)`,
          }}
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
