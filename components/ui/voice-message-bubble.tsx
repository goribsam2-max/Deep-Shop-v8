"use client"

import * as React from "react"
import { Play, Pause } from "lucide-react"
import { cn } from "@/lib/utils"

interface VoiceMessageBubbleProps {
  audioSrc: string
  duration: number // in seconds
  bubbleColor?: string
  waveColor?: string
  isMe?: boolean
  className?: string
  onEnded?: () => void
  autoPlay?: boolean
}

export default function VoiceMessageBubble({
  audioSrc,
  duration,
  bubbleColor,
  waveColor = "#fff",
  isMe = false,
  className,
  onEnded,
  autoPlay = false,
}: VoiceMessageBubbleProps) {
  const [isPlaying, setIsPlaying] = React.useState(false)
  const [progress, setProgress] = React.useState(0)
  const [currentTime, setCurrentTime] = React.useState(0)
  const [speed, setSpeed] = React.useState(1)
  const [isDragging, setIsDragging] = React.useState(false)

  const audioRef = React.useRef<HTMLAudioElement | null>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Initialize Audio
  React.useEffect(() => {
    const audio = new Audio(audioSrc)
    audioRef.current = audio
    audio.playbackRate = speed

    const handleTimeUpdate = () => {
      if (!isDragging) {
        setCurrentTime(audio.currentTime)
        setProgress((audio.currentTime / (audio.duration || duration || 1)) * 100)
      }
    }

    const handleEnded = () => {
      setIsPlaying(false)
      setProgress(0)
      setCurrentTime(0)
      audio.currentTime = 0
      if (onEnded) onEnded()
    }

    const handleLoadedMetadata = () => {
      // Audio duration loaded
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("ended", handleEnded)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)

    if (autoPlay) {
      audio.play()
        .then(() => setIsPlaying(true))
        .catch(err => console.error("Autoplay voice message failed:", err))
    }

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("ended", handleEnded)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.pause()
    }
  }, [audioSrc, autoPlay])

  // React to playback speed change
  React.useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed
    }
  }, [speed])

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation()
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.pause()
      setIsPlaying(false)
    } else {
      audio.play().catch(err => console.error("Audio playback failed", err))
      setIsPlaying(true)
    }
  }

  const cycleSpeed = (e: React.MouseEvent) => {
    e.stopPropagation()
    const speeds = [0.5, 1, 1.5, 2, 3]
    const nextIndex = (speeds.indexOf(speed) + 1) % speeds.length
    setSpeed(speeds[nextIndex])
  }

  // Handle seeking / scrubbing
  const handleSeek = (clientX: number) => {
    const container = containerRef.current
    const audio = audioRef.current
    if (!container || !audio) return

    const rect = container.getBoundingClientRect()
    const relativeX = clientX - rect.left
    const percentage = Math.max(0, Math.min(1, relativeX / rect.width))
    
    const targetDuration = audio.duration || duration || 1
    const newTime = percentage * targetDuration
    
    setCurrentTime(newTime)
    setProgress(percentage * 100)
    
    if (!isDragging) {
      audio.currentTime = newTime
    }
  }

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setIsDragging(true)
    handleSeek(e.clientX)
  }

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation()
    setIsDragging(true)
    handleSeek(e.touches[0].clientX)
  }

  React.useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleSeek(e.clientX)
    }

    const handleTouchMove = (e: TouchEvent) => {
      handleSeek(e.touches[0].clientX)
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      if (audioRef.current) {
        audioRef.current.currentTime = (progress / 100) * (audioRef.current.duration || duration || 1)
      }
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    window.addEventListener("mouseup", handleMouseUp)
    window.addEventListener("touchend", handleMouseUp)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("mouseup", handleMouseUp)
      window.removeEventListener("touchend", handleMouseUp)
    }
  }, [isDragging, progress, duration])

  // Beautiful Messenger waveform bars
  const waveBars = [
    6, 12, 18, 10, 14, 22, 28, 16, 12, 24, 
    30, 20, 14, 26, 32, 24, 12, 18, 26, 22, 
    10, 16, 24, 30, 18, 12, 20, 14, 8, 12, 
    16, 10, 14, 6, 10
  ]

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity) return "0:00"
    const m = Math.floor(secs / 60)
    const s = Math.floor(secs % 60)
    return `${m}:${s.toString().padStart(2, "0")}`
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex items-center gap-2.5 p-2 rounded-2xl w-full max-w-[290px] select-none transition-all",
        isMe ? "bg-indigo-600 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100",
        className
      )}
      style={bubbleColor ? { backgroundColor: bubbleColor } : undefined}
    >
      {/* Play/Pause Trigger */}
      <button
        onClick={togglePlay}
        className={cn(
          "h-8 w-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-90 hover:opacity-90 shadow-sm",
          isMe ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"
        )}
      >
        {isPlaying ? (
          <Pause className="w-4 h-4 fill-current" />
        ) : (
          <Play className="w-4 h-4 fill-current translate-x-[1px]" />
        )}
      </button>

      {/* Waveform & Progress Container */}
      <div className="flex-1 flex flex-col gap-1 min-w-0">
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className="h-7 relative cursor-pointer flex items-center min-w-[110px]"
        >
          {/* Base wave (Unplayed) */}
          <div className="absolute inset-0 flex justify-between items-center px-0.5 gap-[2px]">
            {waveBars.map((h, idx) => (
              <div
                key={`base-${idx}`}
                className="rounded-full flex-1"
                style={{
                  height: `${h}px`,
                  backgroundColor: waveColor,
                  opacity: isMe ? 0.4 : 0.3,
                }}
              />
            ))}
          </div>

          {/* Active wave overlay (Played) */}
          <div
            className="absolute top-0 left-0 h-full overflow-hidden transition-[width] duration-75"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 flex justify-between items-center px-0.5 gap-[2px] w-[140px] sm:w-[160px] md:w-auto min-w-full">
              {waveBars.map((h, idx) => (
                <div
                  key={`played-${idx}`}
                  className="rounded-full flex-1"
                  style={{
                    height: `${h}px`,
                    backgroundColor: waveColor,
                    opacity: 1,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Timer Label */}
        <div className="flex justify-between items-center px-0.5">
          <span className={cn("text-[9px] font-bold font-mono tracking-wide", isMe ? "text-white/80" : "text-zinc-500 dark:text-zinc-400")}>
            {formatTime(currentTime)} / {formatTime(audioRef.current?.duration || duration)}
          </span>
        </div>
      </div>

      {/* Speed Control Indicator */}
      <button
        onClick={cycleSpeed}
        className={cn(
          "h-6 px-1.5 py-0.5 rounded-lg text-[9px] font-black font-mono shrink-0 transition-all uppercase tracking-wider hover:opacity-95 active:scale-95 border",
          isMe 
            ? "bg-white/10 text-white hover:bg-white/20 border-white/20" 
            : "bg-zinc-200 dark:bg-zinc-700/50 text-zinc-600 dark:text-zinc-300 border-zinc-300/30 dark:border-zinc-700/50"
        )}
      >
        {speed}x
      </button>
    </div>
  )
}
