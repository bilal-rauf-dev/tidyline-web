import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'wouter'
import {
  HomeIcon,
  BoardIcon,
  CalendarIcon,
  AnalyticsIcon,
  SettingsIcon,
  ChevronLeftIcon,
  CommandIcon,
  ClockIcon,
  NotesIcon,
  SearchIcon,
} from './icons'
import { BrandMonogram } from './BrandMonogram'
import { DEFAULT_FILTERS, filterTasks } from '../utils/filters'
import { getCountdownLabel } from '../utils/dates'

const NAV_ITEMS = [
  { href: '/', label: 'Home', Icon: HomeIcon },
  { href: '/board', label: 'Board', Icon: BoardIcon },
  { href: '/calendar', label: 'Calendar', Icon: CalendarIcon },
  { href: '/planner', label: 'Day planner', Icon: ClockIcon },
  { href: '/someday', label: 'Someday / Maybe', Icon: NotesIcon },
  { href: '/analytics', label: 'Analytics', Icon: AnalyticsIcon },
  { href: '/settings', label: 'Settings', Icon: SettingsIcon },
]

export function Sidebar({
  isOpen,
  isCollapsed,
  onToggleCollapse,
  onNavigate,
  onOpenPalette,
  onOpenShutdown,
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
    function handlePointerDown(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setQuery('')
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [])

  function openResult(task) {
    if (!task) return
    setQuery('')
    onOpenTask?.(task.id)
  }

  function handleSearchKeyDown(event) {
    if (event.key === 'Escape') {
      setQuery('')
      event.currentTarget.blur()
      return
    }

    if (!results.length) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveResult((current) => Math.min(current + 1, results.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveResult((current) => Math.max(current - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      openResult(results[activeResultIndex])
    }
  }

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
        <span>{workspaceName}</span>

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
            onKeyDown={handleSearchKeyDown}
            aria-label="Search tasks"
            aria-autocomplete="list"
            aria-controls="sidebar-task-results"
            aria-activedescendant={activeResultIndex >= 0 ? `sidebar-task-${results[activeResultIndex]?.id}` : undefined}
          />
        </label>
        {query.trim() && (
          <div id="sidebar-task-results" className="sidebar-search-results" role="listbox" aria-label="Task search results">
            {results.length ? results.map((task, index) => (
              <button
                key={task.id}
                id={`sidebar-task-${task.id}`}
                type="button"
                className={index === activeResultIndex ? 'sidebar-search-result active' : 'sidebar-search-result'}
                role="option"
                aria-selected={index === activeResultIndex}
                onMouseEnter={() => setActiveResult(index)}
                onClick={() => openResult(task)}
              >
                <strong>{task.title}</strong>
                <span>{task.done ? 'Completed' : task.deadline ? getCountdownLabel(task.deadline) : 'Someday / Maybe'}</span>
              </button>
            )) : (
              <p className="sidebar-search-empty">No matching tasks.</p>
            )}
          </div>
        )}
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
        className="sidebar-review"
        onClick={onOpenShutdown}
        title="Review the day"
      >
        <ClockIcon />
        <span>Review the day</span>
      </button>

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
