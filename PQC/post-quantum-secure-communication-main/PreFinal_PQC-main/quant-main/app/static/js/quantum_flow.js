/**
 * ══════════════════════════════════════════════════════════════════════════════
 * CINEMATIC 3D QUANTUM BREACH & TELEPORTATION ENTRY ENGINE (MODEL 5 ADVANCED)
 * Hardware-accelerated Three.js WebGL + Web Audio API Synthesis
 * Triggers seamlessly during authentication entry into the platform.
 * ══════════════════════════════════════════════════════════════════════════════
 */

const QuantumFlow = (() => {
    // Engine State
    let scene = null;
    let camera = null;
    let renderer = null;
    let animId = null;
    let isRunning = false;
    let startTime = 0;
    let onCompleteCallback = null;

    // 3D Visual Components
    let wavePlane = null;
    let waveGeometry = null;
    let starField = null;
    let ringGroup = null;
    let aliceSingularity = null;
    let bobSingularity = null;
    let entanglementArc = null;
    let hexTunnelRings = [];

    // Audio Context & Nodes
    let audioCtx = null;
    let activeAudioNodes = [];

    /**
     * Initializes the WebGL canvas and scene inside #quantum-canvas-container
     */
    function initEngine() {
        const container = document.getElementById('quantum-canvas-container');
        if (!container) return false;

        container.innerHTML = '';
        const width = window.innerWidth;
        const height = window.innerHeight;

        // Scene
        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0x02040a, 0.025);

        // Camera: starts back, plunges forward
        camera = new THREE.PerspectiveCamera(70, width / height, 0.1, 1000);
        camera.position.set(0, 4, 32);
        camera.lookAt(0, 0, 0);

        // Renderer
        renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true,
            powerPreference: "high-performance"
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.domElement.id = 'quantum-canvas';
        container.appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0x00e676, 0.35);
        scene.add(ambientLight);

        const coreLight = new THREE.PointLight(0x00f0ff, 3.5, 60);
        coreLight.position.set(0, 2, 0);
        scene.add(coreLight);

        const purpleLight = new THREE.PointLight(0x8b5cf6, 2.5, 50);
        purpleLight.position.set(0, -5, 10);
        scene.add(purpleLight);

        // Build 3D Components
        buildHyperWarpStars();
        buildHexTunnel();
        buildDeBroglieWaveMesh();
        buildEntangledSingularities();
        buildHolographicRings();

        window.addEventListener('resize', onWindowResize, false);
        return true;
    }

    /**
     * 1. 2,000 Hyper-Speed Light Filaments / Photons
     */
    function buildHyperWarpStars() {
        const count = 2200;
        const geom = new THREE.BufferGeometry();
        const positions = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        const velocities = new Float32Array(count);

        const color1 = new THREE.Color(0x00e676); // Neon Green
        const color2 = new THREE.Color(0x00b0ff); // Electric Blue
        const color3 = new THREE.Color(0x38bdf8); // Cyan
        const color4 = new THREE.Color(0xa855f7); // Ultraviolet

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            const radius = 3 + Math.random() * 22;
            const theta = Math.random() * Math.PI * 2;

            positions[i3]     = Math.cos(theta) * radius;
            positions[i3 + 1] = Math.sin(theta) * radius * 0.7;
            positions[i3 + 2] = (Math.random() - 0.5) * 80;

            const c = [color1, color2, color3, color4][Math.floor(Math.random() * 4)];
            colors[i3]     = c.r;
            colors[i3 + 1] = c.g;
            colors[i3 + 2] = c.b;

            velocities[i] = 0.8 + Math.random() * 1.6;
        }

        geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const mat = new THREE.PointsMaterial({
            size: 0.28,
            vertexColors: true,
            transparent: true,
            opacity: 0.95,
            blending: THREE.AdditiveBlending
        });

        starField = new THREE.Points(geom, mat);
        starField.userData = { velocities };
        scene.add(starField);
    }

    /**
     * 2. Hexagonal Quantum Accelerator Warp Tunnel Rings
     */
    function buildHexTunnel() {
        hexTunnelRings = [];
        const ringCount = 14;

        for (let i = 0; i < ringCount; i++) {
            const radius = 5 + (i * 0.75);
            const hexGeom = new THREE.RingGeometry(radius, radius + 0.08, 6);
            const hexMat = new THREE.MeshBasicMaterial({
                color: i % 2 === 0 ? 0x00e676 : 0x00b0ff,
                transparent: true,
                opacity: 0.35 + (i / ringCount) * 0.3,
                side: THREE.DoubleSide,
                blending: THREE.AdditiveBlending
            });
            const mesh = new THREE.Mesh(hexGeom, hexMat);
            mesh.position.z = -15 + i * 4;
            mesh.userData = { baseZ: mesh.position.z, rotSpeed: 0.015 * (i % 2 === 0 ? 1 : -1) };
            scene.add(mesh);
            hexTunnelRings.push(mesh);
        }
    }

    /**
     * 3. Undulating 3D de Broglie Wave-Particle Surface
     */
    function buildDeBroglieWaveMesh() {
        const segX = 54;
        const segY = 54;
        waveGeometry = new THREE.PlaneGeometry(36, 36, segX, segY);

        const waveMat = new THREE.MeshStandardMaterial({
            color: 0x00e676,
            emissive: 0x0284c7,
            emissiveIntensity: 0.5,
            wireframe: true,
            transparent: true,
            opacity: 0.65,
            roughness: 0.3,
            metalness: 0.8
        });

        wavePlane = new THREE.Mesh(waveGeometry, waveMat);
        wavePlane.rotation.x = -Math.PI / 2.3;
        wavePlane.position.set(0, -4.5, 0);
        scene.add(wavePlane);
    }

    /**
     * 4. Dual Entangled Bell-State |Φ⁺⟩ Singularities (Alice & Bob Qubits)
     */
    function buildEntangledSingularities() {
        const coreGeom = new THREE.SphereGeometry(1.1, 32, 32);

        // Alice Qubit Core (Neon Cyan-Green)
        const aliceMat = new THREE.MeshStandardMaterial({
            color: 0x00e676,
            emissive: 0x00e676,
            emissiveIntensity: 1.8,
            roughness: 0.1,
            wireframe: true
        });
        aliceSingularity = new THREE.Mesh(coreGeom, aliceMat);
        aliceSingularity.position.set(-6, 1, 4);
        scene.add(aliceSingularity);

        // Bob Qubit Core (Electric Blue-Violet)
        const bobMat = new THREE.MeshStandardMaterial({
            color: 0x00b0ff,
            emissive: 0x8b5cf6,
            emissiveIntensity: 1.8,
            roughness: 0.1,
            wireframe: true
        });
        bobSingularity = new THREE.Mesh(coreGeom, bobMat);
        bobSingularity.position.set(6, 1, 4);
        scene.add(bobSingularity);

        // Dynamic Entanglement Lightning Arc Line
        const arcPoints = [];
        for (let i = 0; i <= 24; i++) {
            arcPoints.push(new THREE.Vector3(-6 + (i / 24) * 12, 1, 4));
        }
        const arcGeom = new THREE.BufferGeometry().setFromPoints(arcPoints);
        const arcMat = new THREE.LineBasicMaterial({
            color: 0xffffff,
            linewidth: 2,
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending
        });
        entanglementArc = new THREE.Line(arcGeom, arcMat);
        scene.add(entanglementArc);
    }

    /**
     * 5. Concentric Rotating Cyber Holographic HUD Rings
     */
    function buildHolographicRings() {
        ringGroup = new THREE.Group();

        const ringMat1 = new THREE.MeshBasicMaterial({
            color: 0x00e676,
            wireframe: true,
            transparent: true,
            opacity: 0.4
        });
        const ring1 = new THREE.Mesh(new THREE.TorusGeometry(7.5, 0.05, 8, 48), ringMat1);
        ringGroup.add(ring1);

        const ringMat2 = new THREE.MeshBasicMaterial({
            color: 0x38bdf8,
            wireframe: true,
            transparent: true,
            opacity: 0.35
        });
        const ring2 = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.04, 8, 36), ringMat2);
        ringGroup.add(ring2);

        ringGroup.position.set(0, 1, 2);
        scene.add(ringGroup);
    }

    /**
     * Synthesizes futuristic quantum sci-fi audio using Web Audio API
     */
    function playWarpSound() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            if (!audioCtx) audioCtx = new AudioContext();
            if (audioCtx.state === 'suspended') audioCtx.resume();

            const now = audioCtx.currentTime;

            // 1. Deep sub-bass resonance (40Hz -> 180Hz)
            const oscSub = audioCtx.createOscillator();
            const gainSub = audioCtx.createGain();
            oscSub.type = 'sawtooth';
            oscSub.frequency.setValueAtTime(45, now);
            oscSub.frequency.exponentialRampToValueAtTime(160, now + 2.0);

            gainSub.gain.setValueAtTime(0.01, now);
            gainSub.gain.linearRampToValueAtTime(0.28, now + 0.5);
            gainSub.gain.linearRampToValueAtTime(0.35, now + 1.9);
            gainSub.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

            // Filter for warm sub texture
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(140, now);
            filter.frequency.exponentialRampToValueAtTime(800, now + 2.0);

            oscSub.connect(filter);
            filter.connect(gainSub);
            gainSub.connect(audioCtx.destination);

            oscSub.start(now);
            oscSub.stop(now + 2.4);
            activeAudioNodes.push(oscSub);

            // 2. High-speed laser warp acceleration glide (300Hz -> 1600Hz)
            const oscLaser = audioCtx.createOscillator();
            const gainLaser = audioCtx.createGain();
            oscLaser.type = 'sine';
            oscLaser.frequency.setValueAtTime(320, now + 0.3);
            oscLaser.frequency.exponentialRampToValueAtTime(1800, now + 2.1);

            gainLaser.gain.setValueAtTime(0.001, now + 0.3);
            gainLaser.gain.linearRampToValueAtTime(0.12, now + 1.5);
            gainLaser.gain.exponentialRampToValueAtTime(0.001, now + 2.3);

            oscLaser.connect(gainLaser);
            gainLaser.connect(audioCtx.destination);

            oscLaser.start(now + 0.3);
            oscLaser.stop(now + 2.3);
            activeAudioNodes.push(oscLaser);

            // 3. Crisp cryptographic lock authorization chime at 2.2s
            setTimeout(() => {
                try {
                    const chimeTime = audioCtx.currentTime;
                    const chord = [523.25, 659.25, 783.99, 1046.50]; // C Major high harmonic
                    chord.forEach((freq, idx) => {
                        const osc = audioCtx.createOscillator();
                        const g = audioCtx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, chimeTime + (idx * 0.04));
                        g.gain.setValueAtTime(0.08, chimeTime + (idx * 0.04));
                        g.gain.exponentialRampToValueAtTime(0.0001, chimeTime + 0.8 + (idx * 0.04));
                        osc.connect(g);
                        g.connect(audioCtx.destination);
                        osc.start(chimeTime + (idx * 0.04));
                        osc.stop(chimeTime + 0.9 + (idx * 0.04));
                    });
                } catch (e) {}
            }, 2100);

        } catch (e) {
            // Web Audio not permitted or user interaction policy
        }
    }

    /**
     * Main Animation & Render Loop
     */
    function render() {
        if (!isRunning) return;
        animId = requestAnimationFrame(render);

        const elapsed = (performance.now() - startTime) / 1000; // seconds
        const progress = Math.min(elapsed / 2.3, 1.0); // 0.0 -> 1.0

        // 1. Camera High-Speed Plunge
        // From z = 32 down to z = 2.5
        const easeProg = Math.pow(progress, 1.8);
        camera.position.z = 32 - (easeProg * 28.5);
        camera.position.y = 4 - (easeProg * 2.8);
        camera.lookAt(0, 0.5, 0);

        // 2. Star & Photon Warp Acceleration
        if (starField) {
            const positions = starField.geometry.attributes.position.array;
            const velocities = starField.userData.velocities;
            const warpMultiplier = 1.0 + (progress * 6.5);

            for (let i = 0; i < velocities.length; i++) {
                const i3 = i * 3;
                positions[i3 + 2] += velocities[i] * warpMultiplier;

                // Loop stars from behind to in front
                if (positions[i3 + 2] > camera.position.z + 10) {
                    positions[i3 + 2] = -40;
                }
            }
            starField.geometry.attributes.position.needsUpdate = true;
            starField.rotation.z += 0.003 * warpMultiplier;
        }

        // 3. Hexagonal Tunnel Rings
        hexTunnelRings.forEach((ring, idx) => {
            ring.rotation.z += ring.userData.rotSpeed * (1 + progress * 4);
            ring.position.z += 0.25 * (1 + progress * 5);
            if (ring.position.z > camera.position.z + 5) {
                ring.position.z = -35;
            }
        });

        // 4. Undulating de Broglie Quantum Wave Surface
        if (waveGeometry) {
            const pos = waveGeometry.attributes.position;
            const timeVal = elapsed * 8.0;

            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i);
                const dist = Math.sqrt(x * x + y * y);

                // Wave interference: sin(k*r - w*t) * cos(theta + w*t)
                const zVal = Math.sin(dist * 0.7 - timeVal) * 1.8 * Math.cos(x * 0.3 + timeVal * 0.4);
                pos.setZ(i, zVal);
            }
            pos.needsUpdate = true;
        }

        // 5. Entangled Singularities & Electric Arc
        if (aliceSingularity && bobSingularity && entanglementArc) {
            const orbitRadius = 6 - (progress * 3.5);
            const orbitAngle = elapsed * 3.5;

            aliceSingularity.position.x = Math.cos(orbitAngle) * orbitRadius;
            aliceSingularity.position.y = 1 + Math.sin(orbitAngle * 2) * 0.8;
            aliceSingularity.position.z = 3 + Math.sin(orbitAngle) * orbitRadius;
            aliceSingularity.rotation.y += 0.05;

            bobSingularity.position.x = -Math.cos(orbitAngle) * orbitRadius;
            bobSingularity.position.y = 1 - Math.sin(orbitAngle * 2) * 0.8;
            bobSingularity.position.z = 3 - Math.sin(orbitAngle) * orbitRadius;
            bobSingularity.rotation.y += 0.05;

            // Electric lightning arc jitter
            const arcPos = entanglementArc.geometry.attributes.position;
            const count = arcPos.count;
            const p1 = aliceSingularity.position;
            const p2 = bobSingularity.position;

            for (let i = 0; i < count; i++) {
                const alpha = i / (count - 1);
                const jitterX = (Math.random() - 0.5) * 0.6 * (1 - Math.abs(alpha - 0.5) * 1.5);
                const jitterY = (Math.random() - 0.5) * 0.6;
                const jitterZ = (Math.random() - 0.5) * 0.6;

                arcPos.setXYZ(
                    i,
                    p1.x + (p2.x - p1.x) * alpha + jitterX,
                    p1.y + (p2.y - p1.y) * alpha + jitterY,
                    p1.z + (p2.z - p1.z) * alpha + jitterZ
                );
            }
            arcPos.needsUpdate = true;
        }

        // 6. Holographic Target Rings
        if (ringGroup) {
            ringGroup.children[0].rotation.z += 0.02;
            ringGroup.children[1].rotation.z -= 0.03;
            ringGroup.position.z = camera.position.z - 6;
        }

        // 7. Dynamic HUD Telemetry & Progress
        updateHUDProgress(elapsed, progress);

        // 8. Flash Trigger & Transition Finalization
        if (elapsed >= 2.05) {
            triggerFlash();
        }

        if (elapsed >= 2.4) {
            finishFlow();
            return;
        }

        renderer.render(scene, camera);
    }

    /**
     * Updates the holographic HUD telemetry texts based on elapsed seconds
     */
    function updateHUDProgress(elapsed, progress) {
        const bar = document.getElementById('quantum-warp-bar');
        const titleEl = document.getElementById('quantum-warp-title');
        const termEl = document.getElementById('quantum-warp-terminal');

        const pct = Math.round(progress * 100);
        if (bar) bar.style.width = `${pct}%`;

        if (elapsed < 0.65) {
            if (titleEl) titleEl.innerText = "INITIATING TELEPORTATION MATRIX";
            if (termEl) termEl.innerHTML = `> [PHASE 1] Entangling Bell State |Φ⁺⟩: (${pct}% synchronized)...`;
        } else if (elapsed < 1.35) {
            if (titleEl) titleEl.innerText = "ML-KEM-768 LATTICE REDUCTION";
            if (termEl) termEl.innerHTML = `> [PHASE 2] Solving Module-LWE public vector t = A·s + e mod q...`;
        } else if (elapsed < 1.95) {
            if (titleEl) titleEl.innerText = "DE BROGLIE WAVEFRONT COLLAPSE";
            if (termEl) termEl.innerHTML = `> [PHASE 3] Deriving AES-256-GCM symmetric session key...`;
        } else {
            if (titleEl) titleEl.innerText = "QUANTUM PORTAL BREACH VERIFIED";
            if (termEl) termEl.innerHTML = `<span style="color:#00e676;">> [AUTHORIZED] Decryption complete. Entering secure dashboard...</span>`;
        }
    }

    /**
     * Triggers the blinding white/cyan speed-of-light quantum flash
     */
    function triggerFlash() {
        const flash = document.getElementById('quantum-flash-overlay');
        if (flash && !flash.classList.contains('flashing')) {
            flash.classList.add('flashing');
        }
    }

    /**
     * Finishes the 3D flow, cleans up WebGL scene, and invokes callback
     */
    function finishFlow() {
        isRunning = false;
        if (animId) cancelAnimationFrame(animId);

        const portal = document.getElementById('quantum-login-portal');
        const flash = document.getElementById('quantum-flash-overlay');

        if (portal) {
            portal.style.transition = 'opacity 0.3s ease-out';
            portal.style.opacity = '0';
        }

        setTimeout(() => {
            if (portal) {
                portal.classList.remove('active');
                portal.style.display = 'none';
                portal.style.opacity = '1';
            }
            if (flash) flash.classList.remove('flashing');

            // Dispose WebGL resources
            cleanupThree();

            // Transition callback into app dashboard
            if (onCompleteCallback) {
                onCompleteCallback();
                onCompleteCallback = null;
            }
        }, 320);
    }

    /**
     * Cleanly disposes Three.js geometries, textures, and materials to prevent memory leaks
     */
    function cleanupThree() {
        if (scene) {
            scene.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
            scene = null;
        }
        camera = null;
        if (renderer) {
            renderer.dispose();
            renderer.forceContextLoss();
            renderer.domElement.remove();
            renderer = null;
        }
    }

    function onWindowResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    /**
     * PUBLIC API: Trigger the cinematic 3D Quantum Login Entry Flow
     * @param {Object} user - Authenticated user details
     * @param {Function} callback - Function called when transition finishes
     */
    function startLoginFlow(user, callback) {
        onCompleteCallback = callback;

        const portal = document.getElementById('quantum-login-portal');
        if (!portal) {
            if (callback) callback();
            return;
        }

        // Reset HUD and flash
        const flash = document.getElementById('quantum-flash-overlay');
        if (flash) flash.classList.remove('flashing');

        const bar = document.getElementById('quantum-warp-bar');
        if (bar) bar.style.width = '0%';

        portal.style.display = 'flex';
        portal.classList.add('active');
        portal.style.opacity = '1';

        // Setup Skip Button
        const skipBtn = document.getElementById('quantum-warp-skip');
        if (skipBtn) {
            skipBtn.onclick = (e) => {
                e.stopPropagation();
                finishFlow();
            };
        }

        // Pressing Escape also skips
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                window.removeEventListener('keydown', escHandler);
                finishFlow();
            }
        };
        window.addEventListener('keydown', escHandler);

        // Initialize 3D Engine and start sequence
        const ok = initEngine();
        if (!ok) {
            if (callback) callback();
            return;
        }

        startTime = performance.now();
        isRunning = true;
        playWarpSound();
        render();
    }

    return {
        startLoginFlow,
        finishFlow
    };
})();

// Attach globally
window.QuantumFlow = QuantumFlow;
