import { Card } from './ui/card'
import { Button } from './ui/button'
import { Lightbulb } from 'lucide-react'

interface OpeningLine {
  text: string
  tag?: string
}

interface ConversationStartersProps {
  openingLines: OpeningLine[]
  onSelect: (text: string) => void
}

export function ConversationStarters({ openingLines, onSelect }: ConversationStartersProps) {
  if (openingLines.length === 0) return null

  return (
    <Card className="p-4 mb-4 bg-accent/50">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h3 className="font-semibold">פתיחי שיחה מומלצים</h3>
      </div>

      <div className="space-y-2">
        {openingLines.map((line, idx) => (
          <Button
            key={idx}
            variant="outline"
            className="w-full justify-start text-right h-auto py-3 px-4"
            onClick={() => onSelect(line.text)}
          >
            <div className="flex flex-col items-start gap-1">
              <span className="text-sm">{line.text}</span>
              {line.tag && (
                <span className="text-xs text-muted-foreground">#{line.tag}</span>
              )}
            </div>
          </Button>
        ))}
      </div>
    </Card>
  )
}
