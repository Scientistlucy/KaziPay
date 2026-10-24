import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { MdArrowBack } from 'react-icons/md'
import { Link, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { Button } from '../../components/ui/Button'
import { Checkbox, Field, Input } from '../../components/ui/Field'
import { Stepper } from '../../components/ui/Stepper'
import { cn } from '../../lib/cn'
import { AuthLayout } from './AuthLayout'
import { PasswordToggle } from './LoginPage'

// Slug rule mirrors the tenants.slug CHECK constraint in V2.
const schema = z.object({
  fullName: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(10, 'Use at least 10 characters'),
  workspace: z.string().trim().min(2, 'Enter your business or studio name').max(255),
  slug: z.string().regex(/^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])$/, 'Use 3–63 lowercase letters, numbers or hyphens'),
  terms: z.literal(true, { errorMap: () => ({ message: 'Accept the terms to continue' }) }),
})
type Values = z.infer<typeof schema>

const steps = [{ label: 'Your account' }, { label: 'Your business' }]
const stepFields: (keyof Values)[][] = [['fullName', 'email', 'password'], ['workspace', 'slug', 'terms']]

const toSlug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 63)

function strength(password: string) {
  return [password.length >= 10, /[A-Z]/.test(password) && /[a-z]/.test(password), /\d/.test(password), /[^A-Za-z0-9]/.test(password)].filter(Boolean).length
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [showPassword, setShowPassword] = useState(false)
  const [slugEdited, setSlugEdited] = useState(false)
  const { register, handleSubmit, setValue, watch, trigger, formState: { errors, isSubmitting } } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', workspace: '', slug: '', email: '', password: '', terms: false as unknown as true },
    mode: 'onTouched',
  })
  const password = watch('password')
  const score = strength(password)

  const next = async () => { if (await trigger(stepFields[0])) setStep(1) }
  const onSubmit = handleSubmit(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1100))
    navigate('/')
  })

  return (
    <AuthLayout>
      <Stepper steps={steps} current={step} compact className="mb-8 max-w-[280px]" />
      <h2 className="text-title">{step === 0 ? 'Create your account' : 'Set up your workspace'}</h2>
      <p className="mt-1.5 text-body text-ink-500">{step === 0 ? 'Free for your first client. No card needed.' : 'This is what your clients see on invoices and in the portal.'}</p>

      <form onSubmit={step === 0 ? (event) => { event.preventDefault(); void next() } : onSubmit} noValidate className="mt-8 space-y-5">
        {step === 0 ? (
          <>
            <Field label="Your name" error={errors.fullName?.message}>
              <Input autoComplete="name" placeholder="Amina Odhiambo" autoFocus {...register('fullName')} />
            </Field>
            <Field label="Work email" error={errors.email?.message}>
              <Input type="email" autoComplete="email" placeholder="you@studio.co.ke" {...register('email')} />
            </Field>
            <Field label="Password" error={errors.password?.message} help={password ? undefined : 'At least 10 characters'}>
              <Input type={showPassword ? 'text' : 'password'} autoComplete="new-password" trailing={<PasswordToggle visible={showPassword} onToggle={() => setShowPassword((v) => !v)} />} {...register('password')} />
            </Field>
            {password && (
              <div className="-mt-3 flex items-center gap-3" aria-live="polite">
                <div className="flex flex-1 gap-1">
                  {[0, 1, 2, 3].map((i) => <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors duration-base', i < score ? 'bg-brand-600' : 'bg-ink-200')} />)}
                </div>
                <span className="w-14 text-right text-caption font-semibold text-ink-600">{['Too short', 'Weak', 'Fair', 'Good', 'Strong'][score]}</span>
              </div>
            )}
            <Button type="submit" size="lg" fullWidth>Continue</Button>
          </>
        ) : (
          <>
            <Field label="Business name" error={errors.workspace?.message}>
              <Input
                placeholder="Mwangaza Studio"
                autoFocus
                {...register('workspace', { onChange: (event) => { if (!slugEdited) setValue('slug', toSlug(event.target.value)) } })}
              />
            </Field>
            <Field label="Workspace address" error={errors.slug?.message} help="Used in your client portal links">
              <Input placeholder="mwangaza" trailing={<span className="pr-2 text-small text-ink-500">.kazipay.app</span>} {...register('slug', { onChange: () => setSlugEdited(true) })} className="[&_input]:pr-28" />
            </Field>
            <div>
              <Checkbox label={<span className="font-normal text-ink-700">I agree to the Terms and Privacy Policy</span>} {...register('terms')} />
              {errors.terms && <p role="alert" className="mt-1.5 text-small text-danger">{errors.terms.message}</p>}
            </div>
            <div className="flex gap-3">
              <Button variant="secondary" size="lg" leadingIcon={MdArrowBack} onClick={() => setStep(0)} disabled={isSubmitting}>Back</Button>
              <Button type="submit" size="lg" className="flex-1" loading={isSubmitting}>{isSubmitting ? 'Creating workspace…' : 'Create workspace'}</Button>
            </div>
          </>
        )}
      </form>

      <p className="mt-8 text-center text-body text-ink-500">Already have a workspace? <Link to="/login" className="rounded-sm font-semibold text-brand-600 hover:text-brand-700 focus-ring">Sign in</Link></p>
    </AuthLayout>
  )
}
