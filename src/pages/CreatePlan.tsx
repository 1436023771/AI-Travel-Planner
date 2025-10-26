import { useState, useRef } from 'react'
import { Card, Form, Input, DatePicker, InputNumber, Button, Space, message, Divider } from 'antd'
import { SoundOutlined, StopOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import { aiService } from '@/services/aiService'
import { createVoiceRecorder } from '@/services/voiceService'
import { planService } from '@/services/planService'
import { useAuthStore } from '@/store/authStore'
import type { CreatePlanInput } from '@/types/plan'

const { RangePicker } = DatePicker
const recorder = createVoiceRecorder()

export const CreatePlan = () => {
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [aiResult, setAiResult] = useState<any>(null)
  const [rawText, setRawText] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const { user } = useAuthStore()
  const formRef = useRef<any>(null)

  const startRecording = async () => {
    if (!recorder.supported) {
      message.warning('当前浏览器不支持 Web Speech API，请使用文字输入。')
      return
    }
    try {
      setIsRecording(true)
      recorder.onResult((text) => {
        setTranscript((prev) => (prev ? prev + '\n' + text : text))
      })
      recorder.onError((err) => {
        message.error(String(err))
        setIsRecording(false)
      })
      await recorder.start()
    } catch (e) {
      message.error('无法开始录音：' + String(e))
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    try {
      recorder.stop()
    } finally {
      setIsRecording(false)
    }
  }

  const handleGenerate = async (values?: any) => {
    const formValues = values || (formRef.current && formRef.current.getFieldsValue())
    if (!formValues.destination || !formValues.dateRange) {
      message.error('请填写目的地和日期区间')
      return
    }
    const [start, end] = formValues.dateRange
    const input: CreatePlanInput = {
      destination: formValues.destination,
      startDate: dayjs(start).format('YYYY-MM-DD'),
      endDate: dayjs(end).format('YYYY-MM-DD'),
      budget: formValues.budget || 0,
      travelers: formValues.travelers || 1,
      preferences: (formValues.preferences || '') + (transcript ? `；语音备注：${transcript}` : ''),
    }

    setGenerating(true)
    setAiResult(null)
    try {
      const { plan, raw } = await aiService.generateItinerary(input)
      setRawText(raw)
      if (plan) {
        setAiResult(plan)
        message.success('AI 行程生成完成（已解析）')
      } else {
        // fallback: show raw
        setAiResult({ note: '无法解析为 JSON，查看原文。' })
        message.warning('AI 返回无法解析为 JSON，请查看「原始输出」')
      }
    } catch (e: any) {
      message.error('生成失败：' + (e.message || String(e)))
    } finally {
      setGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!user) {
      message.error('请先登录后保存计划')
      return
    }
    if (!aiResult) {
      message.error('请先生成行程')
      return
    }
    setLoading(true)
    try {
      const saved = await planService.savePlan(user.id, aiResult)
      message.success('旅行计划已保存')
    } catch (e: any) {
      message.error('保存失败：' + (e.message || String(e)))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>创建旅行计划</h1>

      <Card style={{ marginTop: 16 }}>
        <Form
          layout="vertical"
          ref={formRef}
          initialValues={{ travelers: 1 }}
          onFinish={handleGenerate}
        >
          <Form.Item name="destination" label="目的地" rules={[{ required: true }]}>
            <Input placeholder="例如：日本 东京" />
          </Form.Item>

          <Form.Item name="dateRange" label="出行日期" rules={[{ required: true }]}>
            <RangePicker />
          </Form.Item>

          <Form.Item name="budget" label="预算（元）">
            <InputNumber min={0} style={{ width: 200 }} />
          </Form.Item>

          <Form.Item name="travelers" label="出行人数">
            <InputNumber min={1} style={{ width: 120 }} />
          </Form.Item>

          <Form.Item name="preferences" label="偏好（文字描述，可选）">
            <Input.TextArea rows={3} placeholder="例如：喜欢美食、亲子游、爱逛博物馆" />
          </Form.Item>

          <Form.Item label="语音输入（可选）">
            <Space>
              <Button
                icon={<SoundOutlined />}
                onClick={startRecording}
                disabled={isRecording}
              >
                开始录音
              </Button>
              <Button
                icon={<StopOutlined />}
                onClick={stopRecording}
                disabled={!isRecording}
              >
                停止
              </Button>
              <Button onClick={() => { setTranscript(''); message.success('已清空语音内容') }}>
                清空语音文本
              </Button>
            </Space>

            <Input.TextArea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={4}
              style={{ marginTop: 12 }}
              placeholder="录音识别结果或手动输入的语音备注将追加到偏好中"
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={generating}>
                生成 AI 行程
              </Button>
              <Button onClick={() => { formRef.current?.resetFields(); setTranscript(''); setAiResult(null) }}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Divider />

      <div>
        <h2>AI 生成结果</h2>
        {!aiResult && <p style={{ color: '#666' }}>请填写信息并点击“生成 AI 行程”</p>}
        {aiResult && (
          <Card style={{ marginTop: 12 }}>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
              {JSON.stringify(aiResult, null, 2)}
            </pre>

            {rawText && (
              <>
                <Divider />
                <h4>原始输出（LLM）</h4>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                  {rawText}
                </pre>
              </>
            )}

            <div style={{ marginTop: 12 }}>
              <Space>
                <Button type="primary" onClick={handleSave} loading={loading}>
                  保存到云端
                </Button>
                <Button onClick={() => navigator.clipboard?.writeText(JSON.stringify(aiResult, null, 2))}>
                  复制 JSON
                </Button>
              </Space>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
