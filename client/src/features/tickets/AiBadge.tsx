import { Cpu, Sparkles } from 'lucide-react'
import { Badge } from '../../components/Badge'

// shows which model answered, or that the local fallback was used
export function AiSourceBadge({ model }: { model: string | null }) {
  if (!model) {
    return (
      <Badge tone="amber">
        <Cpu className="size-3" aria-hidden />
        Local fallback
      </Badge>
    )
  }
  return (
    <Badge tone="violet">
      <Sparkles className="size-3" aria-hidden />
      <span className="max-w-40 truncate" title={model}>
        {model.split('/').pop()}
      </span>
    </Badge>
  )
}
