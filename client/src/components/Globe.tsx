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
        const highlightGeo = new THREE.SphereGeometry(1.5, 16, 16);
        
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
