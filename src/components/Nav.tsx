import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Nav() {
  const { role } = useAuth()
  return (
    <header className="app-nav">
      <div className="app-nav-inner">
        <span className="app-nav-logo">AI-Dash</span>
        <nav>
          <NavLink to="/" end>Home</NavLink>
          {role && <NavLink to="/explore">Explore</NavLink>}
          {role && <NavLink to="/datasets">Datasets</NavLink>}
          {role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
          {role === 'admin' && <NavLink to="/settings/connections">Settings</NavLink>}
        </nav>
      </div>
    </header>
  )
}
