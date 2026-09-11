import { redirect } from 'next/navigation'

// Dashboard real del CRM (consume datos del backend crm-v1-uc)
export default function Home() {
  redirect('/dashboard')
}
