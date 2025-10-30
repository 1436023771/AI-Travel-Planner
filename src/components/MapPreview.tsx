import { useEffect, useRef, useState } from 'react'
import { Spin, Alert } from 'antd'
import type { ItineraryItem } from '@/types/plan'
import { createAmap, renderMarkers, drawPolyline } from '@/services/mapService'

interface MapPreviewProps {
  items?: ItineraryItem[] | null
  height?: number | string
  showRoute?: boolean
}

export const MapPreview = ({ items = [], height = 400, showRoute = true }: MapPreviewProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const polylineRef = useRef<any>(null)
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 初始化地图
  useEffect(() => {
    let mounted = true

    const initMap = async () => {
      if (!containerRef.current) {
        console.warn('⚠️ 地图容器未就绪')
        return
      }

      console.log('🗺️ 开始初始化地图，容器尺寸:', {
        width: containerRef.current.offsetWidth,
        height: containerRef.current.offsetHeight,
      })

      try {
        setLoading(true)
        setError(null)
        
        // 计算中心点
        let center: { lng: number; lat: number } | undefined
        if (items && items.length > 0) {
          const firstItem = items[0]
          const lat = (firstItem as any).location_lat ?? (firstItem as any).location?.lat
          const lng = (firstItem as any).location_lng ?? (firstItem as any).location?.lng
          
          if (typeof lat === 'number' && typeof lng === 'number') {
            center = { lat, lng }
            console.log('📍 使用第一个点作为中心:', center)
          }
        }

        const map = await createAmap(containerRef.current, center)
        
        if (mounted) {
          mapRef.current = map
          setLoading(false)
          
          // 延迟渲染标记，确保地图完全加载
          setTimeout(() => {
            if (items && items.length > 0 && mapRef.current) {
              console.log('🎯 延迟渲染标记和路线...')
              const markers = renderMarkers(mapRef.current, items)
              markersRef.current = markers
              
              if (showRoute && items.length > 1) {
                const line = drawPolyline(mapRef.current, items)
                polylineRef.current = line
              }
            }
          }, 500)
        }
      } catch (e: any) {
        console.error('❌ 地图初始化失败:', e)
        if (mounted) {
          setError(e.message || '地图加载失败')
          setLoading(false)
        }
      }
    }

    initMap()

    return () => {
      mounted = false
      // 清理资源
      try {
        markersRef.current.forEach(m => {
          if (m && m.setMap) m.setMap(null)
        })
        if (polylineRef.current && polylineRef.current.setMap) {
          polylineRef.current.setMap(null)
        }
        if (mapRef.current && mapRef.current.destroy) {
          mapRef.current.destroy()
        }
      } catch (e) {
        console.warn('清理地图资源失败:', e)
      }
    }
  }, [])

  // 监听 items 变化，更新标记
  useEffect(() => {
    if (!mapRef.current || !items || items.length === 0) return

    console.log('🔄 items 更新，重新渲染标记:', items.length)

    // 清除旧标记
    markersRef.current.forEach(m => {
      if (m && m.setMap) {
        m.setMap(null)
      }
    })
    markersRef.current = []

    // 清除旧路线
    if (polylineRef.current && polylineRef.current.setMap) {
      polylineRef.current.setMap(null)
      polylineRef.current = null
    }

    // 延迟一点时间再渲染，确保地图稳定
    const timer = setTimeout(() => {
      if (mapRef.current) {
        const markers = renderMarkers(mapRef.current, items)
        markersRef.current = markers

        if (showRoute && items.length > 1) {
          const line = drawPolyline(mapRef.current, items)
          polylineRef.current = line
        }
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [items, showRoute])

  if (error) {
    return (
      <Alert
        message="地图加载失败"
        description={
          <div>
            <p>{error}</p>
            {error.includes('VITE_AMAP_KEY') && (
              <div style={{ marginTop: 8 }}>
                <p>请按以下步骤配置高德地图 API Key：</p>
                <ol style={{ paddingLeft: 20 }}>
                  <li>访问 <a href="https://console.amap.com/dev/key/app" target="_blank" rel="noopener noreferrer">高德开放平台</a></li>
                  <li>注册/登录并创建应用</li>
                  <li>选择 "Web端(JS API)"</li>
                  <li>复制 Key 到 .env.local 文件的 VITE_AMAP_KEY</li>
                  <li>重启开发服务器</li>
                </ol>
              </div>
            )}
          </div>
        }
        type="error"
        showIcon
        style={{ height }}
      />
    )
  }

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      {loading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f5f5f5',
            zIndex: 10,
          }}
        >
          <Spin size="large" tip="加载地图中..." />
        </div>
      )}
      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          minHeight: typeof height === 'number' ? `${height}px` : height,
        }} 
      />
    </div>
  )
}
