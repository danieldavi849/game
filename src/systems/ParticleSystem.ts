import { System } from '../ecs/System.ts';
import { World } from '../ecs/World.ts';
import { Transform } from '../components/Transform.ts';
import { Physics } from '../components/Physics.ts';
import { Renderable } from '../components/Renderable.ts';
import { ParticleComponent } from '../components/Particle.ts';
import { Vec2 } from '../utils/Vec2.ts';
import { randomRange } from '../utils/MathUtils.ts';

/** Manages particle effects: trails, bursts, ambient particles */
export class ParticleSystem implements System {
  readonly priority = 40;
  private trailTimer: number = 0;

  update(world: World, dt: number): void {
    // Update existing particles
    const particles = world.query('Particle', 'Transform', 'Renderable');
    for (let i = 0; i < particles.length; i++) {
      const entity = particles[i];
      const particle = entity.getComponent<ParticleComponent>('Particle')!;
      const renderable = entity.getComponent<Renderable>('Renderable')!;

      particle.age += dt;

      // Fade and shrink
      const lifeRatio = 1 - particle.age / particle.lifetime;
      renderable.opacity = Math.max(0, lifeRatio);
      renderable.radius = Math.max(0.5, renderable.radius - particle.shrinkRate * dt);

      if (particle.age >= particle.lifetime) {
        world.removeEntity(entity.id);
      }
    }

    // Spawn trail particles for player
    this.trailTimer += dt;
    if (this.trailTimer >= 0.05) {
      this.trailTimer = 0;
      const players = world.query('PlayerControlled', 'Transform', 'Renderable', 'Physics');
      if (players.length > 0) {
        const pt = players[0].getComponent<Transform>('Transform')!;
        const pr = players[0].getComponent<Renderable>('Renderable')!;
        const pp = players[0].getComponent<Physics>('Physics')!;

        if (pp.velocity.magSq() > 100) {
          this.spawnTrailParticle(world, pt.position, pr.color, pr.radius * 0.4);
        }
      }
    }
  }

  /** Spawn a single trail particle */
  private spawnTrailParticle(world: World, pos: Vec2, color: string, radius: number): void {
    const p = world.createEntity();
    p.addComponent(new Transform(
      new Vec2(pos.x + randomRange(-3, 3), pos.y + randomRange(-3, 3)),
    ));
    const phys = new Physics(0, 0);
    phys.velocity = new Vec2(randomRange(-15, 15), randomRange(-15, 15));
    phys.friction = 0.95;
    p.addComponent(phys);
    p.addComponent(new Renderable(
      radius,
      color,
      '',
      0,
      0.6,
    ));
    p.addComponent(new ParticleComponent(0.4, 1, radius * 2));
  }

  /** Spawn a burst of particles at a position */
  spawnBurst(world: World, pos: Vec2, color: string, count: number, radius: number): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + randomRange(-0.3, 0.3);
      const speed = randomRange(80, 200);
      const p = world.createEntity();
      p.addComponent(new Transform(new Vec2(pos.x, pos.y)));
      const phys = new Physics(0, 0);
      phys.velocity = Vec2.fromAngle(angle, speed);
      phys.friction = 0.93;
      p.addComponent(phys);
      p.addComponent(new Renderable(
        randomRange(radius * 0.3, radius * 0.8),
        color,
        color,
        radius * 0.5,
        1,
      ));
      p.addComponent(new ParticleComponent(
        randomRange(0.3, 0.7),
        1,
        radius * 2,
      ));
    }
  }
}
