import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

export function Nav() {
  const { role } = useAuth()
  return (
    <nav>
      <Link to="/">Home</Link>
      {role === 'admin' && <Link to="/admin">Admin</Link>}
    </nav>
  )
}
