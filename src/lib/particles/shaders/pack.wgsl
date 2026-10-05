struct Particle {
  pos: vec2f,
  vel: vec2f,
  rest: vec2f,
  size: f32,
  alpha: f32,
}

struct PackUniforms {
  particle_count: u32,
  atlas_width: u32,
}

@group(0) @binding(0) var<storage, read> particles: array<Particle>;
@group(0) @binding(1) var draw_tex: texture_storage_2d<rgba32float, write>;
@group(0) @binding(2) var<uniform> u: PackUniforms;

override WG: u32 = 64;

@compute @workgroup_size(WG)
fn cs_main(@builtin(global_invocation_id) id: vec3u) {
  let index = id.x;
  if (index >= u.particle_count) {
    return;
  }
  let particle = particles[index];
  let width = max(u.atlas_width, 1u);
  let coord = vec2i(i32(index % width), i32(index / width));
  textureStore(draw_tex, coord, vec4f(particle.pos, particle.size, particle.alpha));
}
