import { Audio, Composition, Series, interpolate, staticFile } from "remotion";
import { VIDEOS, TEMPLATE_MAP, VIDEO_NAMES } from "./scriptContent";

const FPS = 30;
const TRANSITION_SECONDS = 3;
const FADE_FRAMES = 20;
const BGM_VOLUME = 0.15;

function calcDangerRanges(slides: any[]) {
  let cursor = 0;
  return slides.flatMap((slide) => {
    const dur = ((slide.seconds || 8) + TRANSITION_SECONDS) * FPS;
    const range = slide.format === "format11" ? [{ start: cursor, end: cursor + dur }] : [];
    cursor += dur;
    return range;
  });
}

function bgmVolume(frame: number, dangerRanges: { start: number; end: number }[]) {
  for (const { start, end } of dangerRanges) {
    if (frame >= start - FADE_FRAMES && frame < start) {
      return interpolate(frame, [start - FADE_FRAMES, start], [BGM_VOLUME, 0]);
    }
    if (frame >= start && frame < end) return 0;
    if (frame >= end && frame < end + FADE_FRAMES) {
      return interpolate(frame, [end, end + FADE_FRAMES], [0, BGM_VOLUME]);
    }
  }
  return BGM_VOLUME;
}

const VideoComposition: React.FC<{
  scriptData: { slides: any[] };
}> = ({ scriptData }) => {
  const dangerRanges = calcDangerRanges(scriptData.slides);

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: "#FFFFFF",
      }}
    >
      <Audio
        src={staticFile("assets/music/444_long_BPM80.mp3")}
        volume={(frame) => bgmVolume(frame, dangerRanges)}
        loop
      />
      <Series>
        {scriptData.slides.map((slide: any) => {
          const Template = TEMPLATE_MAP[slide.format];
          if (!Template) return null;

          const durationInFrames =
            ((slide.seconds || 8) + TRANSITION_SECONDS) * FPS;

          const { slideNumber, format, seconds, audioFile, ...templateProps } =
            slide;

          return (
            <Series.Sequence
              key={slideNumber}
              durationInFrames={durationInFrames}
            >
              {audioFile && <Audio src={staticFile(audioFile)} />}
              <Template {...templateProps} />
            </Series.Sequence>
          );
        })}
      </Series>
    </div>
  );
};

function getTotalFrames(scriptData: { slides: any[] }) {
  return scriptData.slides.reduce(
    (sum: number, s: any) =>
      sum + ((s.seconds || 8) + TRANSITION_SECONDS) * FPS,
    0,
  );
}

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {VIDEO_NAMES.map((name) => {
        const scriptData = VIDEOS[name];
        if (!scriptData) return null;
        return (
          <Composition
            key={name}
            id={name.replace(/[^a-zA-Z0-9\u4E00-\u9FFF-]/g, "")}
            component={VideoComposition}
            defaultProps={{ scriptData }}
            durationInFrames={getTotalFrames(scriptData)}
            fps={FPS}
            width={1920}
            height={1080}
          />
        );
      })}
    </>
  );
};
