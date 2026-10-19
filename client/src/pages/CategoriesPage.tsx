import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { categoriesApi } from '../api/categories'
import { errorMessage } from '../api/client'
import type { Category } from '../api/types'
import { Button } from '../components/Button'
import { Card, CardHeader } from '../components/Card'
import { EmptyState, ErrorState, Skeleton } from '../components/Feedback'
import { Field, Input } from '../components/Field'
import { Modal } from '../components/Modal'
import { PageHeader } from '../components/PageHeader'

type FormState = { id?: number; name: string; description: string }

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState | null>(null)
  const [nameError, setNameError] = useState('')
  const [deleting, setDeleting] = useState<Category | null>(null)

  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['categories'] })

  const save = useMutation({
    mutationFn: (values: FormState) => {
      const input = {
        name: values.name.trim(),
        description: values.description.trim() || undefined,
      }
      return values.id ? categoriesApi.update(values.id, input) : categoriesApi.create(input)
    },
    onSuccess: (_, values) => {
      refresh()
      toast.success(values.id ? 'Category updated' : 'Category added')
      setForm(null)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  const remove = useMutation({
    mutationFn: (id: number) => categoriesApi.remove(id),
    onSuccess: () => {
      refresh()
      toast.success('Category deleted')
      setDeleting(null)
    },
    onError: (error) => toast.error(errorMessage(error)),
  })

  function submit() {
    if (!form) return
    if (form.name.trim().length < 2) {
      setNameError('Name is too short')
      return
    }
    save.mutate(form)
  }

  return (
    <>
      <PageHeader
        title="Categories"
        description="Used for ticket triage. The AI picks from this list."
        actions={
          <Button onClick={() => setForm({ name: '', description: '' })}>
            <Plus className="size-4" aria-hidden />
            Add category
          </Button>
        }
      />

      <Card>
        <CardHeader title="All categories" />
        {categories.isError ? (
          <ErrorState message={categories.error.message} onRetry={() => categories.refetch()} />
        ) : !categories.data ? (
          <div className="space-y-2 p-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : categories.data.length === 0 ? (
          <EmptyState
            title="No categories"
            description="Add the first category to start triaging tickets."
          />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {categories.data.map((category) => (
              <li key={category.id} className="flex items-center justify-between gap-4 px-5 py-3.5">
                <div className="min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white">{category.name}</p>
                  <p className="truncate text-sm text-slate-500">{category.description}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <span className="mr-2 text-xs text-slate-400">
                    {category._count.tickets} tickets
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Edit ${category.name}`}
                    onClick={() =>
                      setForm({
                        id: category.id,
                        name: category.name,
                        description: category.description ?? '',
                      })
                    }
                  >
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${category.name}`}
                    onClick={() => setDeleting(category)}
                  >
                    <Trash2 className="size-4 text-rose-500" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={!!form}
        title={form?.id ? 'Edit category' : 'Add category'}
        onClose={() => setForm(null)}
      >
        {form && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault()
              submit()
            }}
          >
            <Field label="Name" htmlFor="category-name" error={nameError}>
              <Input
                id="category-name"
                value={form.name}
                invalid={!!nameError}
                maxLength={50}
                onChange={(event) => {
                  setForm({ ...form, name: event.target.value })
                  setNameError('')
                }}
              />
            </Field>
            <Field
              label="Description"
              htmlFor="category-description"
              hint="Helps the AI understand when to use it"
            >
              <Input
                id="category-description"
                value={form.description}
                maxLength={200}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
              />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={() => setForm(null)}>
                Cancel
              </Button>
              <Button type="submit" loading={save.isPending}>
                Save
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Modal
        open={!!deleting}
        title={`Delete ${deleting?.name}?`}
        onClose={() => setDeleting(null)}
      >
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {deleting?._count.tickets
            ? `${deleting._count.tickets} tickets use this category. They will become uncategorized.`
            : 'No tickets use this category.'}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={remove.isPending}
            onClick={() => deleting && remove.mutate(deleting.id)}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </>
  )
}
