import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

// Rapier runs best with a fixed timestep, so we simulate in 1/60 s slices.
const fixedStep = 1 / 60;
const maxDelta = 0.1;

// Mass in kilograms.
const cubeMass = 4;
const sphereMass = 1;

interface PhysicsObjects {
  cube: THREE.Mesh;
  cubeSize: number;
  sphere: THREE.Mesh;
  sphereRadius: number;
}

export async function createPhysics({
  cube,
  cubeSize,
  sphere,
  sphereRadius,
}: PhysicsObjects) {
  await RAPIER.init();

  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = fixedStep;

  // Ground: a fixed slab with its top surface at y = 0.
  const groundBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(20, 0.5, 20).setFriction(0.9),
    groundBody,
  );

  // Cube: soft body, built from a particle lattice.
  const half = cubeSize / 2;

  const cubeSoftBodyCenter = cube.position;
  
  const cubeSoftBodyHalfExtents = new THREE.Vector3(
    cubeSize / 2,
    cubeSize / 2,
    cubeSize / 2,
  );
  // Particles along X for the soft cube lattice.
  const softBodyCubeParticleAlongX = 4;

  // Particles along Y for the soft cube lattice.
  const softBodyCubeParticleAlongY = 4;

  // Particles along Z for the soft cube lattice.
  const softBodyCubeParticleAlongZ = 4;

  const cubeSoftBodyMaterial = RAPIER.SoftBodyMaterial.uniform(15, 0.5);

  const cubeSoftBodyDesc = RAPIER.SoftBodyDesc.cuboid(
    cubeSoftBodyCenter,
    cubeSoftBodyHalfExtents,
    softBodyCubeParticleAlongX,
    softBodyCubeParticleAlongY,
    softBodyCubeParticleAlongZ,
  )
    .setMass(cubeMass)
    // Default particle thickness inflates the collider; keep it flush with the cube.
    .setParticleRadius(0)
    .setMaterial(cubeSoftBodyMaterial)
    .setSurfaceCollider(
      RAPIER.ColliderDesc.cuboid(half, half, half)
        .setFriction(0.8)
        .setRestitution(0.2),
    );

  world.createSoftBody(cubeSoftBodyDesc);

  // Sphere: dynamic body, dropped from above the cube.
  const sphereBody = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(
      sphere.position.x,
      sphere.position.y,
      sphere.position.z,
    ),
  );
  world.createCollider(
    RAPIER.ColliderDesc.ball(sphereRadius)
      .setMass(sphereMass)
      .setFriction(0.4)
      .setRestitution(0.9),
    sphereBody,
  );

  let accumulator = 0;

  function update(delta: number) {
    accumulator += Math.min(delta, maxDelta);

    while (accumulator >= fixedStep) {
      world.step();
      accumulator -= fixedStep;
    }

    // Copy the simulated transforms onto the meshes that render them.
    copyTransform(sphereBody, sphere);
  }

  return { update };
}

function copyTransform(body: RAPIER.RigidBody, mesh: THREE.Mesh) {
  const position = body.translation();
  mesh.position.set(position.x, position.y, position.z);

  const rotation = body.rotation();
  mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
}
