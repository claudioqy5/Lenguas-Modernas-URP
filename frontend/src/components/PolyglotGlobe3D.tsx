import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface PolyglotGlobe3DProps {
  pulseTrigger?: number;
}

export const PolyglotGlobe3D: React.FC<PolyglotGlobe3DProps> = ({ pulseTrigger = 0 }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const pulseIntensityRef = useRef<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 8.5;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.width = '100vw';
    renderer.domElement.style.height = '100vh';
    renderer.domElement.style.position = 'absolute';
    renderer.domElement.style.top = '0';
    renderer.domElement.style.left = '0';
    mountRef.current.appendChild(renderer.domElement);

    // =========================================================================
    // 2. LEFT SIDE BACKGROUND: SAN JERÓNIMO RAW PNG (DIRECT UNFILTERED IMAGE)
    // =========================================================================
    const sanJeronimoLeftGroup = new THREE.Group();

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/sanjeronimo.png', (texture) => {
      const sjAspect = texture.image.width / texture.image.height;
      const sjHeight = 5.5; // Background size
      const sjWidth = sjHeight * sjAspect;

      const sjGeom = new THREE.PlaneGeometry(sjWidth, sjHeight);
      const sjMat = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
      });

      const sjMesh = new THREE.Mesh(sjGeom, sjMat);
      sanJeronimoLeftGroup.add(sjMesh);
    });

    scene.add(sanJeronimoLeftGroup);

    // =========================================================================
    // 3. RIGHT SIDE BACKGROUND: ORIGINAL RIGHT PLANET SYSTEM
    // =========================================================================
    const createPlanetSystem = (wireColor: number, ringColors: { radius: number; color: number; tiltX: number; tiltY: number; speed: number }[]) => {
      const group = new THREE.Group();

      const globeGeometry = new THREE.SphereGeometry(2.3, 30, 30);
      const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: wireColor,
        wireframe: true,
        transparent: true,
        opacity: 0.14,
      });
      const wireframeGlobe = new THREE.Mesh(globeGeometry, wireframeMaterial);
      group.add(wireframeGlobe);

      const coreGeometry = new THREE.SphereGeometry(1.85, 32, 32);
      const coreMaterial = new THREE.MeshPhongMaterial({
        color: 0xf0fdf4,
        emissive: 0x0f5142,
        emissiveIntensity: 0.08,
        shininess: 60,
        transparent: true,
        opacity: 0.20,
      });
      const coreGlobe = new THREE.Mesh(coreGeometry, coreMaterial);
      group.add(coreGlobe);

      const rings: { mesh: THREE.Mesh; speed: number }[] = [];
      ringColors.forEach((cfg) => {
        const ringGeom = new THREE.TorusGeometry(cfg.radius, 0.012, 16, 140);
        const ringMat = new THREE.MeshBasicMaterial({
          color: cfg.color,
          transparent: true,
          opacity: 0.30,
        });
        const ringMesh = new THREE.Mesh(ringGeom, ringMat);
        ringMesh.rotation.x = Math.PI * cfg.tiltX;
        ringMesh.rotation.y = Math.PI * cfg.tiltY;
        group.add(ringMesh);
        rings.push({ mesh: ringMesh, speed: cfg.speed });
      });

      const sat1Geom = new THREE.SphereGeometry(0.18, 16, 16);
      const sat1Mat = new THREE.MeshPhongMaterial({ color: 0xb45309, transparent: true, opacity: 0.5, shininess: 80 });
      const sat1 = new THREE.Mesh(sat1Geom, sat1Mat);
      group.add(sat1);

      const sat2Geom = new THREE.SphereGeometry(0.14, 16, 16);
      const sat2Mat = new THREE.MeshPhongMaterial({ color: 0x0284c7, transparent: true, opacity: 0.5, shininess: 80 });
      const sat2 = new THREE.Mesh(sat2Geom, sat2Mat);
      group.add(sat2);

      return {
        group,
        wireframeGlobe,
        coreGlobe,
        coreMaterial,
        rings,
        sat1,
        sat2,
      };
    };

    const rightPlanet = createPlanetSystem(0x0f5142, [
      { radius: 3.4, color: 0x0284c7, tiltX: -0.32, tiltY: 0.3, speed: -0.22 },
      { radius: 4.5, color: 0x0f5142, tiltX: 0.58, tiltY: -0.22, speed: 0.26 },
      { radius: 5.7, color: 0xb45309, tiltX: 0.28, tiltY: -0.48, speed: -0.16 },
    ]);
    scene.add(rightPlanet.group);

    // 4. Update Edge Positions
    const updateEdgePositions = () => {
      const vFov = (camera.fov * Math.PI) / 180;
      const visibleHeight = 2 * Math.tan(vFov / 2) * camera.position.z;
      const visibleWidth = visibleHeight * camera.aspect;

      // San Jerónimo on Left Edge
      if (window.innerWidth < 768) {
        sanJeronimoLeftGroup.position.x = -visibleWidth / 2 + 1.2;
        sanJeronimoLeftGroup.scale.set(0.75, 0.75, 0.75);
      } else {
        sanJeronimoLeftGroup.position.x = -visibleWidth / 2 + 2.2;
        sanJeronimoLeftGroup.scale.set(1.1, 1.1, 1.1);
      }
      sanJeronimoLeftGroup.position.y = 0.1;

      // Right Planet on Right Edge
      rightPlanet.group.position.x = visibleWidth / 2 - 0.3;
      rightPlanet.group.position.y = -0.1;
    };

    updateEdgePositions();

    // 5. Cosmic Star Particles
    const particleCount = 260;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const cAmber = new THREE.Color(0xb45309);
    const cEmerald = new THREE.Color(0x0f5142);
    const cBlue = new THREE.Color(0x0284c7);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 32;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 8;

      const chosenColor = i % 3 === 0 ? cAmber : i % 3 === 1 ? cEmerald : cBlue;
      colors[i * 3] = chosenColor.r;
      colors[i * 3 + 1] = chosenColor.g;
      colors[i * 3 + 2] = chosenColor.b;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const particleMaterial = new THREE.PointsMaterial({
      size: 0.045,
      vertexColors: true,
      transparent: true,
      opacity: 0.32,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // 6. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.25);
    scene.add(ambientLight);

    const lightLeft = new THREE.PointLight(0x0f5142, 1.5, 30);
    lightLeft.position.set(-8, 5, 6);
    scene.add(lightLeft);

    const lightRight = new THREE.PointLight(0xb45309, 1.5, 30);
    lightRight.position.set(8, -4, 6);
    scene.add(lightRight);

    // 7. Mouse Interactivity for 3D Parallax Tilt
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const handleMouseMove = (event: MouseEvent) => {
      mouseX = (event.clientX / window.innerWidth - 0.5) * 2;
      mouseY = -(event.clientY / window.innerHeight - 0.5) * 2;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // 8. Animation Loop
    let animationId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      targetX += (mouseX - targetX) * 0.04;
      targetY += (mouseY - targetY) * 0.04;

      // Left San Jerónimo: Completely static, fixed, zero movement or hover effect
      sanJeronimoLeftGroup.rotation.y = 0;
      sanJeronimoLeftGroup.rotation.x = 0;

      // Animate Right Planet
      rightPlanet.group.rotation.y = targetX * 0.2 - elapsedTime * 0.08;
      rightPlanet.group.rotation.x = -targetY * 0.15;
      rightPlanet.wireframeGlobe.rotation.y -= delta * 0.15;
      rightPlanet.coreGlobe.rotation.y -= delta * 0.08;
      rightPlanet.rings.forEach((r) => (r.mesh.rotation.z += delta * r.speed * 0.4));

      const ra1 = -elapsedTime * 0.6;
      rightPlanet.sat1.position.set(
        Math.cos(ra1) * 3.4,
        Math.sin(ra1) * Math.sin(Math.PI * -0.32) * 3.4,
        Math.sin(ra1) * Math.cos(Math.PI * -0.32) * 3.4
      );
      const ra2 = elapsedTime * 0.4;
      rightPlanet.sat2.position.set(
        Math.cos(ra2) * 4.5,
        Math.sin(ra2) * Math.sin(Math.PI * 0.58) * 4.5,
        Math.sin(ra2) * Math.cos(Math.PI * 0.58) * 4.5
      );

      // Particles slow drift
      particles.rotation.y += delta * 0.02;
      particles.rotation.x += delta * 0.01;

      // Pulse reaction on check-in
      if (pulseIntensityRef.current > 0.01) {
        pulseIntensityRef.current -= delta * 1.5;
        const scale = 1 + pulseIntensityRef.current * 0.18;
        rightPlanet.wireframeGlobe.scale.set(scale, scale, scale);
        rightPlanet.coreMaterial.emissiveIntensity = 0.24 + pulseIntensityRef.current * 0.8;
      } else {
        rightPlanet.wireframeGlobe.scale.set(1, 1, 1);
        rightPlanet.coreMaterial.emissiveIntensity = 0.24;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 9. Window Resize
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.position.z = w < 768 ? 10.5 : 8.5;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      updateEdgePositions();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    if (pulseTrigger > 0) {
      pulseIntensityRef.current = 1.0;
    }
  }, [pulseTrigger]);

  return (
    <div
      ref={mountRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden'
      }}
    />
  );
};
