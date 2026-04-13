export const CLASSIFIED_SHADER = `
  uniform sampler2D colorTexture;
  uniform float time;
  in vec2 v_textureCoordinates;

  void main() {
    vec4 color = texture(colorTexture, v_textureCoordinates);

    // Desaturate
    float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));
    vec3 gray = vec3(lum);

    // Red security tint
    vec3 tinted = gray * vec3(1.2, 0.4, 0.3);

    // Grid overlay
    float gridX = step(0.99, fract(v_textureCoordinates.x * 40.0));
    float gridY = step(0.99, fract(v_textureCoordinates.y * 30.0));
    float grid = max(gridX, gridY);
    tinted = mix(tinted, vec3(0.3, 0.1, 0.1), grid * 0.3);

    // Corner classification markers
    vec2 uv = v_textureCoordinates;
    float cornerDist = min(
      min(length(uv - vec2(0.0, 0.0)), length(uv - vec2(1.0, 0.0))),
      min(length(uv - vec2(0.0, 1.0)), length(uv - vec2(1.0, 1.0)))
    );
    if (cornerDist < 0.08) {
      tinted = mix(tinted, vec3(0.8, 0.0, 0.0), 0.3);
    }

    // Scan line sweep
    float sweep = smoothstep(0.0, 0.02, abs(uv.y - fract(time * 0.1)));
    tinted *= 0.9 + 0.1 * sweep;

    // Film grain
    float noise = fract(sin(dot(uv * 500.0 + time, vec2(12.9898, 78.233))) * 43758.5453);
    tinted += (noise - 0.5) * 0.05;

    out_FragColor = vec4(tinted, 1.0);
  }
`;
