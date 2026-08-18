'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  IAgoraRTCClient,
  ICameraVideoTrack,
  ILocalAudioTrack,
  ILocalVideoTrack,
  IRemoteVideoTrack,
} from 'agora-rtc-sdk-ng'
import { Fastboard, useFastboard } from '@netless/fastboard-react'
import {
  apiFetch,
  type LiveJoinConfig,
  type LiveMessage,
  type LiveParticipant,
  type LiveRecording,
  type LiveSession,
  type LiveState,
  type WhiteboardJoinConfig,
} from '@danvic/api-client'
import {
  Camera,
  CameraOff,
  CircleStop,
  Hand,
  MessageCircle,
  Mic,
  MicOff,
  MonitorUp,
  Radio,
  ScreenShareOff,
  UserRoundX,
  Users,
  Video,
} from 'lucide-react'

export function AuthorLiveClassroom({
  courseId,
  courseName,
  initialSession,
}: {
  courseId: string | null
  courseName: string
  initialSession: LiveSession | null
}) {
  const [session, setSession] = useState(initialSession)
  const [join, setJoin] = useState<LiveJoinConfig | null>(null)
  const [state, setState] = useState<LiveState | null>(null)
  const [recording, setRecording] = useState<LiveRecording | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(true)
  const sessionRef = useRef<LiveSession | null>(initialSession)

  const goLive = useCallback(async () => {
    setBusy(true)
    setError('')
    try {
      let current = sessionRef.current
      if (!current) {
        if (!courseId) throw new Error('A standalone live class must be created from Live classes.')
        const created = await api<{ session: LiveSession }>(
          `/api/live/courses/${courseId}/live-session`,
          { method: 'POST', body: '{}' },
        )
        current = created.session
        sessionRef.current = current
        setSession(current)
      }
      if (current.status === 'scheduled') {
        const started = await api<{ session: LiveSession }>(
          `/api/live/live-sessions/${current.id}/start`,
          { method: 'POST', body: '{}' },
        )
        current = started.session
        sessionRef.current = current
        setSession(current)
      }
      if (current.status === 'live') {
        const joined = await api<LiveJoinConfig>(`/api/live/live-sessions/${current.id}/join`, {
          method: 'POST',
          body: '{}',
        })
        setJoin(joined)
      }
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Could not enter the studio.')
    } finally {
      setBusy(false)
    }
  }, [courseId])

  useEffect(() => {
    const timer = window.setTimeout(() => void goLive(), 0)
    return () => window.clearTimeout(timer)
  }, [goLive])

  if (join)
    return (
      <Classroom
        join={join}
        state={state}
        setState={setState}
        error={error}
        setError={setError}
        recording={recording}
        setRecording={setRecording}
        onEnd={async () => {
          await api(`/api/live/live-sessions/${join.session.id}/end`, {
            method: 'POST',
            body: '{}',
          })
          sessionRef.current = { ...join.session, status: 'ended' }
          setSession(sessionRef.current)
          setJoin(null)
        }}
        onExpired={() => {
          sessionRef.current = { ...join.session, status: 'ended' }
          setSession(sessionRef.current)
          setJoin(null)
          setError('This live class reached its scheduled time limit.')
        }}
      />
    )

  return (
    <section className="lc-launch">
      <span className={`lc-status lc-status--${session?.status ?? 'live'}`}>
        {busy ? 'Connecting' : (session?.status ?? 'Live')}
      </span>
      <h2>{courseName}</h2>
      <p>
        {busy
          ? 'Preparing your live studio…'
          : session?.status === 'ended'
            ? 'This session has ended. Start a new session to teach again.'
            : 'Something went wrong entering the studio.'}
      </p>
      {!busy && session?.status === 'ended' && (
        <button
          className="sb-button sb-button--primary sb-button--md"
          onClick={() => {
            sessionRef.current = null
            setSession(null)
            void goLive()
          }}
        >
          <Radio /> New session
        </button>
      )}
      {!busy && error && (
        <button
          className="sb-button sb-button--primary sb-button--md"
          onClick={() => void goLive()}
        >
          <Radio /> Retry
        </button>
      )}
      {error && <p className="lc-error">{error}</p>}
    </section>
  )
}

