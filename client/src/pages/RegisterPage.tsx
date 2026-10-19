import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { errorMessage } from '../api/client'
import { Button } from '../components/Button'
import { Field, Input, Select } from '../components/Field'
import { Logo } from '../components/Logo'
import { useRegister } from '../hooks/useAuth'
import { AREAS } from '../lib/format'
import { applyServerErrors } from '../lib/forms'

const schema = z.object({
  name: z.string().trim().min(2, 'Name is too short').max(80, 'Name is too long'),
  email: z.email('Enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[a-zA-Z]/, 'Password must contain a letter')
    .regex(/[0-9]/, 'Password must contain a number'),
  area: z.string().min(1, 'Choose your area'),
})

type FormValues = z.infer<typeof schema>

export function RegisterPage() {
  const registerUser = useRegister()
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { area: '' } })

  async function onSubmit(values: FormValues) {
    try {
      await registerUser.mutateAsync(values)
      toast.success('Your account is ready')
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error(errorMessage(error))
    }
  }

  return (
    <div className="glass w-full max-w-md rounded-3xl p-8">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        Create your account
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        We use your area to spot network problems near you faster.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Field label="Full name" htmlFor="name" error={errors.name?.message}>
          <Input id="name" autoComplete="name" invalid={!!errors.name} {...register('name')} />
        </Field>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            invalid={!!errors.email}
            {...register('email')}
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          error={errors.password?.message}
          hint="At least 8 characters with a letter and a number"
        >
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        <Field label="Area" htmlFor="area" error={errors.area?.message}>
          <Select id="area" invalid={!!errors.area} {...register('area')}>
            <option value="" disabled>
              Select your area
            </option>
            {AREAS.map((area) => (
              <option key={area}>{area}</option>
            ))}
          </Select>
        </Field>
        <Button type="submit" className="w-full" loading={registerUser.isPending}>
          Create account
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{' '}
        <Link
          to="/login"
          className="font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Sign in
        </Link>
      </p>
    </div>
  )
}
