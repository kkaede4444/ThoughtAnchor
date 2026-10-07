import { useId } from 'react'

export function ArtDefs(): React.JSX.Element {
  return (
    <svg width="0" height="0" className="art-defs" aria-hidden="true">
      <defs>
        <filter id="paper-grain">
          <feTurbulence type="fractalNoise" baseFrequency=".72" numOctaves="3" seed="14" />
          <feColorMatrix type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncR type="discrete" tableValues=".52 .86 .98 1 1" />
            <feFuncG type="discrete" tableValues=".52 .86 .98 1 1" />
            <feFuncB type="discrete" tableValues=".52 .86 .98 1 1" />
          </feComponentTransfer>
        </filter>
        <filter id="watercolor" x="-8%" y="-12%" width="116%" height="124%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency=".065 .13"
            numOctaves="3"
            seed="7"
            result="grain"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="grain"
            scale="2.7"
            xChannelSelector="R"
            yChannelSelector="G"
            result="ragged"
          />
          <feColorMatrix in="grain" type="saturate" values="0" />
          <feComponentTransfer>
            <feFuncA type="linear" slope=".2" />
          </feComponentTransfer>
          <feComposite in2="ragged" operator="in" />
          <feBlend in2="ragged" mode="multiply" />
        </filter>
        <filter id="pencil">
          <feTurbulence type="fractalNoise" baseFrequency=".06 .19" numOctaves="2" seed="12" />
          <feDisplacementMap
            in="SourceGraphic"
            scale="1.4"
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
export function Paint({ color = 'sage' }: { color?: string }): React.JSX.Element {
  const id = useId().replace(/:/g, '')
  return (
    <svg
      className={`paint paint-${color}`}
      viewBox="0 0 300 200"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={id} x1="0" x2=".9" y2="1">
          <stop stopColor="currentColor" stopOpacity=".22" />
          <stop offset=".45" stopColor="currentColor" stopOpacity=".48" />
          <stop offset="1" stopColor="currentColor" stopOpacity=".23" />
        </linearGradient>
      </defs>
      <path
        d="M8 12 Q125 5 291 10 L295 188 Q146 200 6 190Z"
        fill={`url(#${id})`}
        filter="url(#watercolor)"
      />
      <path
        d="M11 21 Q83 6 282 17 L283 43 Q81 38 9 49Z"
        fill="currentColor"
        opacity=".1"
        filter="url(#watercolor)"
      />
    </svg>
  )
}
export function Loader({
  label = '正在把片段之间的空隙想清楚…'
}: {
  label?: string
}): React.JSX.Element {
  const id = useId().replace(/:/g, '')
  return (
    <div className="loading-art" role="status">
      <svg viewBox="0 0 280 112" aria-hidden="true">
        <defs>
          {['#97A77F', '#87A9CE', '#AFA0CB'].map((color, i) => (
            <linearGradient key={color} id={`${id}-g${i}`} x2="1" y2="1">
              <stop stopColor={color} stopOpacity=".26" />
              <stop offset=".45" stopColor={color} stopOpacity=".72" />
              <stop offset="1" stopColor={color} stopOpacity=".4" />
            </linearGradient>
          ))}
          {[0, 1, 2].map((i) => (
            <mask key={i} id={`${id}-m${i}`}>
              <path
                className={`draw-mask draw-${i}`}
                pathLength="1"
                d="M 4 15 Q 70 28 4 46 Q 75 59 4 76"
                stroke="white"
                strokeWidth="28"
                fill="none"
              />
            </mask>
          ))}
        </defs>
        <path
          className="loader-link"
          pathLength="1"
          d="M55 61 C92 22 109 31 139 59 S211 100 237 43"
          fill="none"
          stroke="#898675"
          strokeWidth="1.4"
          filter="url(#pencil)"
        />
        {[0, 1, 2].map((i) => (
          <g
            key={i}
            transform={`translate(${18 + i * 88},${i === 1 ? 8 : 23})`}
            mask={`url(#${id}-m${i})`}
          >
            <path
              d="M5 5 Q40 0 70 8 L68 76 Q40 82 3 72Z"
              fill={`url(#${id}-g${i})`}
              filter="url(#watercolor)"
            />
            <path
              d="M10 20L55 17M11 31L48 29"
              stroke="#585749"
              strokeWidth="1"
              opacity=".4"
              filter="url(#pencil)"
            />
          </g>
        ))}
      </svg>
      <p>{label}</p>
    </div>
  )
}
export function Mark(): React.JSX.Element {
  return (
    <svg viewBox="0 0 36 36" className="brand-mark" aria-hidden="true">
      <path d="M4 7L20 4 24 21 7 24Z" fill="#97A77F" opacity=".7" filter="url(#watercolor)" />
      <path d="M17 14L31 12 33 29 20 32Z" fill="#87A9CE" opacity=".6" filter="url(#watercolor)" />
      <path
        d="M9 17Q15 9 24 22"
        fill="none"
        stroke="#575c4c"
        strokeWidth="1.2"
        filter="url(#pencil)"
      />
    </svg>
  )
}
