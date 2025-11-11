import { cn } from '@/lib/utils'
import { formatRelativeTime } from '@/lib/utils'

interface ChatBubbleProps {
  text: string
  isOwn: boolean
  timestamp: Date
  status?: 'sent' | 'delivered' | 'read'
}

export function ChatBubble({ text, isOwn, timestamp, status }: ChatBubbleProps) {
  return (
    <div className={cn('flex w-full mb-4', isOwn ? 'justify-start' : 'justify-end')}>
      <div className={cn('max-w-[70%] flex flex-col', isOwn ? 'items-start' : 'items-end')}>
        {/* בועת הודעה */}
        <div
          className={cn(
            'px-4 py-2 rounded-2xl',
            isOwn
              ? 'bg-pink-100 text-foreground rounded-tr-sm'
              : 'bg-muted text-foreground rounded-tl-sm'
          )}
        >
          <p className="text-base whitespace-pre-wrap break-words">{text}</p>
        </div>

        {/* זמן וסטטוס */}
        <div className="flex items-center gap-1 mt-1 px-2">
          <span className="text-xs text-muted-foreground">
            {formatRelativeTime(timestamp)}
          </span>
          {isOwn && status && (
            <span className="text-xs text-muted-foreground">
              {status === 'sent' && '✓'}
              {status === 'delivered' && '✓✓'}
              {status === 'read' && '✓✓'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
