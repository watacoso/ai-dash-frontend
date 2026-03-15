import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Nav() {
  const { role } = useAuth()
  return (
    <nav>
      <Link to="/">Home</Link>
      {role && <Link to="/explore">New session</Link>}
      {role === 'admin' && <Link to="/admin">Admin</Link>}
      {role === 'admin' && <Link to="/settings/connections">Settings</Link>}
    </nav>
  )
}
