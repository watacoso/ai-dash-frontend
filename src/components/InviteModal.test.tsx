import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { InviteModal } from './InviteModal'

describe('InviteModal', () => {
  it('calls onInvite with selected role on submit', async () => {
    const onInvite = vi.fn().mockResolvedValue({ invite_url: 'http://test/accept-invite?token=abc' })
    render(<InviteModal onInvite={onInvite} onClose={() => {}} />)
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'admin' } })
    fireEvent.click(screen.getByRole('button', { name: /generate/i }))
    await waitFor(() => expect(onInvite).toHaveBeenCalledWith('admin'))
  })

  it('shows generated invite link after server responds', async () => {
    const inviteUrl = 'http://test/accept-invite?token=xyz123'
    const onInvite = vi.fn().mockResolvedValue({ invite_url: inviteUrl })
    render(<InviteModal onInvite={onInvite} onClose={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /generate/i }))
    await waitFor(() => expect(screen.getByText(inviteUrl)).toBeInTheDocument())
  })
})