function Classroom({
  join,
  state,
  setState,
  error,
  setError,
  recording,
  setRecording,
  onEnd,
  onExpired,
}: {
  join: LiveJoinConfig
  state: LiveState | null
  setState: (value: LiveState) => void
  error: string
  setError: (value: string) => void
  recording: LiveRecording | null
  setRecording: (value: LiveRecording | null) => void
  onEnd: () => Promise<void>
  onExpired: () => void
}) {
  const rtc = useRtc(join, setError)
  const refresh = useCallback(async () => {
    try {
      const value = await api<LiveState>(`/api/live/live-sessions/${join.session.id}/state`)
      setState(value)
      if (value.session.status === 'ended') {
        await rtc.leave()
        onExpired()
      }
    } catch {
      /* retain last known state */
    }
  }, [join.session.id, onExpired, rtc, setState])
  useEffect(() => {
    void refresh()
    const timer = window.setInterval(() => void refresh(), 2000)
    return () => window.clearInterval(timer)
  }, [refresh])
  const moderate = async (action: string, participantId?: string) => {
    await api(`/api/live/live-sessions/${join.session.id}/moderate`, {
      method: 'POST',
      body: JSON.stringify({ action, participantId }),
    })
    await refresh()
  }
  const toggle = async (field: 'microphoneOn' | 'cameraOn' | 'screenSharing') => {
    const enabled = !rtc[field]
    try {
      await rtc.set(field, enabled)
      await api(`/api/live/live-sessions/${join.session.id}/me`, {
        method: 'PATCH',
        body: JSON.stringify({ [field]: enabled }),
      })
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Could not update the broadcast.')
    }
  }
  const record = async (type: 'web' | 'audio') => {
    try {
      const result = await api<{ recording: LiveRecording }>(
        `/api/live/live-sessions/${join.session.id}/recordings`,
        { method: 'POST', body: JSON.stringify({ type }) },
      )
      setRecording(result.recording)
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Recording failed')
    }
  }
  const stopRecord = async () => {
    if (!recording) return
    const result = await api<{ recording: LiveRecording }>(
      `/api/live/live-sessions/${join.session.id}/recordings/${recording.id}/stop`,
      { method: 'POST', body: '{}' },
    )
    setRecording(result.recording)
  }
  return (
    <main className="lc-shell">
      <header className="lc-top">
        <div>
          <span className="lc-live-dot" /> Live · Author broadcast
        </div>
        <span className="lc-time-remaining">
          {join.session.expiresAt
            ? `Ends in ${remainingLabel(join.session.expiresAt)}`
            : 'Time limit active'}
        </span>
        <div className="lc-actions">
          <button
            className="sb-button sb-button--secondary sb-button--sm"
            onClick={() => moderate('mute-all')}
          >
            <MicOff /> Mute all
          </button>
          <button
            className="sb-button sb-button--secondary sb-button--sm"
            onClick={() => moderate('camera-off-all')}
          >
            <CameraOff /> Cameras off
          </button>
          {recording?.status === 'recording' ? (
            <button className="sb-button sb-button--danger sb-button--sm" onClick={stopRecord}>
              <CircleStop /> Stop recording
            </button>
          ) : (
            <>
              <button
                className="sb-button sb-button--secondary sb-button--sm"
                onClick={() => record('web')}
              >
                <Video /> Record page
              </button>
              <button
                className="sb-button sb-button--secondary sb-button--sm"
                onClick={() => record('audio')}
              >
                <Mic /> Record audio
              </button>
            </>
          )}
          <button className="sb-button sb-button--danger sb-button--sm" onClick={onEnd}>
            End class
          </button>
        </div>
      </header>
      {error && <p className="lc-error">{error}</p>}
      <div className="lc-layout">
        <section className="lc-stage">
          <div className="lc-video-grid">
            <LocalVideo
              track={rtc.cameraTrack}
              cameraOn={rtc.cameraOn}
              screenSharing={rtc.screenSharing}
              label="You (course author)"
            />
            {rtc.remoteVideos.map((remote) => (
              <RemoteVideo key={remote.uid} remote={remote} />
            ))}
          </div>
          {join.whiteboard && (
            <Whiteboard config={join.whiteboard} uid={`author-${join.participant.actorId}`} />
          )}
        </section>
        <aside className="lc-sidebar">
          <ParticipantPanel participants={state?.participants ?? []} moderate={moderate} />
          <Chat sessionId={join.session.id} messages={state?.messages ?? []} />
        </aside>
      </div>
      <footer className="lc-controls">
        <button disabled={!rtc.joined} onClick={() => toggle('microphoneOn')}>
          {rtc.microphoneOn ? <Mic /> : <MicOff />}
          <span>{rtc.microphoneOn ? 'Mute' : 'Unmute'}</span>
        </button>
        <button disabled={!rtc.joined} onClick={() => toggle('cameraOn')}>
          {rtc.cameraOn ? <Camera /> : <CameraOff />}
          <span>{rtc.cameraOn ? 'Camera off' : 'Camera on'}</span>
        </button>
        <button disabled={!rtc.joined} onClick={() => toggle('screenSharing')}>
          {rtc.screenSharing ? <ScreenShareOff /> : <MonitorUp />}
          <span>{rtc.screenSharing ? 'Stop share' : 'Share screen'}</span>
        </button>
      </footer>
    </main>
  )
}

