'use client'

/**
 * Fast “GIF”: MP4/WebM in a muted looping <video>, not an animated GIF.
 * Smaller payload and a quicker first frame than a real .gif of the same clip.
 */
export const OFFICE_CLIPS = {
  celebrate: {
    src: '/celebrate-the-office.mp4',
    poster: '/celebrate-the-office.jpg',
  },
  comeOn: {
    src: '/come-on-the-office.mp4',
    poster: '/come-on-the-office.jpg',
  },
} as const

export type OfficeClip = (typeof OFFICE_CLIPS)[keyof typeof OFFICE_CLIPS]

/** Celebrate is the default beat; come-on is an occasional alternate. */
export function pickOfficeClip(): OfficeClip {
  return Math.random() < 0.28 ? OFFICE_CLIPS.comeOn : OFFICE_CLIPS.celebrate
}

export function GifVideo({
  src,
  poster,
  reducedMotion,
  className,
  onEnded,
}: {
  src: string
  poster?: string
  reducedMotion?: boolean
  className?: string
  onEnded?: () => void
}) {
  if (reducedMotion) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={poster ?? src} alt="" className={className} />
    )
  }

  return (
    <video
      src={src}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      className={className}
      onEnded={onEnded}
    />
  )
}
