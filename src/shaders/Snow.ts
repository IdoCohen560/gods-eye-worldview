export const SNOW_SHADER = `
  uniform sampler2D colorTexture;
  uniform float time;
  uniform float intensity;
  uniform float density;
  uniform float wind;
  in vec2 v_textureCoordinates;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float snowLayer(vec2 uv, float layer) {
    float depth = 0.5 + layer * 0.5;
    float speed = 0.4 + layer * 0.3;
    float sz = mix(0.01, 0.025, layer);
    float windForce = sin(time * 0.5 + layer * 3.14) * (0.05 + wind * 0.2);

    vec2 snowUV = uv * vec2(1.0, 0.5) * (4.0 + layer * 4.0);
    snowUV.y += time * speed;
    snowUV.x += time * windForce;

    vec2 cell = floor(snowUV);
    vec2 f = fract(snowUV);

    float snow = 0.0;
    for (int y = -1; y <= 1; y++) {
      for (int x = -1; x <= 1; x++) {
        vec2 neighbor = vec2(float(x), float(y));
        vec2 point = vec2(hash(cell + neighbor), hash(cell + neighbor + 100.0));
        point = 0.5 + 0.4 * sin(time * 0.3 + 6.2831 * point);
        float d = length(f - neighbor - point);
        snow += smoothstep(sz, 0.0, d) * depth;
      }
    }
    return snow;
  }

  void main() {
    vec2 uv = v_textureCoordinates;
    vec4 color = texture(colorTexture, uv);

    // Cool/blue shift
    vec3 cool = color.rgb * vec3(0.85, 0.9, 1.1);

    // Partial desaturation
    float luma = dot(cool, vec3(0.299, 0.587, 0.114));
    vec3 desaturated = mix(cool, vec3(luma), 0.4 * intensity);

    // Brighten
    vec3 brightened = mix(desaturated, vec3(1.0), 0.15 * intensity);

    // Frost overlay
    float frostMask = smoothstep(0.3, 0.8, luma);
    vec3 frosted = mix(brightened, vec3(0.95, 0.97, 1.0), frostMask * 0.25 * intensity);

    // Snow particles
    float snow = 0.0;
    snow += snowLayer(uv, 0.0) * 0.5;
    snow += snowLayer(uv, 0.25) * 0.6;
    snow += snowLayer(uv, 0.5) * 0.7;
    snow += snowLayer(uv, 0.75) * 0.8;
    snow += snowLayer(uv, 1.0) * 1.0;
    snow = clamp(snow * (0.4 + density * 1.2), 0.0, 1.0);

    vec3 result = frosted + snow * 0.8 * intensity;

    // Fog in lower areas
    float fog = smoothstep(0.0, 0.4, 1.0 - uv.y) * 0.1 * intensity;
    result = mix(result, vec3(0.85, 0.88, 0.95), fog);

    out_FragColor = vec4(mix(color.rgb, result, intensity), color.a);
  }
`;
