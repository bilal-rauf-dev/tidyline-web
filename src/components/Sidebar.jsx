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

      <ul className="nav-list" style={{ '--nav-active-index': Math.max(activeIndex, 0) }}>
        <li
          className={activeIndex < 0 ? 'nav-indicator hidden' : 'nav-indicator'}
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
