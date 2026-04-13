export const BW_SHADER = `
  uniform sampler2D colorTexture;
  uniform float time;
  in vec2 v_textureCoordinates;

  void main() {
    vec4 color = texture(colorTexture, v_textureCoordinates);
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // High contrast curve
    lum = smoothstep(0.1, 0.9, lum);

    // Film grain
    float noise = fract(sin(dot(v_textureCoordinates * 600.0 + time * 1.7,
      vec2(12.9898, 78.233))) * 43758.5453);
    lum += (noise - 0.5) * 0.08;

    // Slight vignette
    vec2 uv = v_textureCoordinates * 2.0 - 1.0;
    float vig = 1.0 - dot(uv, uv) * 0.3;
    lum *= vig;

    out_FragColor = vec4(vec3(lum), 1.0);
  }
`;
