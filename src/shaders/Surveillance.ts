export const SURVEILLANCE_SHADER = `
  uniform sampler2D colorTexture;
  uniform float time;
  in vec2 v_textureCoordinates;

  void main() {
    vec2 uv = v_textureCoordinates;
    vec4 color = texture(colorTexture, uv);

    // Slight blue surveillance tint
    vec3 tinted = color.rgb * vec3(0.85, 0.9, 1.1);

    // Subtle scanlines
    float scanline = 1.0 - 0.04 * sin(uv.y * 400.0);
    tinted *= scanline;

    // Slight desaturation
    float lum = dot(tinted, vec3(0.299, 0.587, 0.114));
    tinted = mix(vec3(lum), tinted, 0.7);

    // Timestamp bar at bottom
    if (uv.y > 0.96) {
      tinted = vec3(0.0);
      // Red dot for REC
      if (uv.x > 0.02 && uv.x < 0.035 && uv.y > 0.97 && uv.y < 0.985) {
        float pulse = 0.5 + 0.5 * sin(time * 2.0);
        tinted = vec3(pulse, 0.0, 0.0);
      }
    }

    // REC indicator top-left
    if (uv.x < 0.06 && uv.x > 0.01 && uv.y < 0.04 && uv.y > 0.01) {
      float pulse = step(0.5, fract(time * 0.5));
      if (pulse > 0.5) {
        // Red circle
        vec2 center = vec2(0.02, 0.025);
        float dist = length(uv - center);
        if (dist < 0.008) {
          tinted = vec3(1.0, 0.0, 0.0);
        }
      }
    }

    // Film grain
    float noise = fract(sin(dot(uv * 500.0 + time, vec2(12.9898, 78.233))) * 43758.5453);
    tinted += (noise - 0.5) * 0.03;

    out_FragColor = vec4(tinted, 1.0);
  }
`;
