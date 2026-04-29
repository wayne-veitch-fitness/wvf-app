import { redirect } from 'next/navigation'

// Root redirect — middleware handles auth, this is just a fallback
export default function RootPage() {
  redirect('/login')
}
