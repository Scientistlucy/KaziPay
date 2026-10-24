import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { MdCheck } from 'react-icons/md'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Checkbox, Field, Input } from '../../components/ui/Field'
import { Icon } from '../../components/ui/Icon'
import { cn } from '../../lib/cn'
import { AuthLayout } from './AuthLayout'
import { PasswordToggle } from './LoginPage'

// Slug rule mirrors the tenants.slug CHECK constraint in V2.
const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  workspace: z.string().trim().min(2, 'Enter your business or studio name').max(255),
  slug: z.string().regex(/^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])$/, 'Use 3–63 lowercase letters, numbers or hyphens'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(10, 'Use at least 10 characters'),
  terms: z.literal(true, { errorMap: () => ({ message: 'Accept the terms to continue' }) }),
})
type Values = z.infer<typeof schema>

const toSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 63)

function strength(password: string) {
  let score = 0
  if (password.length >= 10) score++
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++
  return score
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [slugEdited, setSlugEdited] = useState(false)
  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', workspace: '', slug: '', email: '', password: '', terms: false as unknown as true },
    mode: 'onTouched',
  })
  const password = watch('password')
  const score = strength(password)
  const labels = ['Too short', 'Weak', 'Fair', 'Good', 'Strong']

  const onSubmit = handleSubmit(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1100))
    navigate('/')
  })

  return (
    <AuthLayout>
      <h2 className="text-title">Create your workspace</h2>
      <p className="mt-1.5 text-body text-ink-500">Free for your first client. No card needed.</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        <Field label="Your name" required error={errors.fullName?.message}>
          <Input autoComplete="name" placeholder="Amina Odhiambo" autoFocus {...register('fullName')} />
        </Field>
        <Field label="Business name" required error={errors.workspace?.message}>
          <Input
            placeholder="Mwangaza Studio"
            {...register('workspace', { onChange: (event) => { if (!slugEdited) setValue('slug', toSlug(event.target.value), { shouldValidate: false }) } })}
          />
        </Field>
        <Field label="Workspace address" required error={errors.slug?.message} help="Your clients will see this in portal links">
          <Input placeholder="mwangaza" trailing={<span className="pr-2 text-small text-ink-500">.kazipay.app</span>} {...register('slug', { onChange: () => setSlugEdited(true) })} className="[&_input]:pr-28" />
        </Field>
        <Field label="Work email" required error={errors.email?.message}>
          <Input type="email" autoComplete="email" placeholder="you@studio.co.ke" {...register('email')} />
        </Field>
        <Field label="Password" required error={errors.password?.message}>
          <Input type={showPassword ? 'text' : 'password'} autoComplete="new-password" placeholder="At least 10 characters" trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />} {...register('password')} />
        </Field>
        {password && (
          <div className="-mt-2 flex items-center gap-3" aria-live="polite">
            <div className="flex flex-1 gap-1">
              {[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-base', i < score ? (score >= 3 ? 'bg-success' : 'bg-[#D98A1C]') : 'bg-ink-200')} />)}
            </div>
            <span className="w-16 text-right text-caption font-semibold text-ink-600">{labels[score]}</span>
          </div>
        )}
        <div>
          <Checkbox label={<span className="font-normal text-ink-700">I agree to the Terms and Privacy Policy</span>} {...register('terms')} />
          {errors.terms && <p role="alert" className="mt-1.5 text-small text-danger">{errors.terms.message}</p>}
        </div>
        <Button type="submit" size="lg" fullWidth loading={isSubmitting}>{isSubmitting ? 'Creating workspace…' : 'Create workspace'}</Button>
      </form>

      <ul className="mt-6 space-y-1.5 text-small text-ink-500">
        {['Unlimited invoices on every plan', 'M-Pesa STK Push built in'].map((item) => (
          <li key={item} className="flex items-center gap-2"><Icon icon={MdCheck} size="sm" className="text-success" />{item}</li>
        ))}
      </ul>
      <p className="mt-6 text-center text-body text-ink-500">Already have a workspace? <Link to="/login" className="rounded-sm font-semibold text-brand-600 hover:text-brand-700 focus-ring">Sign in</Link></p>
    </AuthLayout>
  )
}
