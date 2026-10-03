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

override WG: u32 = 64;

@compute @workgroup_size(WG)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let index = id.x;
  if (index >= u.particle_count) {
    return;
  }

  var particle = particles[index];
  if (u.reduced_motion > 0.5) {
    particle.pos = particle.rest;
    particle.vel = vec2f(0.0);
    particles[index] = particle;
    return;
  }

  let dt = u.dt;
  let rest_ndc = uv_to_ndc(particle.rest, u.rest_scale);
  var pos_ndc = uv_to_ndc(particle.pos, u.rest_scale);
  var vel = particle.vel;
  var force = (rest_ndc - pos_ndc) * u.spring;

  if (u.mouse_active > 0.5) {
    let delta_ndc = pos_ndc - u.mouse_ndc;
    let delta_css = delta_ndc * u.viewport * 0.5;
    let distance = length(delta_css);
    if (distance < u.repulsion_radius && distance > 0.08) {
      let falloff = 1.0 - distance / u.repulsion_radius;
      force += normalize(delta_css) / max(u.viewport.y, 1.0) * 2.0 * u.repulsion_strength * falloff * falloff;
    }
  }

  vel = (vel + force * dt) * exp(-u.damping * dt);
  pos_ndc += vel * dt;
  particle.vel = vel;
  particle.pos = ndc_to_uv(pos_ndc, u.rest_scale);
  particles[index] = particle;
}
