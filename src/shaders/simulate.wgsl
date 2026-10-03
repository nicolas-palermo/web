struct Particle {
  pos: vec2f,
  vel: vec2f,
  rest: vec2f,
  size: f32,
  alpha: f32,
}

struct SimUniforms {
  mouse_ndc: vec2f,
  mouse_active: f32,
  dt: f32,
  viewport: vec2f,
  rest_scale: vec2f,
  repulsion_radius: f32,
  repulsion_strength: f32,
  spring: f32,
  damping: f32,
  reduced_motion: f32,
  particle_count: u32,
  time: f32,
  glitch: f32,
  min_approach: f32,
  _pad: f32,
}

@group(0) @binding(0) var<storage, read_write> particles: array<Particle>;
@group(0) @binding(1) var<uniform> u: SimUniforms;

fn uv_to_ndc(uv: vec2f, scale: vec2f) -> vec2f {
  return vec2f((uv.x * 2.0 - 1.0) * scale.x, (1.0 - uv.y * 2.0) * scale.y);
}

fn ndc_to_uv(ndc: vec2f, scale: vec2f) -> vec2f {
  let safe = max(scale, vec2f(1e-4));
  return vec2f((ndc.x / safe.x) * 0.5 + 0.5, (1.0 - ndc.y / safe.y) * 0.5);
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

override WG: u32 = 64;

@compute @workgroup_size(WG)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let index = id.x;
  if (index >= u.particle_count) {
    return;
  }

  var particle = particles[index];
  let freeze = u.reduced_motion > 0.5;
  let dt = u.dt;
  var rest_ndc = uv_to_ndc(particle.rest, u.rest_scale);
  var pos_ndc = uv_to_ndc(particle.pos, u.rest_scale);
  let glitch_x = scanline_shift(particle.rest, u.time, u.glitch, freeze) * u.rest_scale.x;
  rest_ndc.x += glitch_x;
  pos_ndc.x += glitch_x;
  var vel = particle.vel;
  let attract = clamp(u.mouse_active, 0.0, 1.0);
  let spring = mix(u.spring * 0.28, u.spring, attract);
  var force = (rest_ndc - pos_ndc) * spring;

  if (u.mouse_active > 0.001) {
    let delta_ndc = pos_ndc - u.mouse_ndc;
    let delta_css = delta_ndc * u.viewport * 0.5;
    // Dashes are wide: count horizontal distance less so a bar is pulled as a unit.
    let dist = length(vec2f(delta_css.x * 0.22, delta_css.y));
    if (dist < u.repulsion_radius && dist > 0.4) {
      let falloff = 1.0 - dist / u.repulsion_radius;
      let dir = delta_ndc / max(length(delta_ndc), 1e-4);
      let ring = clamp((dist - u.min_approach) / max(u.min_approach, 1.0), -1.0, 1.0);
      force -= dir * u.repulsion_strength * falloff * falloff * u.mouse_active * ring;
    }
  }

  vel = (vel + force * dt) * exp(-u.damping * dt);
  pos_ndc += vel * dt;
  pos_ndc.x -= glitch_x;
  particle.vel = vel;
  particle.pos = ndc_to_uv(pos_ndc, u.rest_scale);
  particles[index] = particle;
}
