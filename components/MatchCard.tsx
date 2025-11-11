import Image from 'next/image'
import { Card } from './ui/card'
import { Button } from './ui/button'
import { Heart, X } from 'lucide-react'
import { Candidate } from '@/lib/api'

interface MatchCardProps {
  candidate: Candidate
  score?: number
  onLike: () => void
  onPass: () => void
}

export function MatchCard({ candidate, score, onLike, onPass }: MatchCardProps) {
  const mainPhoto = candidate.photos[0] || '/placeholders/avatar.png'

  return (
    <Card className="w-full max-w-sm mx-auto overflow-hidden">
      {/* תמונה ראשית */}
      <div className="relative h-96">
        <Image
          src={mainPhoto}
          alt={candidate.name}
          fill
          className="object-cover"
          priority
        />

        {/* תגית התאמה */}
        {score !== undefined && (
          <div className="absolute top-4 right-4 bg-primary text-white px-3 py-1 rounded-full text-sm font-bold">
            התאמה {Math.round(score * 100)}%
          </div>
        )}

        {/* גלריה קטנה */}
        {candidate.photos.length > 1 && (
          <div className="absolute bottom-4 right-4 flex gap-2">
            {candidate.photos.slice(1, 4).map((photo, idx) => (
              <div key={idx} className="w-12 h-12 rounded-lg overflow-hidden border-2 border-white">
                <Image src={photo} alt="" width={48} height={48} className="object-cover" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* פרטים */}
      <div className="p-6">
        <div className="mb-4">
          <h2 className="text-2xl font-bold">
            {candidate.name}, {candidate.age}
          </h2>
          <p className="text-muted-foreground">
            {candidate.city} • {candidate.distanceKm} ק״מ ממך
          </p>
        </div>

        {/* תחומי עניין */}
        {candidate.interests.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {candidate.interests.slice(0, 5).map((interest, idx) => (
              <span
                key={idx}
                className="px-3 py-1 bg-muted text-sm rounded-full"
              >
                {interest}
              </span>
            ))}
          </div>
        )}

        {/* כפתורי פעולה */}
        <div className="flex gap-4 mt-6">
          <Button
            variant="danger"
            size="lg"
            className="flex-1"
            onClick={onPass}
          >
            <X className="ml-2 h-5 w-5" />
            לא מתאים
          </Button>
          <Button
            variant="primary"
            size="lg"
            className="flex-1"
            onClick={onLike}
          >
            <Heart className="ml-2 h-5 w-5" />
            מעוניין
          </Button>
        </div>
      </div>
    </Card>
  )
}
