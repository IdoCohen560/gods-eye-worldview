export const NVG_SHADER = `
  uniform sampler2D colorTexture;
  uniform float time;
  in vec2 v_textureCoordinates;

  void main() {
    vec4 color = texture(colorTexture, v_textureCoordinates);
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Film grain noise
    float noise = fract(sin(dot(v_textureCoordinates * 800.0 + vec2(time * 3.7, time * 2.3),
      vec2(12.9898, 78.233))) * 43758.5453);
    luminance += (noise - 0.5) * 0.12;

    // Vignette
    vec2 uv = v_textureCoordinates * 2.0 - 1.0;
    float vignette = 1.0 - dot(uv, uv) * 0.45;

    // Scanline hint
    float scanline = 1.0 - 0.05 * sin(v_textureCoordinates.y * 800.0);

    float g = luminance * vignette * scanline;
    out_FragColor = vec4(g * 0.1, g * 1.0, g * 0.1, 1.0);
  }
`;
