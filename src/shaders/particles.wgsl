struct Particle {
  pos: vec2f,
  vel: vec2f,
  rest: vec2f,
  size: f32,
  alpha: f32,
}

struct DrawUniforms {
  rest_scale: vec2f,
  viewport: vec2f,
}

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) alpha: f32,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var<uniform> u: DrawUniforms;

fn uv_to_ndc(uv: vec2f, scale: vec2f) -> vec2f {
  return vec2f((uv.x * 2.0 - 1.0) * scale.x, (1.0 - uv.y * 2.0) * scale.y);
}

fn quad_corner(vertex_index: u32) -> vec2f {
  let corner_index = array<u32, 6>(0u, 1u, 2u, 2u, 1u, 3u)[vertex_index % 6u];
  switch corner_index {
    case 0u: { return vec2f(-1.0, -1.0); }
    case 1u: { return vec2f(1.0, -1.0); }
    case 2u: { return vec2f(-1.0, 1.0); }
    default: { return vec2f(1.0, 1.0); }
  }
}

@vertex
fn vs_main(
  @builtin(vertex_index) vertex_index: u32,
  @builtin(instance_index) instance_index: u32,
) -> VertexOut {
  let particle = particles[instance_index];
  let ndc = uv_to_ndc(particle.pos, u.rest_scale);
  let corner = quad_corner(vertex_index);
  let offset = corner * particle.size / max(u.viewport, vec2f(1.0)) * 2.0;
  var out: VertexOut;
  out.position = vec4f(ndc + offset, 0.0, 1.0);
  out.local = corner;
  out.alpha = particle.alpha;
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
  let radius_sq = dot(in.local, in.local);
  if (radius_sq > 1.0) {
    discard;
  }
  let edge = smoothstep(1.0, 0.65, radius_sq);
  return vec4f(vec3f(1.0), in.alpha * edge);
}
