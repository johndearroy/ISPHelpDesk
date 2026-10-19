import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { categoriesApi } from '../../api/categories'
import { ticketsApi } from '../../api/tickets'
import type { Priority, TicketDetail } from '../../api/types'
import { Button } from '../../components/Button'
import { Field, Input, Select, Textarea } from '../../components/Field'
import { Modal } from '../../components/Modal'
import { PRIORITIES, PRIORITY_LABELS } from '../../lib/format'
import { applyServerErrors } from '../../lib/forms'
import { useTicketMutation } from './useTicketMutation'

const schema = z.object({
  title: z
    .string()
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(150, 'Title is too long'),
  description: z
    .string()
    .trim()
    .min(10, 'Description is too short')
    .max(5000, 'Description is too long'),
  priority: z.string(),
  categoryId: z.string(),
})

type FormValues = z.infer<typeof schema>

type Props = {
  ticket: TicketDetail
  isStaff: boolean
  open: boolean
  onClose: () => void
}

export function EditTicketModal({ ticket, isStaff, open, onClose }: Props) {
  const categories = useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    enabled: isStaff,
  })
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      title: ticket.title,
      description: ticket.description,
      priority: ticket.priority,
      categoryId: String(ticket.category?.id ?? ''),
    },
  })

  const save = useTicketMutation(
    ticket.id,
    (values: FormValues) =>
      ticketsApi.update(
        ticket.id,
        isStaff
          ? {
              title: values.title,
              description: values.description,
              priority: values.priority as Priority,
              categoryId: values.categoryId ? Number(values.categoryId) : null,
            }
          : { title: values.title, description: values.description },
      ),
    'Ticket updated',
  )

  function onSubmit(values: FormValues) {
    save.mutate(values, {
      onSuccess: onClose,
      onError: (error) => applyServerErrors(error, setError),
    })
  }

  return (
    <Modal open={open} title="Edit ticket" onClose={onClose}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <Field label="Title" htmlFor="edit-title" error={errors.title?.message}>
          <Input id="edit-title" invalid={!!errors.title} {...register('title')} />
        </Field>
        <Field label="Description" htmlFor="edit-description" error={errors.description?.message}>
          <Textarea
            id="edit-description"
            rows={6}
            invalid={!!errors.description}
            {...register('description')}
          />
        </Field>
        {isStaff && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Priority" htmlFor="edit-priority">
              <Select id="edit-priority" {...register('priority')}>
                {PRIORITIES.map((priority) => (
                  <option key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Category" htmlFor="edit-category">
              <Select id="edit-category" {...register('categoryId')}>
                <option value="">Uncategorized</option>
                {categories.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={save.isPending}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
