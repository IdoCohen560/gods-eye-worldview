export const CEL_SHADER = `
  uniform sampler2D colorTexture;
  in vec2 v_textureCoordinates;

  void main() {
    vec2 texel = vec2(1.0 / 1920.0, 1.0 / 1080.0);
    vec4 color = texture(colorTexture, v_textureCoordinates);

    // Posterize (reduce color levels for flat cel look)
    float levels = 6.0;
    vec3 posterized = floor(color.rgb * levels + 0.5) / levels;

    // Edge detection (Sobel)
    float tl = dot(texture(colorTexture, v_textureCoordinates + vec2(-texel.x, texel.y)).rgb, vec3(0.333));
    float t  = dot(texture(colorTexture, v_textureCoordinates + vec2(0.0, texel.y)).rgb, vec3(0.333));
    float tr = dot(texture(colorTexture, v_textureCoordinates + vec2(texel.x, texel.y)).rgb, vec3(0.333));
    float l  = dot(texture(colorTexture, v_textureCoordinates + vec2(-texel.x, 0.0)).rgb, vec3(0.333));
    float r  = dot(texture(colorTexture, v_textureCoordinates + vec2(texel.x, 0.0)).rgb, vec3(0.333));
    float bl = dot(texture(colorTexture, v_textureCoordinates + vec2(-texel.x, -texel.y)).rgb, vec3(0.333));
    float b  = dot(texture(colorTexture, v_textureCoordinates + vec2(0.0, -texel.y)).rgb, vec3(0.333));
    float br = dot(texture(colorTexture, v_textureCoordinates + vec2(texel.x, -texel.y)).rgb, vec3(0.333));

    float gx = -tl - 2.0*l - bl + tr + 2.0*r + br;
    float gy = -tl - 2.0*t - tr + bl + 2.0*b + br;
    float edge = sqrt(gx*gx + gy*gy);

    // Warm Ghibli-style color shift
    posterized = posterized * vec3(1.05, 1.0, 0.9) + vec3(0.02, 0.01, 0.0);

    // Draw edges as dark outlines
    float outline = 1.0 - smoothstep(0.1, 0.3, edge);
    vec3 result = posterized * outline;

    out_FragColor = vec4(result, 1.0);
  }
`;
