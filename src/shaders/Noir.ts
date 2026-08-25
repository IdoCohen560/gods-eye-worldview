export const NOIR_SHADER = `
  uniform sampler2D colorTexture;
  uniform float intensity;
  uniform float contrastAmt;
  uniform float grainAmt;
  uniform float vignetteAmt;
  in vec2 v_textureCoordinates;

  void main() {
    vec2 uv = v_textureCoordinates;
    vec4 color = texture(colorTexture, uv);

    // Desaturate
    float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 gray = vec3(luma);
    vec3 desaturated = mix(color.rgb, gray, intensity);

    // High contrast S-curve
    float contrast = 1.0 + contrastAmt * intensity;
    vec3 contrasted = (desaturated - 0.5) * contrast + 0.5;
    contrasted = clamp(contrasted, 0.0, 1.0);

    // Film grain
    float grain = fract(sin(dot(uv * vec2(1920.0, 1080.0), vec2(12.9898, 78.233))) * 43758.5453);
    grain = (grain - 0.5) * 0.08 * grainAmt * intensity;
    contrasted += grain;

    // Vignette
    vec2 vigUV = uv * (1.0 - uv);
    float vig = vigUV.x * vigUV.y * 16.0;
    vig = pow(vig, 0.3 + 0.4 * vignetteAmt * intensity);

    // Sepia tint
    vec3 sepia = vec3(
      dot(contrasted, vec3(0.393, 0.769, 0.189)),
      dot(contrasted, vec3(0.349, 0.686, 0.168)),
      dot(contrasted, vec3(0.272, 0.534, 0.131))
    );
    vec3 tinted = mix(contrasted, sepia, 0.15 * intensity);

    vec3 result = tinted * vig;
    out_FragColor = vec4(mix(color.rgb, result, intensity), color.a);
  }
`;
