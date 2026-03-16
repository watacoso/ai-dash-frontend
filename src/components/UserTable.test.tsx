import { render, screen, fireEvent } from '@testing-library/react'
import { UserTable, UserRow } from './UserTable'

const users: UserRow[] = [
  { id: 'u1', email: 'admin@example.com', name: 'Admin User', role: 'admin', is_active: true },
  { id: 'u2', email: 'analyst@example.com', name: 'Analyst User', role: 'analyst', is_active: false },
]

describe('UserTable', () => {
  it('renders name, email, role and active badge for each user', () => {
    render(<UserTable users={users} currentUserId="other" onRoleChange={() => {}} onDeactivate={() => {}} />)
    expect(screen.getByText('Admin User')).toBeInTheDocument()
    expect(screen.getByText('admin@example.com')).toBeInTheDocument()
    expect(screen.getByText('Analyst User')).toBeInTheDocument()
    expect(screen.getByText('analyst@example.com')).toBeInTheDocument()
    // active badges
    expect(screen.getByText('active')).toBeInTheDocument()
    expect(screen.getByText('inactive')).toBeInTheDocument()
  })

  it('calls onRoleChange with user id and new role when dropdown changes', () => {
    const onRoleChange = vi.fn()
    render(<UserTable users={users} currentUserId="other" onRoleChange={onRoleChange} onDeactivate={() => {}} />)
    const selects = screen.getAllByRole('combobox')
    fireEvent.change(selects[0], { target: { value: 'analyst' } })
    expect(onRoleChange).toHaveBeenCalledWith('u1', 'analyst')
  })

  it('calls onDeactivate with user id when deactivate button is clicked', () => {
    const onDeactivate = vi.fn()
    render(<UserTable users={users} currentUserId="other" onRoleChange={() => {}} onDeactivate={onDeactivate} />)
    const buttons = screen.getAllByRole('button', { name: /deactivate/i })
    fireEvent.click(buttons[0])
    expect(onDeactivate).toHaveBeenCalledWith('u1')
  })

  it('should render Deactivate button with btn-danger class', () => {
    render(<UserTable users={users} currentUserId="other" onRoleChange={() => {}} onDeactivate={() => {}} />)
    const buttons = screen.getAllByRole('button', { name: /deactivate/i })
    expect(buttons[0]).toHaveClass('btn-danger')
  })

  it('hides deactivate button for current user row', () => {
    render(<UserTable users={users} currentUserId="u1" onRoleChange={() => {}} onDeactivate={() => {}} />)
    const buttons = screen.queryAllByRole('button', { name: /deactivate/i })
    // only u2's row should have the button (u1 is current user)
    expect(buttons).toHaveLength(1)
  })
})
