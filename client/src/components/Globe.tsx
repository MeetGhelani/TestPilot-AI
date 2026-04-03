import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const Globe: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mountRef.current) return;
        const container = mountRef.current;

        // ==========================================
        // 1. Scene, Camera, Renderer Setup
        // ==========================================
        const scene = new THREE.Scene();

        // Perspective camera for 3D realism
        const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 1, 2000);
        camera.position.z = 300; // Adjusted distance so globe is not too big and not too small

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // optimize performance
        container.appendChild(renderer.domElement);

        // ==========================================
        // 2. The Globe Grid/Wireframe
        // ==========================================
        const globeGroup = new THREE.Group();
        scene.add(globeGroup);

        const RADIUS = 100;

        // Invisible occluder to block the back half of the globe from showing through
        // (This prevents the optical illusion of the globe suddenly spinning backward)
        const occluderGeo = new THREE.SphereGeometry(RADIUS * 0.99, 64, 64);
        const occluderMat = new THREE.MeshBasicMaterial({ 
            colorWrite: false, 
            depthWrite: true 
        });
        const occluderMesh = new THREE.Mesh(occluderGeo, occluderMat);
        globeGroup.add(occluderMesh);

        // Base wireframe sphere to give the "digital grid" look
        const sphereGeo = new THREE.SphereGeometry(RADIUS, 64, 64);
        const sphereMat = new THREE.MeshPhongMaterial({
            color: 0x000000,
            emissive: 0x39ff14, // Neon green glow
            emissiveIntensity: 0.3,
            wireframe: true,
            transparent: true,
            opacity: 0.15
        });
        const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
        globeGroup.add(sphereMesh);

        // ==========================================
        // 3. Lighting (Keep minimal for wireframe)
        // ==========================================
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);
        
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(50, 50, 50);
        scene.add(dirLight);

        // ==========================================
        // 4. Geographic Borders (GeoJSON)
        // ==========================================
        // We fetch public geojson data to trace the land masses
        fetch('https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson')
            .then(res => res.json())
            .then(data => {
                const lineMat = new THREE.LineBasicMaterial({
                    color: 0x39ff14, // Neon green glow for borders
                    transparent: true,
                    opacity: 0.8
                });

                data.features.forEach((feature: any) => {
                    if (!feature.geometry) return;
                    
                    const coords = feature.geometry.coordinates;
                    if (feature.geometry.type === 'Polygon') {
                        coords.forEach((ring: any) => drawRing(ring, lineMat));
                    } else if (feature.geometry.type === 'MultiPolygon') {
                        coords.forEach((poly: any) => {
                            poly.forEach((ring: any) => drawRing(ring, lineMat));
                        });
                    }
                });

                function drawRing(ring: number[][], material: THREE.Material) {
                    const points: THREE.Vector3[] = [];
                    ring.forEach((coord: number[]) => {
                        const lon = coord[0];
                        const lat = coord[1];
                        
                        // Convert Lat/Lon to Sphere mapping
                        const phi = (90 - lat) * (Math.PI / 180);
                        const theta = (lon + 180) * (Math.PI / 180);

                        const x = -(RADIUS * Math.sin(phi) * Math.cos(theta));
                        const z = (RADIUS * Math.sin(phi) * Math.sin(theta));
                        const y = RADIUS * Math.cos(phi);
                        
                        points.push(new THREE.Vector3(x, y, z));
                    });
                    const geometry = new THREE.BufferGeometry().setFromPoints(points);
                    // Elevate slightly above the grid to prevent z-fighting
                    geometry.scale(1.01, 1.01, 1.01);
                    const line = new THREE.Line(geometry, material);
                    globeGroup.add(line);
                }
            })
            .catch(err => console.error('Error loading world map data for globe', err));

        // ==========================================
        // 4.5 Highlight Points (Random 15 locations)
        // ==========================================
        const highlightMat = new THREE.MeshBasicMaterial({
            color: 0xc8f056, // TestPilot neon accent color
            transparent: true,
            opacity: 0.9
        });
        const highlightGeo = new THREE.SphereGeometry(1.5, 20, 20);
        
        // Track the meshes to animate them later
        const pointMeshes: { mesh: THREE.Mesh, offset: number }[] = [];

        // Predefined major tech/datacenter hubs (strictly on land), including several in India
        const landPoints = [
            { lat: 37.7749, lon: -122.4194 },  // San Francisco
            { lat: 40.7128, lon: -74.0060 },   // New York
            { lat: 51.5074, lon: -0.1278 },    // London
            { lat: 48.8566, lon: 2.3522 },     // Paris
            { lat: 52.5200, lon: 13.4050 },    // Berlin
            { lat: 35.6762, lon: 139.6503 },   // Tokyo
            { lat: 1.3521,  lon: 103.8198 },   // Singapore
            { lat: -33.8688,lon: 151.2093 },   // Sydney
            { lat: 19.0760, lon: 72.8777 },    // Mumbai, India
            { lat: 12.9716, lon: 77.5946 },    // Bangalore, India
            { lat: 28.6139, lon: 77.2090 },    // New Delhi, India
            { lat: -23.5505,lon: -46.6333 },   // Sao Paulo
            { lat: -33.9249,lon: 18.4241 },    // Cape Town
            { lat: 25.2048, lon: 55.2708 },    // Dubai
            { lat: 43.6510, lon: -79.3470 },   // Toronto
            { lat: 37.5665, lon: 126.9780 }    // Seoul
        ];

        landPoints.forEach((loc) => {
            const lat = loc.lat;
            const lon = loc.lon;
            
            const phi = (90 - lat) * (Math.PI / 180);
            const theta = (lon + 180) * (Math.PI / 180);

            const x = -(RADIUS * Math.sin(phi) * Math.cos(theta));
            const z = (RADIUS * Math.sin(phi) * Math.sin(theta));
            const y = RADIUS * Math.cos(phi);
            
            const pointMesh = new THREE.Mesh(highlightGeo, highlightMat);
            pointMesh.position.set(x, y, z);
            // Push slightly out from the wireframe so they float on the surface
            pointMesh.position.multiplyScalar(1.02);
            globeGroup.add(pointMesh);
            
            // Store with a random phase offset for asynchronous blinking
            pointMeshes.push({ mesh: pointMesh, offset: Math.random() * Math.PI * 2 });
        });

        // ==========================================
        // 4.6 Arcs/Links Between Points
        // ==========================================
        const linkMat = new THREE.LineBasicMaterial({
            color: 0xc8f056,
            transparent: true,
            opacity: 0.15 // Base static line is faint
        });

        // The bright traveling comet tail
        const laserMat = new THREE.LineBasicMaterial({
            color: 0xc8f056,
            transparent: true,
            opacity: 0.95
        });

        // Keep track of arc laser geometries to animate
        const arcLasers: { line: THREE.Line, maxDots: number, offset: number, speed: number }[] = [];

        const numArcs = 25;
        for (let i = 0; i < numArcs; i++) {
            // Pick two random unique points
            const startIdx = Math.floor(Math.random() * pointMeshes.length);
            let endIdx = Math.floor(Math.random() * pointMeshes.length);
            while (endIdx === startIdx) {
                endIdx = Math.floor(Math.random() * pointMeshes.length);
            }

            const p1 = pointMeshes[startIdx].mesh.position.clone();
            const p2 = pointMeshes[endIdx].mesh.position.clone();

            const pointsCount = 40; // denser geometry for smoother arcs
            const arcPoints: THREE.Vector3[] = [];
            const distance = p1.distanceTo(p2);
            
            // Reduced peak height depending on distance so it hugs the surface tighter
            const peakHeight = distance * 0.07; 
            
            for (let j = 0; j <= pointsCount; j++) {
                const t = j / pointsCount;
                // Linear interpolation inside the sphere
                const lerped = new THREE.Vector3().copy(p1).lerp(p2, t);
                // Normalize pushes it precisely onto the unit sphere surface
                lerped.normalize();
                // Sine wave height modifier forms the arc overhead
                const currentHeight = RADIUS * 1.02 + Math.sin(t * Math.PI) * peakHeight;
                lerped.multiplyScalar(currentHeight);
                arcPoints.push(lerped);
            }
            
            const arcGeo = new THREE.BufferGeometry().setFromPoints(arcPoints);
            const arcLine = new THREE.Line(arcGeo, linkMat);
            globeGroup.add(arcLine);

            // Clone geometry for the bright moving laser
            const laserGeo = arcGeo.clone();
            laserGeo.setDrawRange(0, 0); // Hide initially
            const laserLine = new THREE.Line(laserGeo, laserMat);
            globeGroup.add(laserLine);

            arcLasers.push({
                line: laserLine,
                maxDots: pointsCount + 1,
                offset: -Math.floor(Math.random() * pointsCount), // Random start phase
                speed: 0.15 + Math.random() * 0.3 // Random velocity
            });
        }

        // ==========================================
        // 5. Controls & Interaction
        // ==========================================
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enablePan = false; // keep it centered
        controls.enableZoom = false; // fix the size (no zoom in or out)
        
        let isInteracting = false;
        controls.addEventListener('start', () => { isInteracting = true; });
        controls.addEventListener('end', () => { isInteracting = false; });

        // Set initial rotation to face India (approx long 78)
        // Camera is naturally facing long -90, so difference is ~168 degrees
        globeGroup.rotation.y = -(78 + 90) * (Math.PI / 180);

        // ==========================================
        // 6. Animation Loop
        // ==========================================
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            
            const time = Date.now() * 0.003; // speed of the blink

            // Animate points (Pulse/Blink effect)
            pointMeshes.forEach(data => {
                // scale pulses between ~0.3 and ~1.2
                const scale = 0.75 + Math.sin(time + data.offset) * 0.45;
                data.mesh.scale.setScalar(scale);
            });

            // Animate laser tails bridging the arcs
            arcLasers.forEach(laser => {
                laser.offset += laser.speed;
                // If it passes the end perfectly, restart from varying negative offset
                if (laser.offset > laser.maxDots * 1.5) {
                    laser.offset = -10 - Math.random() * 20; 
                    laser.speed = 0.15 + Math.random() * 0.3; 
                }
                
                const tailLength = Math.max(4, Math.floor(laser.maxDots * 0.25));
                const start = Math.floor(laser.offset);
                
                const drawStart = Math.max(0, start - tailLength);
                const drawEnd = Math.min(laser.maxDots, start);
                const count = drawEnd - drawStart;
                
                if (count > 0) {
                    laser.line.geometry.setDrawRange(drawStart, count);
                } else {
                    laser.line.geometry.setDrawRange(0, 0);
                }
            });

            // Auto rotation that pauses during user interaction
            if (!isInteracting) {
                globeGroup.rotation.y -= 0.0015; 
            }
            
            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // ==========================================
        // 7. Responsive Resizer
        // ==========================================
        const handleResize = () => {
            if (!container) return;
            const width = container.clientWidth;
            const height = container.clientHeight;
            
            renderer.setSize(width, height);
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
        };
        window.addEventListener('resize', handleResize);

        // ==========================================
        // 8. Cleanup on Unmount
        // ==========================================
        return () => {
            window.removeEventListener('resize', handleResize);
            cancelAnimationFrame(animationFrameId);
            controls.dispose();
            
            // Dispose of Three.js resources to prevent memory leaks
            globeGroup.children.forEach(child => {
                if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
                    if (child.geometry) child.geometry.dispose();
                    if (child.material) {
                        if (Array.isArray(child.material)) {
                            child.material.forEach(m => m.dispose());
                        } else {
                            child.material.dispose();
                        }
                    }
                }
            });
            
            renderer.dispose();
            if (container.contains(renderer.domElement)) {
                container.removeChild(renderer.domElement);
            }
        };
    }, []);

    return (
        <div 
            ref={mountRef} 
            style={{ 
                width: '100%', 
                height: '100%', 
                background: 'transparent',
                overflow: 'hidden',
                cursor: 'grab'
            }} 
        />
    );
};

export default Globe;
