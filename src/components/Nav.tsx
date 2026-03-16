import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const NAV_ITEMS = [
  { to: '/',                    icon: '🏠', label: 'Home',       end: true,  roles: null },
  { to: '/explore',             icon: '🔍', label: 'Explore',    end: false, roles: ['admin', 'analyst'] },
  { to: '/datasets',            icon: '📊', label: 'Datasets',   end: false, roles: ['admin', 'analyst'] },
  { to: '/charts',              icon: '📈', label: 'Charts',     end: false, roles: ['admin', 'analyst'] },
  { to: '/admin',               icon: '👥', label: 'Admin',      end: false, roles: ['admin'] },
  { to: '/settings/connections',icon: '⚙️', label: 'Settings',   end: false, roles: ['admin'] },
] as const

export function Nav() {
  const { role } = useAuth()
  const [collapsed, setCollapsed] = useState(false)

  const visible = NAV_ITEMS.filter(item =>
    item.roles === null || (role && item.roles.includes(role as 'admin' | 'analyst'))
  )

  return (
    <aside className={`app-sidebar${collapsed ? ' app-sidebar--collapsed' : ''}`}>
      <div className="app-sidebar-header">
        <span className="app-sidebar-logo">AI-Dash</span>
        <button
          className="app-sidebar-toggle"
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={() => setCollapsed(c => !c)}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>
      <nav>
        {visible.map(item => (
          <NavLink key={item.to} to={item.to} end={item.end}>
            <span className="app-sidebar-icon">{item.icon}</span>
            <span className="app-sidebar-label">{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
