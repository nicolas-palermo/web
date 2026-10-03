struct DrawUniforms {
  rest_scale: vec2f,
  viewport: vec2f,
  atlas_width: u32,
  reduced_motion: u32,
  time: f32,
  glitch: f32,
}

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) local: vec2f,
  @location(1) alpha: f32,
  @location(2) shade: f32,
}

@group(0) @binding(0) var particles_tex: texture_2d<f32>;
@group(0) @binding(1) var<uniform> u: DrawUniforms;

fn uv_to_ndc(uv: vec2f, scale: vec2f) -> vec2f {
  return vec2f((uv.x * 2.0 - 1.0) * scale.x, (1.0 - uv.y * 2.0) * scale.y);
}

fn hash21(p: vec2f) -> f32 {
  var p3 = fract(vec3f(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

fn band_shift(band: f32, tick: f32, tear_tick: f32) -> f32 {
  let n = hash21(vec2f(band, tick));
  let n2 = hash21(vec2f(band + 17.0, tear_tick));
  let jitter = (n - 0.5) * 0.006;
  let tear = select(0.0, (n2 - 0.5) * 0.022, n2 > 0.9);
  return jitter + tear;
}

fn scanline_shift(uv: vec2f, time: f32, amount: f32, freeze: bool) -> f32 {
  let band = floor(uv.y * 240.0);
  if (freeze) {
    return band_shift(band, 0.0, 3.0) * amount;
  }
  return band_shift(band, floor(time * 15.0), floor(time * 15.0)) * amount;
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
  var ndc = uv_to_ndc(data.xy, u.rest_scale);
  ndc.x += scanline_shift(
    data.xy,
    u.time,
    u.glitch,
    u.reduced_motion > 0u
  ) * u.rest_scale.x;
  let corner = quad_corner(vertex_index);
  let id = f32(instance_index);
  let dash = 4.6 + hash21(vec2f(id, 11.0)) * 3.2;
  let offset = vec2f(corner.x * data.z * dash, corner.y * data.z * 0.78)
    / max(u.viewport, vec2f(1.0))
    * 2.0;
  let roll = hash21(vec2f(id, 23.0));
  var shade = 1.0;
  var alpha_mul = 1.0;
  if (roll < 0.2) {
    shade = 0.32 + roll * 1.5;
  } else if (roll < 0.48) {
    alpha_mul = 0.28 + (roll - 0.2) * 1.4;
  }
  var out: VertexOut;
  out.position = vec4f(ndc + offset, 0.0, 1.0);
  out.local = corner;
  out.alpha = data.w * alpha_mul;
  out.shade = shade;
  return out;
}

@fragment
fn fs_main(in: VertexOut) -> @location(0) vec4f {
  let radius_sq = dot(in.local, in.local);
  let alpha = in.alpha * clamp(1.0 - radius_sq, 0.0, 1.0);
  let black = vec3f(0.160784, 0.160784, 0.160784);
  let white = vec3f(0.941176, 0.937255, 0.929412);
  let color = mix(black, white, in.shade);
  return vec4f(color, alpha);
}
