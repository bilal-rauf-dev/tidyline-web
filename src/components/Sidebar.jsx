import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'wouter'
import {
  BoardIcon,
  CalendarIcon,
  ChevronLeftIcon,
  CommandIcon,
  HomeIcon,
  SearchIcon,
  SettingsIcon,
} from './icons'
import { BrandMonogram } from './BrandMonogram'
import { DEFAULT_FILTERS, filterTasks } from '../utils/filters'
import { getCountdownLabel } from '../utils/dates'

const NAV_ITEMS = [
  { href: '/', label: 'Now', Icon: HomeIcon },
  { href: '/board', label: 'Board', Icon: BoardIcon },
  { href: '/calendar', label: 'Calendar', Icon: CalendarIcon },
]

export function Sidebar({
  isOpen,
  isCollapsed,
  onToggleCollapse,
  onNavigate,
  onOpenPalette,
  workspaceName = 'TidyLine',
  tasks = [],
  onOpenTask,
}) {
  const [location] = useLocation()
  const activeIndex = NAV_ITEMS.findIndex((item) => item.href === location)
  const listRef = useRef(null)
  const searchRef = useRef(null)
  const [query, setQuery] = useState('')
  const [activeResult, setActiveResult] = useState(-1)
  const [indicator, setIndicator] = useState({ top: 0, height: 42 })

  const results = useMemo(() => {
    if (!query.trim()) return []
    return filterTasks(tasks, { ...DEFAULT_FILTERS, query })
      .filter((task) => !task.archived)
      .slice(0, 7)
  }, [query, tasks])

  const activeResultIndex = results.length
    ? Math.min(Math.max(activeResult, 0), results.length - 1)
    : -1

  useEffect(() => {
    function closeSearch(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) setQuery('')
    }
    document.addEventListener('pointerdown', closeSearch)
    return () => document.removeEventListener('pointerdown', closeSearch)
  }, [])

  useLayoutEffect(() => {
    if (!listRef.current || activeIndex < 0) return undefined
    const list = listRef.current
    const active = list.querySelectorAll('.nav-item')[activeIndex]

    function measure() {
      if (!active) return
      const listRect = list.getBoundingClientRect()
      const activeRect = active.getBoundingClientRect()
      setIndicator({ top: activeRect.top - listRect.top, height: activeRect.height })
    }

    measure()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure)
    observer?.observe(list)
    observer?.observe(active)
    window.addEventListener('resize', measure)
    return () => {
      observer?.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [activeIndex, isCollapsed, isOpen])

  function openResult(task) {
    if (!task) return
    setQuery('')
    onOpenTask?.(task.id)
  }

  return (
    <nav id="sidebar-nav" className={isOpen ? 'sidebar open' : 'sidebar'} aria-label="Main navigation">
      <div className="sidebar-brand">
        <BrandMonogram />
        <span>{workspaceName}</span>
        <button type="button" className="icon-mini brand-command" onClick={onOpenPalette} aria-label="Open command palette (Ctrl+K)" title="Command palette — Ctrl+K">
          <CommandIcon />
        </button>
      </div>

      <div className="sidebar-search-wrap" ref={searchRef}>
        <label className="sidebar-search">
          <SearchIcon />
          <span className="sr-only">Search tasks</span>
          <input
            type="search"
            value={query}
            placeholder="Search tasks..."
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveResult(0)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                setQuery('')
                event.currentTarget.blur()
              } else if (event.key === 'ArrowDown') {
                event.preventDefault()
                setActiveResult((index) => Math.min(index + 1, results.length - 1))
              } else if (event.key === 'ArrowUp') {
                event.preventDefault()
                setActiveResult((index) => Math.max(index - 1, 0))
              } else if (event.key === 'Enter') {
                event.preventDefault()
                openResult(results[activeResultIndex])
              }
            }}
            aria-label="Search tasks"
            aria-autocomplete="list"
          />
        </label>

        {query.trim() && (
          <div className="sidebar-search-results" role="listbox" aria-label="Task search results">
            {results.length ? results.map((task, index) => (
              <button
                key={task.id}
                type="button"
                className={index === activeResultIndex ? 'sidebar-search-result active' : 'sidebar-search-result'}
                role="option"
                aria-selected={index === activeResultIndex}
                onMouseEnter={() => setActiveResult(index)}
                onClick={() => openResult(task)}
              >
                <strong>{task.title}</strong>
                <span>{task.done ? 'Completed' : task.deadline ? getCountdownLabel(task.deadline) : 'Later'}</span>
              </button>
            )) : <p className="sidebar-search-empty">No matching tasks.</p>}
          </div>
        )}
      </div>

      <ul className="nav-list" ref={listRef}>
        <li className={activeIndex < 0 ? 'nav-indicator hidden' : 'nav-indicator'} style={{ height: `${indicator.height}px`, transform: `translateY(${indicator.top}px)` }} aria-hidden="true" />
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link href={item.href} title={item.label} onClick={onNavigate} className={location === item.href ? 'nav-item active' : 'nav-item'}>
              <item.Icon /><span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <Link href="/settings" className={location === '/settings' ? 'sidebar-review active' : 'sidebar-review'} onClick={onNavigate} title="Settings">
        <SettingsIcon /><span>Settings</span>
      </Link>

      <button type="button" className="sidebar-collapse" onClick={onToggleCollapse} aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
        <ChevronLeftIcon /><span>Collapse</span>
      </button>
    </nav>
  )
}
