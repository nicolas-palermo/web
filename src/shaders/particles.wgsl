struct DrawUniforms {
  rest_scale: vec2f,
  viewport: vec2f,
  atlas_width: u32,
  _pad: vec3u,
}

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) alpha: f32,
}

@group(0) @binding(0) var particles_tex: texture_2d<f32>;
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
  let width = max(u.atlas_width, 1u);
  let coord = vec2u(instance_index % width, instance_index / width);
  let data = textureLoad(particles_tex, coord, 0);
  let ndc = uv_to_ndc(data.xy, u.rest_scale);
  let corner = quad_corner(vertex_index);
  let offset = corner * data.z / max(u.viewport, vec2f(1.0)) * 2.0;
  var out: VertexOut;
  out.position = vec4f(ndc + offset, 0.0, 1.0);
  out.local = corner;
  out.alpha = data.w;
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
  let radius_sq = dot(in.local, in.local);
  let alpha = in.alpha * clamp(1.0 - radius_sq, 0.0, 1.0);
  return vec4f(vec3f(1.0), alpha);
}
