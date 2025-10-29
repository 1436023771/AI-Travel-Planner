import { useEffect, useRef } from 'react'
import type { ItineraryItem } from '@/types/plan'
import { createAmap, renderMarkers } from '@/services/mapService'

interface MapPreviewProps {
  items?: ItineraryItem[] | null
  height?: number | string
}

export const MapPreview = ({ items = [], height = 400 }: MapPreviewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])

  useEffect(() => {
    let mounted = true
    if (!containerRef.current) return

    ;(async () => {
      try {
        mapRef.current = await createAmap(containerRef.current)
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('初始化地图失败', e)
      }
    })()

    return () => {
      mounted = false
      try {
        markersRef.current.forEach(m => m && m.setMap && m.setMap(null))
        if (mapRef.current && mapRef.current.destroy) {
          mapRef.current.destroy()
        }
      } catch {}
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) return
    // 清除旧 markers
    markersRef.current.forEach(m => m && m.setMap && m.setMap(null))
    markersRef.current = renderMarkers(mapRef.current, items || [])
  }, [items])

  return <div ref={containerRef} style={{ width: '100%', height }} />
}
