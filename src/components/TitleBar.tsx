interface Props {
  visible: boolean;
  styleName: string;
}

export default function TitleBar({ visible, styleName }: Props) {
  if (!visible) return null;

  return (
    <>
      <div id="title-bar">
        <div className="title-glow" />
        <h1>
          GOD'S <span className="title-accent">EYE</span>
        </h1>
        <div className="subtitle">GLOBAL INTELLIGENCE MONITORING SYSTEM</div>
      </div>

      <div id="style-indicator">
        <span className="indicator-label">ACTIVE STYLE</span>
        <span className="indicator-value">{styleName}</span>
      </div>
    </>
  );
}