function useRtc(join: LiveJoinConfig, onError: (value: string) => void) {
  const clientRef = useRef<IAgoraRTCClient | null>(null)
  const audioRef = useRef<ILocalAudioTrack | null>(null)
  const cameraRef = useRef<ICameraVideoTrack | null>(null)
  const screenRef = useRef<ILocalVideoTrack | null>(null)
  const cameraPausedForScreenRef = useRef(false)
  const agoraRtcRef = useRef<typeof import('agora-rtc-sdk-ng').default | null>(null)
  const joinPromiseRef = useRef<Promise<void> | null>(null)
  const leavePromiseRef = useRef<Promise<void>>(Promise.resolve())
  const [microphoneOn, setMicrophoneOn] = useState(false),
    [cameraOn, setCameraOn] = useState(false),
    [screenSharing, setScreenSharing] = useState(false)
  const [cameraTrack, setCameraTrack] = useState<ICameraVideoTrack | null>(null)
  const [joined, setJoined] = useState(false)
  const [remoteVideos, setRemoteVideos] = useState<
    Array<{ uid: string | number; track: IRemoteVideoTrack }>
  >([])
  useEffect(() => {
    let disposed = false
    let client: IAgoraRTCClient | null = null
    const previousLeave = leavePromiseRef.current
    const connect = async () => {
      await previousLeave
      if (disposed) return
      const AgoraRTC = (await import('agora-rtc-sdk-ng')).default
      if (disposed) return
      setJoined(false)
      agoraRtcRef.current = AgoraRTC
      const rtcClient = AgoraRTC.createClient({ mode: 'live', codec: 'vp8', role: 'host' })
      client = rtcClient
      clientRef.current = rtcClient
      rtcClient.on('user-published', async (user, mediaType) => {
        await rtcClient.subscribe(user, mediaType)
        if (mediaType === 'audio') user.audioTrack?.play()
        if (mediaType === 'video' && user.videoTrack)
          setRemoteVideos((values) => [
            ...values.filter((item) => item.uid !== user.uid),
            { uid: user.uid, track: user.videoTrack! },
          ])
      })
      rtcClient.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'video')
          setRemoteVideos((values) => values.filter((item) => item.uid !== user.uid))
      })
      await rtcClient.join(join.appId, join.channelName, join.rtcToken, join.uid)
      if (disposed) await rtcClient.leave()
      else setJoined(true)
    }
    const joinPromise = connect().catch((error: unknown) => {
      onError(error instanceof Error ? error.message : 'Could not join Agora')
      throw error
    })
    joinPromiseRef.current = joinPromise
    void joinPromise.catch(() => undefined)
    return () => {
      disposed = true
      setJoined(false)
      for (const track of [audioRef.current, cameraRef.current, screenRef.current]) {
        track?.stop()
        track?.close()
      }
      if (joinPromiseRef.current === joinPromise) joinPromiseRef.current = null
      if (clientRef.current === client) clientRef.current = null
      const leavePromise = joinPromise.then(() => client?.leave()).catch(() => undefined)
      leavePromiseRef.current = leavePromise
      void leavePromise
    }
  }, [join, onError])
  const set = async (field: 'microphoneOn' | 'cameraOn' | 'screenSharing', enabled: boolean) => {
    const client = clientRef.current
    const joinPromise = joinPromiseRef.current
    const AgoraRTC = agoraRtcRef.current
    if (!client || !joinPromise || !AgoraRTC)
      throw new Error('Still connecting to the live classroom.')
    const screenTrackPromise =
      field === 'screenSharing' && enabled ? AgoraRTC.createScreenVideoTrack({}, 'disable') : null
    const screenTrackValue = screenTrackPromise ? await screenTrackPromise : null
    await joinPromise
    if (clientRef.current !== client) return
    if (field === 'microphoneOn') {
      if (!audioRef.current) audioRef.current = await AgoraRTC.createMicrophoneAudioTrack()
      await audioRef.current.setEnabled(enabled)
      if (enabled) await client.publish(audioRef.current)
      else await client.unpublish(audioRef.current)
      setMicrophoneOn(enabled)
    }
    if (field === 'cameraOn') {
      if (!cameraRef.current) {
        cameraRef.current = await AgoraRTC.createCameraVideoTrack()
        setCameraTrack(cameraRef.current)
      }
      await cameraRef.current.setEnabled(enabled)
      if (enabled) await client.publish(cameraRef.current)
      else await client.unpublish(cameraRef.current)
      setCameraOn(enabled)
    }
    if (field === 'screenSharing') {
      if (enabled) {
        const cameraTrack = cameraRef.current
        cameraPausedForScreenRef.current = Boolean(cameraTrack && cameraOn)
        if (cameraPausedForScreenRef.current && cameraTrack) {
          await client.unpublish(cameraTrack)
          await cameraTrack.setEnabled(false)
        }
        try {
          const screenTrack = Array.isArray(screenTrackValue)
            ? screenTrackValue[0]
            : screenTrackValue
          if (!screenTrack) throw new Error('Could not start screen sharing.')
          screenRef.current = screenTrack
          await client.publish(screenTrack)
          screenTrack.on(
            'track-ended',
            () => void set('screenSharing', false).catch(() => undefined),
          )
        } catch (error) {
          if (cameraPausedForScreenRef.current && cameraTrack) {
            await cameraTrack.setEnabled(true)
            await client.publish(cameraTrack)
          }
          cameraPausedForScreenRef.current = false
          throw error
        }
      } else if (screenRef.current) {
        await client.unpublish(screenRef.current)
        screenRef.current.stop()
        screenRef.current.close()
        screenRef.current = null
        if (cameraPausedForScreenRef.current && cameraRef.current) {
          await cameraRef.current.setEnabled(true)
          await client.publish(cameraRef.current)
        }
        cameraPausedForScreenRef.current = false
      }
      setScreenSharing(enabled)
    }
  }
  const leave = async () => {
    await clientRef.current?.leave()
  }
  return { microphoneOn, cameraOn, screenSharing, cameraTrack, remoteVideos, joined, set, leave }
}

