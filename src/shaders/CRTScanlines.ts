export const CRT_SHADER = `
  uniform sampler2D colorTexture;
  uniform float time;
  in vec2 v_textureCoordinates;

  void main() {
    vec2 uv = v_textureCoordinates;

    // Barrel distortion
    vec2 dc = uv - 0.5;
    float dist = dot(dc, dc);
    uv = uv + dc * dist * 0.1;

    // Chromatic aberration
    float r = texture(colorTexture, uv + vec2(0.002, 0.0)).r;
    float g = texture(colorTexture, uv).g;
    float b = texture(colorTexture, uv - vec2(0.002, 0.0)).b;
    vec3 color = vec3(r, g, b);

    // Scanlines
    float scanline = sin(uv.y * 600.0 + time * 2.0) * 0.08;
    color -= scanline;

    // Vignette
    float vignette = 1.0 - dot(dc, dc) * 1.5;
    color *= vignette;

    // Flicker
    float flicker = 1.0 - 0.02 * sin(time * 8.0);
    color *= flicker;

    // Green/amber tint
    color *= vec3(0.7, 1.0, 0.7);

    // Phosphor glow
    color += vec3(0.0, 0.02, 0.0);

    out_FragColor = vec4(color, 1.0);
  }
`;
