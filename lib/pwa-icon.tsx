import type { CSSProperties } from "react";

const shellStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "#f6faf7",
};

type IconProps = {
  size: number;
  maskable?: boolean;
};

export function PwaIcon({ size, maskable = false }: IconProps) {
  const frameSize = maskable ? Math.round(size * 0.72) : Math.round(size * 0.84);
  const radius = Math.round(frameSize * 0.24);
  const sunSize = Math.round(frameSize * 0.16);
  const lineThick = Math.max(10, Math.round(size * 0.055));

  return (
    <div style={shellStyle}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none">
        <rect width={size} height={size} rx={Math.round(size * 0.25)} fill="#F6FAF7" />
        <rect
          x={(size - frameSize) / 2}
          y={(size - frameSize) / 2}
          width={frameSize}
          height={frameSize}
          rx={radius}
          fill="url(#bg)"
        />
        <circle
          cx={size * 0.705}
          cy={size * 0.285}
          r={sunSize / 2}
          fill="#F59E0B"
        />
        <path
          d={`M ${size * 0.28} ${size * 0.63} L ${size * 0.47} ${size * 0.44} C ${size * 0.49} ${size * 0.42}, ${size * 0.52} ${size * 0.42}, ${size * 0.54} ${size * 0.44} L ${size * 0.665} ${size * 0.565} C ${size * 0.685} ${size * 0.585}, ${size * 0.72} ${size * 0.585}, ${size * 0.74} ${size * 0.565} L ${size * 0.795} ${size * 0.51}`}
          stroke="#F8FAFC"
          strokeWidth={lineThick}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d={`M ${size * 0.28} ${size * 0.735} H ${size * 0.72}`}
          stroke="#F8FAFC"
          strokeOpacity="0.92"
          strokeWidth={Math.max(8, Math.round(size * 0.045))}
          strokeLinecap="round"
        />
        <path
          d={`M ${size * 0.36} ${size * 0.39} H ${size * 0.515}`}
          stroke="#ECFDF5"
          strokeWidth={Math.max(8, Math.round(size * 0.045))}
          strokeLinecap="round"
        />
        <path
          d={`M ${size * 0.36} ${size * 0.47} H ${size * 0.61}`}
          stroke="#D1FAE5"
          strokeWidth={Math.max(8, Math.round(size * 0.045))}
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="bg" x1={size * 0.15} y1={size * 0.16} x2={size * 0.85} y2={size * 0.84} gradientUnits="userSpaceOnUse">
            <stop stopColor="#0F766E" />
            <stop offset="1" stopColor="#16A34A" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
