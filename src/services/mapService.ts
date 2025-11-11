import AMapLoader from '@amap/amap-jsapi-loader'
import type { ItineraryItem } from '@/types/plan'
import { configManager } from '@/utils/configManager'

// 使用配置管理器获取高德地图 Key
const getAmapKey = () => configManager.getAmapKey()

const AMAP_VERSION = '2.0'
const AMAP_PLUGINS = ['AMap.Marker', 'AMap.Polyline', 'AMap.ToolBar', 'AMap.Scale']

let amapLoadPromise: Promise<any> | null = null

// 确保高德地图只加载一次
async function ensureAmapLoaded() {
  const amapKey = getAmapKey()
  
  if (!amapKey) {
    throw new Error('高德地图 API Key 未配置，请在首页配置或检查 .env.local 文件')
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
    key: amapKey,
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
  const coordinateMap = new Map<string, string[]>() // 用于检测重复坐标
  let skippedCount = 0

  console.log(`📍 开始渲染 ${items.length} 个行程点...`)

  items.forEach((item, idx) => {
    const lat = (item as any).location_lat ?? (item as any).location?.lat
    const lng = (item as any).location_lng ?? (item as any).location?.lng

    console.log(`  第 ${idx + 1} 项 "${item.title}":`, { lat, lng })

    // 跳过无效坐标
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      console.warn(`  ⚠️ 跳过：坐标类型无效`)
      skippedCount++
      return
    }

    // 跳过坐标为 0 的点（通常是无效或占位坐标）
    if (lat === 0 && lng === 0) {
      console.warn(`  ⚠️ 跳过：坐标为 (0, 0)，可能是无效坐标`)
      skippedCount++
      return
    }

    // 跳过坐标为 0 的点（单独为 0 也跳过）
    if (lat === 0 || lng === 0) {
      console.warn(`  ⚠️ 跳过：坐标包含 0，可能是无效坐标`)
      skippedCount++
      return
    }

    // 跳过超出有效范围的坐标
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      console.warn(`  ⚠️ 跳过：坐标超出有效范围 (lat: ${lat}, lng: ${lng})`)
      skippedCount++
      return
    }

    // 中国大陆坐标范围检查（可选，如果只做国内旅行）
    // if (lat < 18 || lat > 54 || lng < 73 || lng > 135) {
    //   console.warn(`  ⚠️ 警告：坐标不在中国大陆范围内 (lat: ${lat}, lng: ${lng})`)
    // }

    // 检测重复坐标
    const coordKey = `${lat.toFixed(4)},${lng.toFixed(4)}`
    if (!coordinateMap.has(coordKey)) {
      coordinateMap.set(coordKey, [])
    }
    coordinateMap.get(coordKey)!.push(item.title)

    try {
      const marker = new AMap.Marker({
        position: new AMap.LngLat(lng, lat),
        title: item.title,
        map: map,
      })

      marker.on('click', () => {
        const info = new AMap.InfoWindow({
          content: `<div style="padding: 10px;">
            <strong>${item.title}</strong><br/>
            ${item.description || ''}<br/>
            ${item.address || ''}<br/>
            <small style="color: #999;">坐标: ${lat.toFixed(4)}, ${lng.toFixed(4)}</small>
          </div>`,
        })
        info.open(map, marker.getPosition())
      })

      createdMarkers.push(marker)
      validPositions.push([lng, lat])
      console.log(`  ✅ 标记已创建并添加到地图`)
    } catch (error) {
      console.error(`  ❌ 创建标记失败:`, error)
      skippedCount++
    }
  })

  // 检查并警告重复坐标
  const duplicates = Array.from(coordinateMap.entries()).filter(([_, titles]) => titles.length > 1)
  if (duplicates.length > 0) {
    console.warn('⚠️ 检测到重复坐标：')
    duplicates.forEach(([coord, titles]) => {
      console.warn(`  坐标 ${coord} 被以下地点共用：`, titles.join(', '))
    })
  }

  // 调整视野
  if (validPositions.length > 0) {
    try {
      map.setFitView(createdMarkers)
      console.log(`✅ 已渲染 ${createdMarkers.length} 个标记`)
      if (skippedCount > 0) {
        console.log(`⚠️ 跳过了 ${skippedCount} 个无效坐标`)
      }
      if (duplicates.length > 0) {
        console.log(`⚠️ 其中 ${duplicates.length} 组坐标重复`)
      }
    } catch (error) {
      console.error('❌ 设置视野失败:', error)
    }
  } else {
    console.warn('⚠️ 没有有效的坐标点可以渲染')
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

    // 过滤掉无效坐标（包括 0）
    if (typeof lat === 'number' && typeof lng === 'number' &&
        lat !== 0 && lng !== 0 && // 跳过坐标为 0 的点
        lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      path.push(new AMap.LngLat(lng, lat))
      console.log(`  点 ${idx + 1}: [${lng}, ${lat}] - ${item.title}`)
    } else {
      console.warn(`  ⚠️ 跳过点 ${idx + 1} "${item.title}"：坐标无效或为 0`)
    }
  })

  if (path.length < 2) {
    console.warn('⚠️ 有效坐标点不足2个，无法绘制路线')
    return null
  }

  try {
    const polyline = new AMap.Polyline({
      path: path,
      strokeColor: '#1890ff',
      strokeWeight: 4,
      strokeOpacity: 0.8,
      map: map,
    })

    console.log(`✅ 路线绘制成功，${path.length} 个点`)
    return polyline
  } catch (error) {
    console.error('❌ 绘制路线失败:', error)
    return null
  }
}
