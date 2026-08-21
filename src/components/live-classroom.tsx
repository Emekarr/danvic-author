'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  Ban as BanIcon,
  ArrowLeft,
  Camera,
  CameraOff,
  CircleStop,
  Ellipsis,
  EllipsisVertical,
  Hand,
  Maximize2,
  MessageCircle,
  Mic,
  MicOff,
  Minimize2,
  MonitorUp,
  PhoneOff,
  Radio,
  ScreenShareOff,
  Send,
  PenLine,
  ShieldCheck,
  SmilePlus,
  UserRoundX,
  Users,
  Video,
  X,
} from 'lucide-react'

type ModerationAction =
  | 'mute-all'
  | 'camera-off-all'
  | 'mute'
  | 'camera-off'
  | 'kick'
  | 'ban'
  | 'allow-publish'
  | 'block-publish'

type ModerateParticipant = (
  action: ModerationAction,
  participantId?: string,
) => Promise<void>

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
  const router = useRouter()
  const rtc = useRtc(join, setError)
  const [moderationPending, setModerationPending] = useState<ModerationAction | null>(null)
  const [moreOpen, setMoreOpen] = useState(false)
  const [reactionsOpen, setReactionsOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const moderationInFlightRef = useRef(false)
  const session = (state?.session ?? join.session) as LiveState['session'] & {
    whiteboardActive?: boolean
    whiteboardUsedAt?: string | null
  }
  const whiteboardActive = Boolean(session.whiteboardActive && join.whiteboard)
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
  useEffect(() => {
    const leave = () => {
      void api(`/api/live/live-sessions/${join.session.id}/leave`, {
        method: 'POST',
        keepalive: true,
      }).catch(() => undefined)
    }
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) window.location.reload()
    }
    window.addEventListener('pagehide', leave)
    window.addEventListener('pageshow', restore)
    return () => {
      window.removeEventListener('pagehide', leave)
      window.removeEventListener('pageshow', restore)
    }
  }, [join.session.id])
  const moderate: ModerateParticipant = async (action, participantId) => {
    if (moderationInFlightRef.current) return
    moderationInFlightRef.current = true
    setModerationPending(action)
    setError('')
    try {
      await api(`/api/live/live-sessions/${join.session.id}/moderate`, {
        method: 'POST',
        body: JSON.stringify({ action, participantId }),
      })
      await refresh()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Could not update the class controls.')
      throw value
    } finally {
      moderationInFlightRef.current = false
      setModerationPending(null)
    }
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
  const toggleWhiteboard = async () => {
    try {
      const result = await api<{ session: LiveState['session'] }>(
        `/api/live/live-sessions/${join.session.id}/whiteboard`,
        {
          method: 'PATCH',
          body: JSON.stringify({ active: !whiteboardActive }),
        },
      )
      if (state) setState({ ...state, session: result.session })
      await refresh()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Could not update the whiteboard.')
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
  const sendReaction = async (value: string) => {
    try {
      await api(`/api/live/live-sessions/${join.session.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ kind: 'reaction', body: value }),
      })
      setReactionsOpen(false)
      await refresh()
    } catch (value) {
      setError(value instanceof Error ? value.message : 'Could not send your reaction.')
    }
  }
  return (
    <main className="lc-shell">
      <header className="lc-top lc-top--studio">
        <button
          type="button"
          className="lc-minimize"
          aria-label="Minimize classroom"
          onClick={() => router.push('/live-classes')}
        >
          <ArrowLeft />
        </button>
        <div className="lc-session-heading">
          <span className="lc-live-pill"><span className="lc-live-dot" /> Live</span>
          <span>
            <strong>Author studio</strong>
          </span>
        </div>
        <div className="lc-session-meta">
          <span className="lc-time-remaining">
            {join.session.expiresAt
              ? `Ends in ${remainingLabel(join.session.expiresAt)}`
              : 'Time limit active'}
          </span>
          {session.whiteboardUsedAt && (
            <span className={`lc-mode-status${whiteboardActive ? ' is-active' : ''}`}>
              {whiteboardActive ? 'Whiteboard active' : 'Whiteboard ready'}
            </span>
          )}
        </div>
      </header>
      {error && <p className="lc-error" role="alert">{error}</p>}
      <div className="lc-layout">
        <section className={`lc-stage${whiteboardActive ? ' lc-stage--whiteboard' : ''}`}>
          {whiteboardActive && join.whiteboard ? (
            <Whiteboard config={join.whiteboard} uid={`author-${join.participant.actorId}`} />
          ) : (
            <div className="lc-video-grid">
              {!rtc.remoteVideos.length && (
                <div className="lc-alone-state">
                  <Users />
                  <strong>You’re the only one here</strong>
                  <span>Students will appear here automatically when they join the class.</span>
                </div>
              )}
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
          )}
        </section>
        <aside className={`lc-sidebar${detailsOpen ? ' is-open' : ''}`}>
          <div className="lc-details-heading">
            <div><strong>Class details</strong><span>People and messages</span></div>
            <button type="button" aria-label="Close class details" onClick={() => setDetailsOpen(false)}><X /></button>
          </div>
          <ParticipantPanel
            participants={state?.participants ?? []}
            moderate={moderate}
            moderationPending={moderationPending}
          />
          <Chat sessionId={join.session.id} messages={state?.messages ?? []} />
        </aside>
      </div>
      <footer className="lc-controls">
        {reactionsOpen && <ReactionTray onSelect={sendReaction} />}
        <button type="button" className={rtc.cameraOn ? 'is-active' : 'is-off'} disabled={!rtc.joined} onClick={() => toggle('cameraOn')}>
          {rtc.cameraOn ? <Camera /> : <CameraOff />}
          <span>Camera</span>
        </button>
        <button type="button" className={rtc.microphoneOn ? 'is-active' : 'is-off'} disabled={!rtc.joined} onClick={() => toggle('microphoneOn')}>
          {rtc.microphoneOn ? <Mic /> : <MicOff />}
          <span>Microphone</span>
        </button>
        <button
          type="button"
          className={reactionsOpen ? 'is-active' : ''}
          aria-expanded={reactionsOpen}
          onClick={() => { setMoreOpen(false); setReactionsOpen((value) => !value) }}
        >
          <SmilePlus />
          <span>React</span>
        </button>
        <button
          type="button"
          className={moreOpen ? 'is-active' : ''}
          aria-expanded={moreOpen}
          onClick={() => { setReactionsOpen(false); setMoreOpen((value) => !value) }}
        >
          <Ellipsis />
          <span>More</span>
        </button>
        <button type="button" className="is-danger" onClick={() => void onEnd()}>
          <PhoneOff />
          <span>End class</span>
        </button>
      </footer>
      {moreOpen && (
        <div className="lc-sheet-backdrop" onClick={() => setMoreOpen(false)}>
          <section className="lc-more-sheet" role="dialog" aria-modal="true" aria-label="More class controls" onClick={(event) => event.stopPropagation()}>
            <span className="lc-sheet-handle" />
            <div className="lc-sheet-heading"><div><strong>Class controls</strong><span>Manage your live session</span></div><button type="button" aria-label="Close controls" onClick={() => setMoreOpen(false)}><X /></button></div>
            <div className="lc-sheet-grid">
              <button type="button" className={rtc.screenSharing ? 'is-selected' : ''} disabled={!rtc.joined} onClick={() => { setMoreOpen(false); void toggle('screenSharing') }}><span>{rtc.screenSharing ? <ScreenShareOff /> : <MonitorUp />}</span><strong>{rtc.screenSharing ? 'Stop sharing' : 'Share screen'}</strong><small>Present a browser tab or screen.</small></button>
              <button type="button" className={whiteboardActive ? 'is-selected' : ''} disabled={!rtc.joined || !join.whiteboard} onClick={() => { setMoreOpen(false); void toggleWhiteboard() }}><span><PenLine /></span><strong>{whiteboardActive ? 'Show cameras' : 'Whiteboard'}</strong><small>Switch the class presentation mode.</small></button>
              <button type="button" onClick={() => { setDetailsOpen(true); setMoreOpen(false) }}><span><Users /></span><strong>People & chat</strong><small>View attendees, moderation and messages.</small></button>
              <button type="button" disabled={Boolean(moderationPending)} onClick={() => void moderate('mute-all').catch(() => undefined)}><span><MicOff /></span><strong>{moderationPending === 'mute-all' ? 'Muting…' : 'Mute class'}</strong><small>Turn off all student microphones.</small></button>
              <button type="button" disabled={Boolean(moderationPending)} onClick={() => void moderate('camera-off-all').catch(() => undefined)}><span><CameraOff /></span><strong>{moderationPending === 'camera-off-all' ? 'Turning off…' : 'Cameras off'}</strong><small>Turn off all student cameras.</small></button>
              {recording?.status === 'recording' ? (
                <button type="button" className="is-danger" onClick={() => void stopRecord()}><span><CircleStop /></span><strong>Stop recording</strong><small>Finish the current recording.</small></button>
              ) : (
                <>
                  <button type="button" onClick={() => void record('web')}><span><Video /></span><strong>Record class</strong><small>Capture the full classroom page.</small></button>
                  <button type="button" onClick={() => void record('audio')}><span><Mic /></span><strong>Record audio</strong><small>Capture class audio only.</small></button>
                </>
              )}
            </div>
          </section>
        </div>
      )}
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
      setRemoteVideos([])
      rtcClient.on('user-published', (user, mediaType) => {
        void rtcClient
          .subscribe(user, mediaType)
          .then(() => {
            if (mediaType === 'audio') user.audioTrack?.play()
            if (mediaType === 'video' && user.videoTrack)
              setRemoteVideos((values) => [
                ...values.filter((item) => item.uid !== user.uid),
                { uid: user.uid, track: user.videoTrack! },
              ])
          })
          .catch((value: unknown) =>
            onError(value instanceof Error ? value.message : 'Could not receive a live stream'),
          )
      })
      rtcClient.on('user-unpublished', (user, mediaType) => {
        if (mediaType === 'video')
          setRemoteVideos((values) => values.filter((item) => item.uid !== user.uid))
      })
      rtcClient.on('user-left', (user) => {
        setRemoteVideos((values) => values.filter((item) => item.uid !== user.uid))
      })
      rtcClient.on('connection-state-change', (current) => {
        setJoined(current === 'CONNECTED' || current === 'RECONNECTING')
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
            () =>
              void (async () => {
                await set('screenSharing', false)
                await api(`/api/live/live-sessions/${join.session.id}/me`, {
                  method: 'PATCH',
                  body: JSON.stringify({ screenSharing: false }),
                })
              })().catch((value: unknown) =>
                onError(
                  value instanceof Error
                    ? value.message
                    : 'Could not finish screen sharing cleanly.',
                ),
              ),
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
    const client = clientRef.current
    clientRef.current = null
    setJoined(false)
    setRemoteVideos([])
    for (const ref of [audioRef, cameraRef, screenRef]) {
      ref.current?.stop()
      ref.current?.close()
      ref.current = null
    }
    setMicrophoneOn(false)
    setCameraOn(false)
    setScreenSharing(false)
    setCameraTrack(null)
    await client?.leave()
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
  const containerRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (track && cameraOn && !screenSharing && ref.current) track.play(ref.current)
    return () => track?.stop()
  }, [track, cameraOn, screenSharing])
  return (
    <div className="lc-video lc-video--local" ref={containerRef}>
      <div ref={ref} className="lc-video-canvas">
        {(!cameraOn || screenSharing) && <CameraOff />}
      </div>
      <span>{label}</span>
      <FullscreenButton targetRef={containerRef} />
    </div>
  )
}
function RemoteVideo({ remote }: { remote: { uid: string | number; track: IRemoteVideoTrack } }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (ref.current) remote.track.play(ref.current)
    return () => remote.track.stop()
  }, [remote])
  return (
    <div className="lc-video" ref={containerRef}>
      <div ref={ref} className="lc-video-canvas" />
      <span>Participant {remote.uid}</span>
      <FullscreenButton targetRef={containerRef} />
    </div>
  )
}
function FullscreenButton({ targetRef }: { targetRef: { current: HTMLDivElement | null } }) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const update = () => setActive(document.fullscreenElement === targetRef.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [targetRef])
  return (
    <button
      type="button"
      className="lc-video-fullscreen"
      title={active ? 'Exit full screen' : 'View camera full screen'}
      aria-label={active ? 'Exit full screen' : 'View camera full screen'}
      onClick={() => {
        if (active) void document.exitFullscreen()
        else void targetRef.current?.requestFullscreen()
      }}
    >
      {active ? <Minimize2 /> : <Maximize2 />}
    </button>
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
  moderationPending,
}: {
  participants: LiveParticipant[]
  moderate: ModerateParticipant
  moderationPending: ModerationAction | null
}) {
  const active = participants.filter((participant) => !participant.leftAt)
  return (
    <section className="lc-panel lc-participant-panel">
      <div className="lc-panel-heading">
        <h3><Users /> People</h3>
        <span>{active.length} in class</span>
      </div>
      <div className="lc-participants">
        {active.length ? active.map((p) => (
            <div className="lc-person" key={p.id}>
              <span className="lc-person-avatar" aria-hidden="true">{initials(p.displayName)}</span>
              <div className="lc-person-copy">
                <span className="lc-person-name">
                  <strong>{p.displayName}</strong>
                  {p.handRaised && <span className="lc-hand-raised"><Hand /> Hand raised</span>}
                </span>
                <small>{p.actorType === 'author' ? 'Tutor' : p.canPublish ? 'On stage' : 'Attendee'}</small>
              </div>
              <div className="lc-person-media" aria-label="Media status">
                {p.microphoneOn ? <Mic aria-label="Microphone on" /> : <MicOff aria-label="Microphone off" />}
                {p.cameraOn ? <Camera aria-label="Camera on" /> : <CameraOff aria-label="Camera off" />}
              </div>
              {p.actorType === 'student' && (
                <ParticipantActionMenu
                  participant={p}
                  moderate={moderate}
                  disabled={Boolean(moderationPending)}
                />
              )}
            </div>
          )) : <p className="lc-panel-empty">No one else has joined yet.</p>}
      </div>
    </section>
  )
}

function ParticipantActionMenu({
  participant,
  moderate,
  disabled,
}: {
  participant: LiveParticipant
  moderate: ModerateParticipant
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [working, setWorking] = useState<ModerationAction | null>(null)
  const [menuError, setMenuError] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const dismiss = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', dismiss)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', dismiss)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  const options: Array<{
    action: ModerationAction
    name: string
    description: string
    icon: typeof MicOff
    danger?: boolean
  }> = [
    { action: 'mute', name: 'Mute microphone', description: 'Stops their current audio stream.', icon: MicOff },
    { action: 'camera-off', name: 'Turn camera off', description: 'Stops their camera and screen share.', icon: CameraOff },
    participant.canPublish
      ? { action: 'block-publish', name: 'Move to audience', description: 'Removes permission to publish audio or video.', icon: ShieldCheck }
      : { action: 'allow-publish', name: 'Invite to stage', description: 'Lets them turn on their microphone or camera.', icon: Hand },
    { action: 'kick', name: 'Remove from class', description: 'Ends this attendance session.', icon: UserRoundX, danger: true },
    { action: 'ban', name: 'Ban for 24 hours', description: 'Removes them and blocks re-entry for one day.', icon: BanIcon, danger: true },
  ]
  const run = async (option: (typeof options)[number]) => {
    setWorking(option.action)
    setMenuError('')
    try {
      await moderate(option.action, participant.id)
      setOpen(false)
    } catch (value) {
      setMenuError(value instanceof Error ? value.message : 'This action could not be completed.')
    } finally {
      setWorking(null)
    }
  }
  return (
    <div className="lc-person-menu" ref={menuRef}>
      <button
        type="button"
        className="lc-person-menu-trigger"
        aria-label={`Manage ${participant.displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((value) => !value)}
      >
        <EllipsisVertical />
      </button>
      {open && (
        <div className="lc-person-menu-popover" role="menu" aria-label={`Actions for ${participant.displayName}`}>
          <div className="lc-person-menu-title">
            <strong>Manage attendee</strong>
            <span>Choose one action for {participant.displayName}.</span>
          </div>
          {menuError && <p className="lc-person-menu-error" role="alert">{menuError}</p>}
          {options.map((option) => {
            const Icon = option.icon
            return (
              <button
                type="button"
                role="menuitem"
                className={option.danger ? 'is-danger' : ''}
                disabled={disabled || Boolean(working)}
                key={option.action}
                onClick={() => void run(option)}
              >
                <span className="lc-person-menu-icon"><Icon /></span>
                <span><strong>{working === option.action ? 'Applying…' : option.name}</strong><small>{option.description}</small></span>
              </button>
            )
          })}
        </div>
      )}
    </div>
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
        <button type="submit" aria-label="Send message">
          <Send />
          <span>Send</span>
        </button>
      </form>
    </section>
  )
}

function ReactionTray({
  onSelect,
}: {
  onSelect: (value: string) => Promise<void>
}) {
  return (
    <div className="lc-dock-reactions" role="dialog" aria-label="Choose a reaction">
      {['👍', '👏', '❤️', '🎉', '😂', '🤔', '🔥', '🙌'].map((emoji) => (
        <button type="button" key={emoji} aria-label={`React with ${emoji}`} onClick={() => void onSelect(emoji)}>
          {emoji}
        </button>
      ))}
    </div>
  )
}

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, init)
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'A'
}
