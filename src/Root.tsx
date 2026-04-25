import { Audio, Composition, Series, staticFile } from "remotion";
import { VIDEOS, TEMPLATE_MAP, VIDEO_NAMES } from "./scriptContent";

const FPS = 30;
const TRANSITION_SECONDS = 3;

const VideoComposition: React.FC<{
  scriptData: { slides: any[] };
}> = ({ scriptData }) => {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        backgroundColor: "#FFFFFF",
      }}
    >
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
