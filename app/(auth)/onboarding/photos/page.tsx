'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { doc, updateDoc } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth, db, storage } from '@/lib/firebase'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Upload, Image as ImageIcon } from 'lucide-react'

export default function OnboardingPhotosPage() {
  const router = useRouter()
  const [photos, setPhotos] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [uploadProgress, setUploadProgress] = useState<number>(0)

  useEffect(() => {
    if (!auth.currentUser) {
      router.push('/login')
    }
  }, [router])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // בדיקת מספר תמונות
    if (photos.length + files.length > 6) {
      setError('ניתן להעלות עד 6 תמונות')
      return
    }

    // בדיקת סוג ותמונה
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError('ניתן להעלות רק קבצי תמונה')
        return false
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB
        setError('גודל התמונה לא יכול לעבור 5MB')
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    setError('')
    setPhotos([...photos, ...validFiles])

    // יצירת previews
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setPreviews(prev => [...prev, reader.result as string])
      }
      reader.readAsDataURL(file)
    })
  }

  const removePhoto = (index: number) => {
    setPhotos(photos.filter((_, i) => i !== index))
    setPreviews(previews.filter((_, i) => i !== index))
  }

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!auth.currentUser) {
      setError('משתמש לא מחובר')
      return
    }

    if (photos.length === 0) {
      setError('יש להעלות לפחות תמונה אחת')
      return
    }

    setLoading(true)
    setUploadProgress(0)

    try {
      const photoURLs: string[] = []
      const totalPhotos = photos.length

      // העלאת כל תמונה ל-Storage
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i]
        const timestamp = Date.now()
        const fileName = `users/${auth.currentUser.uid}/photos/${timestamp}_${i}.jpg`
        const storageRef = ref(storage, fileName)

        // העלאת התמונה
        await uploadBytes(storageRef, photo)

        // קבלת URL
        const downloadURL = await getDownloadURL(storageRef)
        photoURLs.push(downloadURL)

        // עדכון progress
        setUploadProgress(Math.round(((i + 1) / totalPhotos) * 100))
      }

      // שמירת ה-URLs ב-Firestore
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        photos: photoURLs,
        updatedAt: new Date(),
      })

      router.push('/onboarding/preferences')
    } catch (err) {
      console.error('Error uploading photos:', err)
      setError('שגיאה בהעלאת התמונות. נסה שוב')
    } finally {
      setLoading(false)
      setUploadProgress(0)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">התמונות שלך</CardTitle>
          <CardDescription>הוסף עד 6 תמונות לפרופיל שלך</CardDescription>
          <div className="mt-4 flex gap-2 justify-center">
            <div className="h-2 w-16 bg-primary rounded-full" />
            <div className="h-2 w-16 bg-primary rounded-full" />
            <div className="h-2 w-16 bg-primary rounded-full" />
            <div className="h-2 w-16 bg-gray-200 rounded-full" />
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleNext} className="space-y-4">
            {/* אזור העלאת תמונות */}
            <div className="space-y-2">
              <Label>תמונות ({photos.length}/6)</Label>

              {photos.length < 6 && (
                <label
                  htmlFor="photo-upload"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">לחץ להעלאת תמונות</p>
                    <p className="text-xs text-gray-400 mt-1">עד 5MB לתמונה</p>
                  </div>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              )}

              {/* תצוגה מקדימה של התמונות */}
              {previews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative aspect-square">
                      <img
                        src={preview}
                        alt={`תמונה ${index + 1}`}
                        className="w-full h-full object-cover rounded-lg"
                      />
                      {!loading && (
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}

                  {/* תיבות ריקות */}
                  {Array.from({ length: 6 - previews.length }).map((_, index) => (
                    <div
                      key={`empty-${index}`}
                      className="aspect-square border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center bg-gray-50"
                    >
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Progress bar להעלאה */}
            {loading && uploadProgress > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>מעלה תמונות...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="text-red-500 text-sm text-center bg-red-50 p-2 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => router.push('/onboarding/location')}
                disabled={loading}
              >
                חזרה
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={loading || photos.length === 0}
              >
                {loading ? `מעלה... ${uploadProgress}%` : 'המשך'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