function remainingLabel(expiresAt: string): string {
  const minutes = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 60_000))
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes} min`
}

function LocalVideo({
  track,
  cameraOn,
  screenSharing,
  label,
}: {
  track: ICameraVideoTrack | null
  cameraOn: boolean
  screenSharing: boolean
  label: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (track && cameraOn && !screenSharing && ref.current) track.play(ref.current)
    return () => track?.stop()
  }, [track, cameraOn, screenSharing])
  return (
    <div className="lc-video">
      <div ref={ref} className="lc-video-canvas">
        {(!cameraOn || screenSharing) && <CameraOff />}
      </div>
      <span>{label}</span>
    </div>
  )
}
function RemoteVideo({ remote }: { remote: { uid: string | number; track: IRemoteVideoTrack } }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) remote.track.play(ref.current)
    return () => remote.track.stop()
  }, [remote])
  return (
    <div className="lc-video">
      <div ref={ref} className="lc-video-canvas" />
      <span>Participant {remote.uid}</span>
    </div>
  )
}
function Whiteboard({ config, uid }: { config: WhiteboardJoinConfig; uid: string }) {
  const app = useFastboard(() => ({
    sdkConfig: { appIdentifier: config.appIdentifier, region: 'us-sv' },
    joinRoom: {
      uid,
      uuid: config.roomUuid,
      roomToken: config.roomToken,
      isWritable: config.writable,
    },
  }))
  return (
    <section className="lc-whiteboard">
      <h3>Collaborative whiteboard</h3>
      <div className="lc-whiteboard-canvas">
        <Fastboard app={app} />
      </div>
    </section>
  )
}

function ParticipantPanel({
  participants,
  moderate,
}: {
  participants: LiveParticipant[]
  moderate: (action: string, participantId?: string) => Promise<void>
}) {
  return (
    <section className="lc-panel">
      <h3>
        <Users /> Participants ({participants.filter((p) => !p.leftAt).length})
      </h3>
      <div className="lc-participants">
        {participants
          .filter((p) => !p.leftAt)
          .map((p) => (
            <div className="lc-person" key={p.id}>
              <div>
                <strong>{p.displayName}</strong>
                <small>
                  {p.actorType}
                  {p.handRaised ? ' · ✋ hand raised' : ''}
                </small>
              </div>
              {p.actorType === 'student' && (
                <div className="lc-person-actions">
                  <button title="Mute" onClick={() => moderate('mute', p.id)}>
                    <MicOff />
                  </button>
                  <button title="Turn camera off" onClick={() => moderate('camera-off', p.id)}>
                    <CameraOff />
                  </button>
                  <button
                    title={p.canPublish ? 'Return to audience' : 'Allow speaking'}
                    onClick={() => moderate(p.canPublish ? 'block-publish' : 'allow-publish', p.id)}
                  >
                    <Hand />
                  </button>
                  <button title="Kick" onClick={() => moderate('kick', p.id)}>
                    <UserRoundX />
                  </button>
                  <button title="Ban" onClick={() => moderate('ban', p.id)}>
                    Ban
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </section>
  )
}
function Chat({ sessionId, messages }: { sessionId: string; messages: LiveMessage[] }) {
  const [body, setBody] = useState('')
  const send = async (kind: 'chat' | 'reaction', value: string) => {
    if (!value.trim()) return
    await api(`/api/live/live-sessions/${sessionId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ kind, body: value }),
    })
    setBody('')
  }
  return (
    <section className="lc-panel lc-chat">
      <h3>
        <MessageCircle /> Live chat
      </h3>
      <div className="lc-messages">
        {messages.map((message) => (
          <p key={message.id}>
            <strong>{message.displayName}</strong> {message.body}
          </p>
        ))}
      </div>
      <div className="lc-reactions">
        {['👍', '👏', '❤️', '🎉'].map((emoji) => (
          <button key={emoji} onClick={() => send('reaction', emoji)}>
            {emoji}
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void send('chat', body)
        }}
      >
        <input
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Message the class"
        />
        <button aria-label="Send">
          <MessageCircle />
        </button>
      </form>
    </section>
  )
}

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, init)
}
