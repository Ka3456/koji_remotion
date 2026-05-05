import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const RED = "#C0392B";
const RED_DARK = "#7B241C";
const RED_LIGHT = "#E74C3C";
const DARK = "#1A0000";

export type Format11Props = {
  situation: string;
  label?: string;
  characterImage?: string;
};

export const Format11: React.FC<Format11Props> = ({
  situation,
  label = "危険な状況",
  characterImage = "assets/images/stressed-man-worker.png",
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const s = (delay: number, stiff = 150, damp = 26) =>
    spring({ frame: frame - delay, fps, config: { stiffness: stiff, damping: damp } });

  const labelAnim = s(0, 180, 20);
  const iconAnim = s(6, 100, 12);
  const textAnim = s(18, 140, 26);

  // 警告アイコンのパルス
  const pulse = 1 + Math.sin((frame / fps) * Math.PI * 2.2) * 0.06;

  const glowIntensity = interpolate(
    Math.sin((frame / fps) * Math.PI * 1.5),
    [-1, 1],
    [0.3, 0.7],
  );

  const exitStart = durationInFrames - 90;
  const fadeOut = interpolate(frame, [exitStart, exitStart + 20], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(145deg, ${DARK} 0%, ${RED_DARK} 50%, ${RED} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        opacity: fadeOut,
        fontFamily: "'Hiragino Maru Gothic Pro', 'Rounded Mplus 1p', 'Noto Sans JP', sans-serif",
      }}
    >
      <Audio src={staticFile("assets/music/bgm_danger.mp3")} loop volume={0.4} />

      {/* 背景グロー */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 700,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${RED}88 0%, transparent 70%)`,
          opacity: glowIntensity,
        }}
      />

      {/* 装飾ドット */}
      {[...Array(16)].map((_, i) => {
        const angle = (i / 16) * Math.PI * 2;
        const r = 500;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: RED_LIGHT,
              opacity: 0.25,
              left: `calc(50% + ${Math.cos(angle) * r}px - 6px)`,
              top: `calc(50% + ${Math.sin(angle) * r}px - 6px)`,
            }}
          />
        );
      })}

      {/* ラベル pill */}
      <div
        style={{
          backgroundColor: RED_LIGHT,
          borderRadius: 50,
          padding: "12px 56px",
          transform: `translateY(${interpolate(labelAnim, [0, 1], [40, 0])}px)`,
          opacity: labelAnim,
          marginBottom: 28,
          boxShadow: "0 4px 24px rgba(231,76,60,0.5)",
        }}
      >
        <span
          style={{
            fontSize: 72,
            fontWeight: 800,
            color: "#FFFFFF",
            letterSpacing: 8,
          }}
        >
          ⚠️ {label}
        </span>
      </div>

      {/* 警告アイコン */}
      <div
        style={{
          fontSize: 200,
          lineHeight: 1,
          transform: `scale(${interpolate(iconAnim, [0, 1], [0.3, 1]) * pulse})`,
          opacity: iconAnim,
          marginBottom: 16,
          filter: "drop-shadow(0 0 32px rgba(231,76,60,0.8))",
        }}
      >
        🚨
      </div>

      {/* 状況テキスト */}
      <div
        style={{
          fontSize: 68,
          fontWeight: 800,
          color: "#FFFFFF",
          textAlign: "center",
          transform: `translateY(${interpolate(textAnim, [0, 1], [60, 0])}px)`,
          opacity: textAnim,
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          maxWidth: 1400,
          padding: "0 80px",
          textShadow: `2px 4px 0 ${RED_DARK}`,
        }}
      >
        {situation}
      </div>

      {/* Character image — 左下 */}
      <div style={{ position: "absolute", bottom: 24, left: 60, opacity: 0.88 }}>
        <Img
          src={staticFile(characterImage)}
          style={{
            width: 420,
            height: 420,
            objectFit: "contain",
          }}
        />
      </div>

      {/* YouTube icon — 右下 */}
      <div style={{ position: "absolute", bottom: 24, right: 60, opacity: 0.75 }}>
        <Img
          src={staticFile("assets/images/youtube_icon.png")}
          style={{
            width: 120,
            height: 120,
            objectFit: "cover",
            borderRadius: "50%",
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
