import { Vec2 } from './Vec2.ts';
import { Entity } from '../ecs/Entity.ts';
import { Transform } from '../components/Transform.ts';
import { Renderable } from '../components/Renderable.ts';
import { Collider } from '../components/Collider.ts';

export interface QuadtreeEntity {
    id: number;
    position: Vec2;
    radius: number;
    entity: Entity;
}

export class Quadtree {
    private count = 0;
    private readonly capacity: number;

    // Bounds
    private x: number;
    private y: number;
    private width: number;
    private height: number;

    private items: QuadtreeEntity[] = [];

    private nw: Quadtree | null = null;
    private ne: Quadtree | null = null;
    private sw: Quadtree | null = null;
    private se: Quadtree | null = null;

    private divided: boolean = false;

    constructor(x: number, y: number, width: number, height: number, capacity: number = 4) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.capacity = capacity;
    }

    insert(item: QuadtreeEntity): boolean {
        if (!this.containsPoint(item.position.x, item.position.y)) {
            return false;
        }

        if (this.items.length < this.capacity && !this.divided) {
            this.items.push(item);
            this.count++;
            return true;
        }

        if (!this.divided) {
            this.subdivide();
        }

        if (this.nw!.insert(item)) return true;
        if (this.ne!.insert(item)) return true;
        if (this.sw!.insert(item)) return true;
        if (this.se!.insert(item)) return true;

        return false;
    }

    private subdivide(): void {
        const hw = this.width / 2;
        const hh = this.height / 2;
        const x = this.x;
        const y = this.y;

        this.nw = new Quadtree(x, y, hw, hh, this.capacity);
        this.ne = new Quadtree(x + hw, y, hw, hh, this.capacity);
        this.sw = new Quadtree(x, y + hh, hw, hh, this.capacity);
        this.se = new Quadtree(x + hw, y + hh, hw, hh, this.capacity);
        this.divided = true;

        // Move existing items to children
        for (const item of this.items) {
            this.nw.insert(item) ||
                this.ne.insert(item) ||
                this.sw.insert(item) ||
                this.se.insert(item);
        }
        this.items = [];
    }

    queryRange(rangeX: number, rangeY: number, rangeRadius: number, found: QuadtreeEntity[] = []): QuadtreeEntity[] {
        if (!this.intersectsCircle(rangeX, rangeY, rangeRadius)) {
            return found;
        }

        if (!this.divided) {
            for (const item of this.items) {
                // Broad phase distance check (includes both radii approx)
                const dx = rangeX - item.position.x;
                const dy = rangeY - item.position.y;
                const distSq = dx * dx + dy * dy;
                const radSum = rangeRadius + item.radius;
                if (distSq <= radSum * radSum) {
                    found.push(item);
                }
            }
            return found;
        }

        this.nw!.queryRange(rangeX, rangeY, rangeRadius, found);
        this.ne!.queryRange(rangeX, rangeY, rangeRadius, found);
        this.sw!.queryRange(rangeX, rangeY, rangeRadius, found);
        this.se!.queryRange(rangeX, rangeY, rangeRadius, found);

        return found;
    }

    clear(): void {
        this.items = [];
        this.divided = false;
        this.count = 0;
        this.nw = null;
        this.ne = null;
        this.sw = null;
        this.se = null;
    }

    private containsPoint(px: number, py: number): boolean {
        return px >= this.x && px < this.x + this.width &&
            py >= this.y && py < this.y + this.height;
    }

    private intersectsCircle(cx: number, cy: number, r: number): boolean {
        // Closest point on the AABB to the circle center
        const testX = Math.max(this.x, Math.min(cx, this.x + this.width));
        const testY = Math.max(this.y, Math.min(cy, this.y + this.height));

        const dx = cx - testX;
        const dy = cy - testY;
        return (dx * dx + dy * dy) <= (r * r);
    }
}
