uniform sampler2D tImage;
uniform vec2 uUvScale;

varying vec2 vUv;
varying vec3 vWorldPosition;

float getLuminance(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

void main() {
  vec2 uv = (vUv - 0.5) * uUvScale * 0.8 + 0.5;

  vec4 textureColor = texture2D(
    tImage,
    uv + vWorldPosition.xy * 0.05
  );

  float grayscale = getLuminance(textureColor.rgb);
  float distanceFromCenter = length(vWorldPosition.xy);

  float threshold = smoothstep(
    1.0,
    2.5,
    distanceFromCenter
  );

  vec3 color = mix(
    textureColor.rgb,
    vec3(grayscale),
    threshold
  );

  gl_FragColor = vec4(color, 1.0);
}