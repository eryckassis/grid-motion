uniform vec2 uSpeed;

varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;

  vec4 worldPosition = modelViewMatrix * vec4(position, 1.0);

  vWorldPosition = worldPosition.xyz;

  float distanceFromCenter = length(worldPosition.xy);
  distanceFromCenter = pow(distanceFromCenter, 1.5);

  worldPosition.xy -= distanceFromCenter * uSpeed.xy * 0.03;
  worldPosition.z += distanceFromCenter * length(uSpeed) * 0.04;

  gl_Position = projectionMatrix * worldPosition;
}