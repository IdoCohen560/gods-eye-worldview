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
          GOD'S EYE <span className="title-accent">VIEW</span>
        </h1>
        <p className="subtitle">NO PLACE LEFT BEHIND</p>
      </div>

      <div id="style-indicator">
        <span className="indicator-label">ACTIVE STYLE</span>
        <span className="indicator-value">{styleName}</span>
      </div>
    </>
  );
}
