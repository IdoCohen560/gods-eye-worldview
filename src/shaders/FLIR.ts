export const FLIR_SHADER = `
  uniform sampler2D colorTexture;
  uniform float time;
  in vec2 v_textureCoordinates;

  vec3 ironbow(float t) {
    // Iron colormap: black -> blue -> magenta -> orange -> yellow -> white
    vec3 c;
    if (t < 0.2) {
      c = mix(vec3(0.0, 0.0, 0.0), vec3(0.0, 0.0, 0.5), t / 0.2);
    } else if (t < 0.4) {
      c = mix(vec3(0.0, 0.0, 0.5), vec3(0.7, 0.0, 0.7), (t - 0.2) / 0.2);
    } else if (t < 0.6) {
      c = mix(vec3(0.7, 0.0, 0.7), vec3(1.0, 0.3, 0.0), (t - 0.4) / 0.2);
    } else if (t < 0.8) {
      c = mix(vec3(1.0, 0.3, 0.0), vec3(1.0, 0.9, 0.0), (t - 0.6) / 0.2);
    } else {
      c = mix(vec3(1.0, 0.9, 0.0), vec3(1.0, 1.0, 1.0), (t - 0.8) / 0.2);
    }
    return c;
  }

  void main() {
    vec4 color = texture(colorTexture, v_textureCoordinates);
    float luminance = dot(color.rgb, vec3(0.299, 0.587, 0.114));

    // Slight noise for thermal jitter
    float noise = fract(sin(dot(v_textureCoordinates * 400.0 + time,
      vec2(12.9898, 78.233))) * 43758.5453) * 0.03;
    luminance = clamp(luminance + noise, 0.0, 1.0);

    vec3 thermal = ironbow(luminance);

    // Crosshair reticle effect (thin lines)
    float cx = abs(v_textureCoordinates.x - 0.5);
    float cy = abs(v_textureCoordinates.y - 0.5);
    float reticle = 0.0;
    if ((cx < 0.001 && cy > 0.02 && cy < 0.05) ||
        (cy < 0.001 && cx > 0.02 && cx < 0.05)) {
      reticle = 1.0;
    }

    thermal = mix(thermal, vec3(0.0, 1.0, 0.0), reticle * 0.8);

    out_FragColor = vec4(thermal, 1.0);
  }
`;
