import * as THREE from "three";
import RAPIER from "@dimforge/rapier3d-compat";

// Rapier runs best with a fixed timestep, so we simulate in 1/60 s slices.
const fixedStep = 1 / 60;
const maxDelta = 0.1;

// Mass in kilograms.
const cubeMass = 100;
const sphereMass = 2;

interface PhysicsObjects {
  cube: THREE.Mesh;
  cubeSize: number;
  sphere: THREE.Mesh;
  sphereRadius: number;
  scene: THREE.Scene;
}

export async function createPhysics({
  cube,
  cubeSize,
  sphere,
  sphereRadius,
  scene,
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
  const softBodyCubeParticleAlongX = 6;

  // Particles along Y for the soft cube lattice.
  const softBodyCubeParticleAlongY = 5;

  // Particles along Z for the soft cube lattice.
  const softBodyCubeParticleAlongZ = 5;

  const cubeSoftBodyMaterial = RAPIER.SoftBodyMaterial.uniform(90, 1);
  cubeSoftBodyMaterial.tearForce = 10;
  cubeSoftBodyMaterial.maxTearsPerStep = 2;
  cubeSoftBodyMaterial.minPiece = 100;
  // Lighter damping: heavy values only made it sluggish.
  cubeSoftBodyMaterial.deformationDamping = 1;
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
        .setRestitution(0.0),
    )
    .setLinearDamping(2)
    .setParticleRadius(0.006)
    // Fewer extra iterations: cheaper, still stable.
    .setAdditionalSolverIterations(1);
  const cubeSoftBody = world.createSoftBody(cubeSoftBodyDesc);

  // Sphere: spawnable balls.
  const ballStart = sphere.position.clone();
  const balls: { body: RAPIER.RigidBody; mesh: THREE.Mesh }[] = [];

  function spawnBall() {
    const body = world.createRigidBody(
      RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(ballStart.x, ballStart.y, ballStart.z)
    );
    world.createCollider(
      RAPIER.ColliderDesc.ball(sphereRadius)
        .setMass(sphereMass)
        .setFriction(0.4)
        .setRestitution(0.0),
      body,
    );

    const mesh = balls.length === 0 ? sphere : sphere.clone();
    mesh.position.copy(ballStart);
    mesh.quaternion.identity();
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    balls.push({ body, mesh });
  }

  spawnBall();
  const cubeGeometry = new THREE.BufferGeometry();
  cubeGeometry.setAttribute(
    "position",
    new THREE.BufferAttribute(cubeSoftBody.meshVertices(0).slice(), 3),
  );
  cubeGeometry.setIndex(
    new THREE.BufferAttribute(cubeSoftBody.meshIndices(0).slice(), 1),
  );

  cube.geometry.dispose();
  cube.geometry = cubeGeometry;
  cube.position.set(0, 0, 0);

  let accumulator = 0;
  const events = new RAPIER.EventQueue(true);

  const pieceMeshes: {
    body: RAPIER.SoftBody;
    geometry: THREE.BufferGeometry;
  }[] = [];

  function update(delta: number) {
    accumulator += Math.min(delta, maxDelta);

    while (accumulator >= fixedStep) {
      world.step(events);
      accumulator -= fixedStep;
      events.drainSoftBodyTearEvents((event) => {
        const count = event.numPieces();
        if (count === 0) return;

        for (let i = 0; i < count; i++) {
          const handle = event.pieceSoftBody(i);
          if (handle === event.softBody()) continue;
          const piece = world.getSoftBody(event.pieceSoftBody(i));

          const pieceVertices = piece.meshVertices(0);
          const pieaceIndices = piece.meshIndices(0);

          console.log("piece", pieceVertices.length, pieaceIndices.length);

          const geometry = new THREE.BufferGeometry();
          geometry.setAttribute(
            "position",
            new THREE.BufferAttribute(pieceVertices.slice(0), 3),
          );
          geometry.setIndex(
            new THREE.BufferAttribute(pieaceIndices.slice(0), 1),
          );
          // Flat shading doesn't use vertex normals.
          // geometry.computeVertexNormals();
          const mesh = new THREE.Mesh(geometry, cube.material);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          scene.add(mesh);
          pieceMeshes.push({ body: piece, geometry });
        }
      });
    }

    // Copy the simulated transforms onto the meshes that render them.
    for (const ball of balls) {
      copyTransform(ball.body, ball.mesh);
    }

    const vertices = cubeSoftBody.meshVertices(0);
    const indices = cubeSoftBody.meshIndices(0);
    const positions = cube.geometry.attributes
      .position as THREE.BufferAttribute;

    if (
      positions.array.length !== vertices.length ||
      cube.geometry.index?.array.length !== indices.length
    ) {
      cube.geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(vertices.slice(), 3),
      );
      cube.geometry.setIndex(new THREE.BufferAttribute(indices.slice(), 1));
    } else {
      positions.array.set(vertices);
      positions.needsUpdate = true;
    }
    // Flat shading doesn't use vertex normals.
    // cube.geometry.computeVertexNormals();

    for (const piece of pieceMeshes) {
      const vertx = piece.body.meshVertices(0);
      const indx = piece.body.meshIndices(0);
      const posi = piece.geometry.attributes.position as THREE.BufferAttribute;

      if (
        posi.array.length !== vertx.length ||
        piece.geometry.index?.array.length !== indx.length
      ) {
        piece.geometry.setAttribute(
          "position",
          new THREE.BufferAttribute(vertx.slice(0), 3),
        );
        piece.geometry.setIndex(new THREE.BufferAttribute(indx.slice(0), 1));
      } else {
        posi.array.set(vertx);
        posi.needsUpdate = true;
      }
      // Flat shading doesn't use vertex normals.
      // piece.geometry.computeVertexNormals();
    }
  }

  return { update, spawnBall };
}

function copyTransform(body: RAPIER.RigidBody, mesh: THREE.Mesh) {
  const position = body.translation();
  mesh.position.set(position.x, position.y, position.z);

  const rotation = body.rotation();
  mesh.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
}
