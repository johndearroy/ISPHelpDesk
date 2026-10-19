import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CircleAlert, Lightbulb, Sparkles, ThumbsUp } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { aiApi } from '../api/ai'
import { errorMessage } from '../api/client'
import { ticketsApi } from '../api/tickets'
import { Badge, PriorityBadge } from '../components/Badge'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { Field, Input, Textarea } from '../components/Field'
import { PageHeader } from '../components/PageHeader'
import { AiSourceBadge } from '../features/tickets/AiBadge'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { applyServerErrors } from '../lib/forms'
import { titleCase } from '../lib/format'

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title is too long'),
  description: z
    .string()
    .trim()
    .min(10, 'Please describe the problem in a bit more detail')
    .max(5000, 'Description is too long'),
})

type FormValues = z.infer<typeof schema>

export function NewTicketPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: '', description: '' },
  })

  const values = useWatch({ control })
  const title = useDebouncedValue(values.title ?? '', 1200)
  const description = useDebouncedValue(values.description ?? '', 1200)
  const text = { title, description }
  const readyToCheck = schema.safeParse(text).success

  const check = useQuery({
    queryKey: ['new-ticket-check', text],
    queryFn: () => aiApi.checkNewTicket(text),
    enabled: readyToCheck,
    staleTime: 60_000,
  })

  const preview = useMutation({ mutationFn: aiApi.triagePreview })

  const create = useMutation({
    mutationFn: ticketsApi.create,
    onSuccess: (ticket) => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      toast.success('Ticket created. Our team will look at it soon.')
      navigate(`/tickets/${ticket.id}`)
    },
  })

  const deflect = useMutation({
    mutationFn: aiApi.deflect,
    onSuccess: () => {
      toast.success('Glad that helped. No ticket was created.')
      navigate('/tickets')
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  async function onSubmit(form: FormValues) {
    try {
      await create.mutateAsync(form)
    } catch (error) {
      if (!applyServerErrors(error, setError)) toast.error(errorMessage(error))
    }
  }

  function getSuggestion() {
    const parsed = schema.safeParse(values)
    if (!parsed.success) {
      toast.error('Add a title and a short description first')
      return
    }
    preview.mutate(parsed.data, { onError: (error) => toast.error(errorMessage(error)) })
  }

  return (
    <>
      <PageHeader title="New ticket" description="Tell us what is wrong and we will get on it." />

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-6 lg:col-span-3">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Field label="Title" htmlFor="title" error={errors.title?.message}>
              <Input
                id="title"
                placeholder="For example: No internet since this morning"
                invalid={!!errors.title}
                {...register('title')}
              />
            </Field>
            <Field
              label="Description"
              htmlFor="description"
              error={errors.description?.message}
              hint="English, Banglish or Bangla are all fine. Include when it started and what you already tried."
            >
              <Textarea
                id="description"
                rows={8}
                invalid={!!errors.description}
                {...register('description')}
              />
            </Field>

            {check.data?.duplicate && (
              <div className="flex gap-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-800 ring-1 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/30">
                <CircleAlert className="size-5 shrink-0" aria-hidden />
                <p>
                  This looks like your open ticket{' '}
                  <Link
                    to={`/tickets/${check.data.duplicate.id}`}
                    className="font-semibold underline"
                  >
                    #{check.data.duplicate.id} {check.data.duplicate.title}
                  </Link>
                  . You can add a comment there instead of opening a new one.
                </p>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="secondary" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button type="submit" loading={create.isPending}>
                Submit ticket
              </Button>
            </div>
          </form>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          <Card glass>
            <CardHeader
              title="AI suggestion"
              icon={<Sparkles className="size-4 text-brand-500" aria-hidden />}
              action={preview.data && <AiSourceBadge model={preview.data.model} />}
            />
            <div className="space-y-4 p-5">
              {preview.data ? (
                <>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="blue">{preview.data.category?.name ?? 'Uncategorized'}</Badge>
                    <PriorityBadge priority={preview.data.priority} />
                    <Badge>{titleCase(preview.data.sentiment)}</Badge>
                    <Badge>{titleCase(preview.data.language)}</Badge>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {preview.data.reason}
                  </p>
                  {preview.data.ruleRaisedPriority && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      Priority was raised because the description mentions a critical problem.
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  See how your ticket will be categorized and prioritized before you send it.
                </p>
              )}
              <Button
                variant="secondary"
                size="sm"
                onClick={getSuggestion}
                loading={preview.isPending}
              >
                <Sparkles className="size-4" aria-hidden />
                {preview.data ? 'Check again' : 'Get suggestion'}
              </Button>
            </div>
          </Card>

          <Card glass>
            <CardHeader
              title="Solutions that worked before"
              icon={<Lightbulb className="size-4 text-amber-500" aria-hidden />}
            />
            <div className="p-5">
              {!readyToCheck ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Start describing your problem and similar solved issues will appear here.
                </p>
              ) : check.isFetching && !check.data ? (
                <p className="animate-pulse text-sm text-slate-500">
                  Looking for similar issues...
                </p>
              ) : check.isError ? (
                <p className="text-sm text-rose-600">{check.error.message}</p>
              ) : check.data?.similar.length ? (
                <ul className="space-y-3">
                  {check.data.similar.map((item) => (
                    <li
                      key={item.id}
                      className="rounded-xl bg-white/70 p-3.5 ring-1 ring-slate-200/70 dark:bg-white/5 dark:ring-white/10"
                    >
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {item.title}
                      </p>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {item.resolutionNote}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2 -ml-2"
                        loading={deflect.isPending && deflect.variables === item.id}
                        onClick={() => deflect.mutate(item.id)}
                      >
                        <ThumbsUp className="size-3.5" aria-hidden />
                        This solved my problem
                      </Button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No similar solved issues found. Go ahead and submit your ticket.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </>
  )
}
