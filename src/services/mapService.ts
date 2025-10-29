import AMapLoader from '@amap/amap-jsapi-loader'
import type { ItineraryItem } from '@/types/plan'

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || ''

export async function createAmap(container: HTMLElement, center?: { lng: number; lat: number }, zoom = 10) {
  if (!AMAP_KEY) {
    throw new Error('VITE_AMAP_KEY 未配置，地图功能不可用')
  }

  await AMapLoader.load({
    key: AMAP_KEY,
    version: '2.0', // 使用 2.x API
    plugins: ['AMap.Marker', 'AMap.ToolBar', 'AMap.Scale'],
  })

  // @ts-ignore
  const map = new (window as any).AMap.Map(container, {
    center: center ? [center.lng, center.lat] : undefined,
    zoom,
  })

  // 添加控件
  try {
    // @ts-ignore
    const toolBar = new (window as any).AMap.ToolBar()
    // @ts-ignore
    const scale = new (window as any).AMap.Scale()
    map.addControl(toolBar)
    map.addControl(scale)
  } catch {}

  return map
}

export function renderMarkers(map: any, items: ItineraryItem[]) {
  if (!map || !items || !items.length) return []

  const createdMarkers: any[] = []
  items.forEach((it, idx) => {
    const lat = (it as any).location_lat ?? (it as any).location?.lat
    const lng = (it as any).location_lng ?? (it as any).location?.lng
    if (typeof lat !== 'number' || typeof lng !== 'number') return

    // @ts-ignore
    const marker = new (window as any).AMap.Marker({
      position: [lng, lat],
      title: it.title || `Item ${idx + 1}`,
      map,
    })
    createdMarkers.push(marker)
  })

  if (createdMarkers.length) {
    // @ts-ignore
    map.setFitView(createdMarkers)
  }

  return createdMarkers
}
