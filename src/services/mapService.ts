import AMapLoader from '@amap/amap-jsapi-loader'
import type { ItineraryItem } from '@/types/plan'

const AMAP_KEY = import.meta.env.VITE_AMAP_KEY || ''
const AMAP_VERSION = '2.0'
const AMAP_PLUGINS = ['AMap.Marker', 'AMap.Polyline', 'AMap.ToolBar', 'AMap.Scale']

let amapLoadPromise: Promise<any> | null = null

// 确保高德地图只加载一次
async function ensureAmapLoaded() {
  if (!AMAP_KEY) {
    throw new Error('VITE_AMAP_KEY 未配置，请在 .env.local 中设置高德地图 API Key')
  }

  // 如果已经加载，直接返回
  if ((window as any).AMap) {
    return (window as any).AMap
  }

  // 如果正在加载，等待加载完成
  if (amapLoadPromise) {
    return amapLoadPromise
  }

  // 开始加载
  amapLoadPromise = AMapLoader.load({
    key: AMAP_KEY,
    version: AMAP_VERSION,
    plugins: AMAP_PLUGINS,
  })

  try {
    const AMap = await amapLoadPromise
    console.log('✅ 高德地图加载成功')
    return AMap
  } catch (error) {
    console.error('❌ 高德地图加载失败:', error)
    amapLoadPromise = null // 重置，允许重试
    throw error
  }
}

export async function createAmap(
  container: HTMLElement,
  center?: { lng: number; lat: number },
  zoom = 12
) {
  try {
    await ensureAmapLoaded()
    const AMap = (window as any).AMap

    console.log('🗺️ 创建地图实例，参数:', { center, zoom })

    // 创建地图实例
    const map = new AMap.Map(container, {
      zoom,
      center: center ? [center.lng, center.lat] : [116.397428, 39.90923],
      viewMode: '2D',
      resizeEnable: true,
      mapStyle: 'amap://styles/normal', // 使用标准样式
    })

    // 等待地图完全加载
    await new Promise((resolve) => {
      map.on('complete', () => {
        console.log('✅ 地图加载完成')
        resolve(true)
      })
    })

    // 添加控件
    try {
      const toolBar = new AMap.ToolBar({ position: 'RB' })
      const scale = new AMap.Scale({ position: 'LB' })
      map.addControl(toolBar)
      map.addControl(scale)
      console.log('✅ 控件已添加')
    } catch (e) {
      console.warn('⚠️ 添加控件失败:', e)
    }

    console.log('✅ 地图创建成功')
    return map
  } catch (error) {
    console.error('❌ 创建地图失败:', error)
    throw error
  }
}

export function renderMarkers(map: any, items: ItineraryItem[]) {
  if (!map || !items || !items.length) {
    console.warn('⚠️ 无法渲染标记：地图或数据为空')
    return []
  }

  const AMap = (window as any).AMap
  if (!AMap) {
    console.error('❌ AMap 未加载')
    return []
  }

  const createdMarkers: any[] = []
  const validPositions: [number, number][] = []

  console.log(`📍 开始渲染 ${items.length} 个行程点...`)

  items.forEach((item, idx) => {
    const lat = (item as any).location_lat ?? (item as any).location?.lat
    const lng = (item as any).location_lng ?? (item as any).location?.lng

    console.log(`  第 ${idx + 1} 项 "${item.title}":`, { lat, lng })

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      console.warn(`  ⚠️ 跳过：坐标无效`)
      return
    }

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn(`  ⚠️ 跳过：坐标超出范围`)
      return
    }

    try {
      // 简化的标记配置
      const marker = new AMap.Marker({
        position: new AMap.LngLat(lng, lat),
        title: item.title,
        map: map, // 直接设置 map
      })

      // 简单的点击事件
      marker.on('click', () => {
        const info = new AMap.InfoWindow({
          content: `<div style="padding: 10px;">
            <strong>${item.title}</strong><br/>
            ${item.description || ''}<br/>
            ${item.address || ''}
          </div>`,
        })
        info.open(map, marker.getPosition())
      })

      createdMarkers.push(marker)
      validPositions.push([lng, lat])
      console.log(`  ✅ 标记已创建并添加到地图`)
    } catch (error) {
      console.error(`  ❌ 创建标记失败:`, error)
    }
  })

  // 调整视野
  if (validPositions.length > 0) {
    try {
      map.setFitView(createdMarkers)
      console.log(`✅ 已渲染 ${createdMarkers.length} 个标记`)
    } catch (error) {
      console.error('❌ 设置视野失败:', error)
    }
  }

  return createdMarkers
}

export function drawPolyline(map: any, items: ItineraryItem[]) {
  if (!map || !items || items.length < 2) {
    console.warn('⚠️ 无法绘制路线：需要至少2个点')
    return null
  }

  const AMap = (window as any).AMap
  if (!AMap) {
    console.error('❌ AMap 未加载')
    return null
  }

  const path: any[] = []

  console.log(`🛣️ 开始绘制路线...`)

  items.forEach((item, idx) => {
    const lat = (item as any).location_lat ?? (item as any).location?.lat
    const lng = (item as any).location_lng ?? (item as any).location?.lng

    if (typeof lat === 'number' && typeof lng === 'number' &&
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      path.push(new AMap.LngLat(lng, lat))
      console.log(`  点 ${idx + 1}: [${lng}, ${lat}]`)
    }
  })

  if (path.length < 2) {
    console.warn('⚠️ 有效点不足2个')
    return null
  }

  try {
    const polyline = new AMap.Polyline({
      path: path,
      strokeColor: '#1890ff',
      strokeWeight: 4,
      strokeOpacity: 0.8,
      map: map, // 直接设置 map
    })

    console.log(`✅ 路线绘制成功，${path.length} 个点`)
    return polyline
  } catch (error) {
    console.error('❌ 绘制路线失败:', error)
    return null
  }
}
