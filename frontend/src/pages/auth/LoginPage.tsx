import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { MdOutlineEmail, MdOutlineVisibility, MdOutlineVisibilityOff } from 'react-icons/md'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Checkbox, Field, Input } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { AuthLayout } from './AuthLayout'

const schema = z.object({
  email: z.string().trim().min(1, 'Enter your email address').email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
  remember: z.boolean(),
})
type Values = z.infer<typeof schema>

export function PasswordToggle({ visible, onToggle }: { visible: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label={visible ? 'Hide password' : 'Show password'} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-400 hover:bg-ink-100 hover:text-ink-700 focus-ring">
      <Icon icon={visible ? MdOutlineVisibilityOff : MdOutlineVisibility} size="sm" />
    </button>
  )
}

export function LoginPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { email: '', password: '', remember: true } })

  const onSubmit = handleSubmit(async () => {
    await new Promise((resolve) => setTimeout(resolve, 900))
    navigate('/')
  })

  return (
    <AuthLayout>
      <h2 className="text-title">Welcome back</h2>
      <p className="mt-1.5 text-body text-ink-500">Sign in to your KaziPay workspace.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <Field label="Email" error={errors.email?.message}>
          <Input type="email" autoComplete="email" leadingIcon={MdOutlineEmail} placeholder="you@studio.co.ke" autoFocus {...register('email')} />
        </Field>
        <Field label="Password" error={errors.password?.message} trailingLabel={<Link to="/forgot-password" className="rounded-sm text-small font-semibold text-brand-600 hover:text-brand-700 focus-ring">Forgot password?</Link>}>
          <Input type={showPassword ? 'text' : 'password'} autoComplete="current-password" placeholder="Your password" trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />} {...register('password')} />
        </Field>
        <Checkbox label="Keep me signed in" {...register('remember')} />
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}</Button>
      </form>

      <div className="my-6 flex items-center gap-3 text-caption text-ink-400"><span className="h-px flex-1 bg-ink-200" />or<span className="h-px flex-1 bg-ink-200" /></div>
      <Button variant="secondary" size="lg" fullWidth onClick={() => navigate('/')}>Email me a sign-in link</Button>

      <p className="mt-8 text-center text-body text-ink-500">
        New to KaziPay? <Link to="/register" className="rounded-sm font-semibold text-brand-600 hover:text-brand-700 focus-ring">Create a workspace</Link>
      </p>
    </AuthLayout>
  )
}
