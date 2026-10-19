import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { errorMessage } from '../api/client'
import { Button } from '../components/Button'
import { Field, Input } from '../components/Field'
import { Logo } from '../components/Logo'
import { DEMO_PASSWORD, DemoLogins } from '../features/auth/DemoLogins'
import { useLogin } from '../hooks/useAuth'

const schema = z.object({
  email: z.email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
})

type FormValues = z.infer<typeof schema>

export function LoginPage() {
  const login = useLogin()
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    try {
      const user = await login.mutateAsync(values)
      toast.success(`Welcome back, ${user.name.split(' ')[0]}`)
    } catch (error) {
      toast.error(errorMessage(error))
    }
  }

  function fillDemo(email: string) {
    setValue('email', email, { shouldValidate: true })
    setValue('password', DEMO_PASSWORD, { shouldValidate: true })
  }

  return (
    <div className="glass w-full max-w-md rounded-3xl p-8">
      <Logo />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
        Sign in
      </h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Report a problem or check on your tickets.
      </p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
        <Field label="Email" htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            invalid={!!errors.email}
            {...register('email')}
          />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            invalid={!!errors.password}
            {...register('password')}
          />
        </Field>
        <Button type="submit" className="w-full" loading={login.isPending}>
          Sign in
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-slate-500 dark:text-slate-400">
        New customer?{' '}
        <Link
          to="/register"
          className="font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Create an account
        </Link>
      </p>

      <DemoLogins onPick={fillDemo} />
    </div>
  )
}
