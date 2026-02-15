/**
     * ==========================================
     * SOLAR SYSTEM ENGINE - CORE JAVASCRIPT
     * Developed by: Anaf Ibn Shahibul
     * Features: Raycasting, Procedural Textures, 
     * Particle Systems, Cinematic Camera
     * ==========================================
     */

    // --- 1. SCENE SETUP ---
    const scene = new THREE.Scene();
    // Background Fog for depth (Very dark blue-ish black)
    scene.fog = new THREE.FogExp2(0x000005, 0.00015);
    
    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 20000);
    camera.position.set(0, 400, 600); // High angle start

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 5000;
    
    // --- 2. LIGHTING (THE SUN) ---
    // User requested "Bright Old Style" Sun
    
    // Core Point Light (The physics light)
    const sunLight = new THREE.PointLight(0xffffff, 2.5, 5000);
    sunLight.position.set(0, 0, 0);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048; // High res shadows
    sunLight.shadow.mapSize.height = 2048;
    scene.add(sunLight);

    // Ambient Light (So shadows aren't pitch black)
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);


    // --- 3. TEXTURE GENERATORS (Procedural Canvas) ---
    // Generating high-quality textures in code to keep it single-file

    const textureLoader = new THREE.TextureLoader();

    function getProceduralTexture(type, color1, color2) {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const w = 512, h = 512;

        // Base
        ctx.fillStyle = color1;
        ctx.fillRect(0,0,w,h);

        if(type === 'sun') {
            // Bright solid core
            ctx.fillStyle = '#ffcc00';
            ctx.fillRect(0,0,w,h);
            // Heat waves
            for(let i=0; i<100; i++) {
                ctx.beginPath();
                ctx.arc(Math.random()*w, Math.random()*h, Math.random()*50, 0, Math.PI*2);
                ctx.fillStyle = 'rgba(255, 100, 0, 0.2)';
                ctx.fill();
            }
        } 
        else if (type === 'earth') {
            // Vibrant Blue Water
            ctx.fillStyle = '#0044ff'; 
            ctx.fillRect(0,0,w,h);
            // Green Continents
            ctx.fillStyle = '#00aa33';
            for(let i=0; i<80; i++) {
                const x = Math.random()*w; const y = Math.random()*h;
                const r = Math.random()*60 + 20;
                ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
            }
            // Clouds
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            for(let i=0; i<100; i++) {
                ctx.beginPath(); ctx.arc(Math.random()*w, Math.random()*h, Math.random()*30, 0, Math.PI*2); ctx.fill();
            }
        }
        else if (type === 'gas') {
            // Banded texture
            const grad = ctx.createLinearGradient(0,0,0,h);
            grad.addColorStop(0, color1);
            grad.addColorStop(0.5, color2);
            grad.addColorStop(1, color1);
            ctx.fillStyle = grad;
            ctx.fillRect(0,0,w,h);
            // Stripes
            for(let i=0; i<20; i++) {
                ctx.fillStyle = 'rgba(0,0,0,0.1)';
                ctx.fillRect(0, Math.random()*h, w, Math.random()*20);
            }
        }
        else {
            // Rocky noise
            for(let i=0; i<5000; i++) {
                ctx.fillStyle = Math.random() > 0.5 ? color2 : '#000000';
                ctx.globalAlpha = 0.1;
                ctx.fillRect(Math.random()*w, Math.random()*h, 2, 2);
            }
        }

        return new THREE.CanvasTexture(canvas);
    }

    // --- 4. OBJECT BUILDERS ---

    const interactables = []; // Objects we can click
    const updatables = []; // Things that move

    // A. SUN MESH
    const sunGeo = new THREE.SphereGeometry(35, 64, 64);
    const sunMat = new THREE.MeshBasicMaterial({ map: getProceduralTexture('sun', '#ffd700', '#ff8800') });
    const sun = new THREE.Mesh(sunGeo, sunMat);
    scene.add(sun);

    // B. SUN GLOW (SPRITE) - The "Bright" effect
    const spriteCanvas = document.createElement('canvas');
    spriteCanvas.width = 128; spriteCanvas.height = 128;
    const sCtx = spriteCanvas.getContext('2d');
    const grad = sCtx.createRadialGradient(64,64,0,64,64,64);
    grad.addColorStop(0, 'rgba(255, 220, 100, 1)'); // Center bright
    grad.addColorStop(0.3, 'rgba(255, 150, 0, 0.4)'); // Mid Orange
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)'); // Edge transparent
    sCtx.fillStyle = grad;
    sCtx.fillRect(0,0,128,128);
    
    const glowMat = new THREE.SpriteMaterial({ 
        map: new THREE.CanvasTexture(spriteCanvas), 
        color: 0xffdd44, 
        blending: THREE.AdditiveBlending 
    });
    const sunGlow = new THREE.Sprite(glowMat);
    sunGlow.scale.set(220, 220, 1); // Big glow radius
    sun.add(sunGlow);

    // C. PLANET CONFIG DATA
    const planets = [
        { name: "MERCURY", r: 3, d: 70, s: 0.04, c1: '#aaaaaa', c2: '#555555', type: 'rocky', desc: "Fastest planet, sun-scorched surface.", moons: [] },
        { name: "VENUS", r: 5.5, d: 100, s: 0.015, c1: '#eecfa1', c2: '#dbb47e', type: 'rocky', desc: "Hottest planet due to greenhouse gases.", moons: [] },
        { name: "EARTH", r: 6, d: 140, s: 0.01, c1: '#0000ff', c2: '#00ff00', type: 'earth', desc: "Our home. The only known life.", moons: [{name:"Moon", r:1.5, d:12}] },
        { name: "MARS", r: 4.5, d: 180, s: 0.008, c1: '#c1440e', c2: '#8a2be2', type: 'rocky', desc: "The Red Planet. Possible ancient water.", moons: [{name:"Phobos", r:0.5, d:6}, {name:"Deimos", r:0.3, d:8}] },
        { name: "JUPITER", r: 18, d: 300, s: 0.004, c1: '#d9cdb1', c2: '#a97c50', type: 'gas', desc: "King of planets. Massive gas giant.", moons: [{name:"Io", r:1.8, d:25}, {name:"Europa", r:1.6, d:28}, {name:"Ganymede", r:2.2, d:34}, {name:"Callisto", r:2, d:40}] },
        { name: "SATURN", r: 15, d: 420, s: 0.003, c1: '#f4d03f', c2: '#c9a128', type: 'gas', desc: "Known for its majestic ring system.", ring: true, moons: [{name:"Titan", r:2, d:30}] },
        { name: "URANUS", r: 10, d: 520, s: 0.002, c1: '#73acac', c2: '#ffffff', type: 'gas', desc: "Ice giant that spins on its side.", moons: [{name:"Titania", r:1, d:18}] },
        { name: "NEPTUNE", r: 9.5, d: 600, s: 0.0018, c1: '#3333ff', c2: '#111199', type: 'gas', desc: "Windiest planet. Dark blue world.", moons: [{name:"Triton", r:1.2, d:20}] },
        // Dwarf Planets
        { name: "CERES", r: 1.5, d: 240, s: 0.007, c1: '#888888', c2: '#444444', type: 'rocky', desc: "Queen of the asteroid belt.", moons: [] },
        { name: "PLUTO", r: 2.5, d: 700, s: 0.001, c1: '#dcb', c2: '#987', type: 'rocky', desc: "Dwarf planet with a heart-shaped glacier.", moons: [{name:"Charon", r:1.2, d:8}] },
        { name: "ERIS", r: 2.6, d: 800, s: 0.0008, c1: '#fff', c2: '#eee', type: 'rocky', desc: "More massive than Pluto.", moons: [] },
        { name: "MAKEMAKE", r: 2.4, d: 900, s: 0.0007, c1: '#aa5555', c2: '#552222', type: 'rocky', desc: "Reddish dwarf planet.", moons: [] }
    ];

    // D. BUILD PLANETS LOOP
    planets.forEach(p => {
        // Orbit Pivot (Center)
        const pivot = new THREE.Object3D();
        scene.add(pivot);
        
        // Random Start Position
        pivot.rotation.y = Math.random() * Math.PI * 2;

        // Planet Group
        const pGroup = new THREE.Group();
        pGroup.position.x = p.d;
        pivot.add(pGroup);

        // Planet Mesh
        const mat = new THREE.MeshStandardMaterial({ 
            map: getProceduralTexture(p.type, p.c1, p.c2),
            roughness: 0.6, metalness: 0.2
        });
        // Make Earth brighter
        if(p.type === 'earth') { mat.emissive = new THREE.Color(0x001133); mat.emissiveIntensity = 0.3; }

        const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 32, 32), mat);
        mesh.castShadow = true; 
        mesh.receiveShadow = true;
        
        // Add data to mesh for Raycasting
        mesh.userData = { isPlanet: true, name: p.name, data: p };
        
        pGroup.add(mesh);
        interactables.push(mesh);
        p.meshRef = mesh; // Save for camera

        // Orbit Trail (Line)
        const trackGeo = new THREE.RingGeometry(p.d - 0.5, p.d + 0.5, 128);
        const trackMat = new THREE.MeshBasicMaterial({ color: 0xffffff, opacity: 0.1, transparent: true, side: THREE.DoubleSide });
        const track = new THREE.Mesh(trackGeo, trackMat);
        track.rotation.x = Math.PI/2;
        scene.add(track);

        // Rings (Saturn)
        if(p.ring) {
            const ringGeo = new THREE.RingGeometry(p.r * 1.4, p.r * 2.5, 64);
            const ringMat = new THREE.MeshStandardMaterial({ color: 0xccbbaa, opacity: 0.7, transparent: true, side: THREE.DoubleSide });
            const rings = new THREE.Mesh(ringGeo, ringMat);
            rings.rotation.x = Math.PI/2;
            mesh.add(rings);
        }

        // Moons
        if(p.moons.length > 0) {
            p.moons.forEach(m => {
                const mPivot = new THREE.Object3D();
                mesh.add(mPivot); // Moon orbits planet
                
                const mGeo = new THREE.SphereGeometry(m.r, 16, 16);
                const mMat = new THREE.MeshStandardMaterial({ color: 0xdddddd });
                const mMesh = new THREE.Mesh(mGeo, mMat);
                mMesh.position.x = m.d;
                mMesh.castShadow = true; mMesh.receiveShadow = true;
                mPivot.add(mMesh);

                // Moon animation
                updatables.push((speed) => {
                    mPivot.rotation.y += (0.05 / m.d * 10) * speed;
                });
            });
        }

        // Planet Animation
        updatables.push((speed) => {
            pivot.rotation.y += p.s * speed; // Orbit
            mesh.rotation.y += 0.02; // Spin
        });
    });

    // --- 5. ASTEROID BELT (InstancedMesh) ---
    function createAsteroids() {
        const count = 5000;
        const geo = new THREE.TetrahedronGeometry(0.8, 1);
        const mat = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.9 });
        const mesh = new THREE.InstancedMesh(geo, mat, count);
        
        const dummy = new THREE.Object3D();
        for(let i=0; i<count; i++) {
            // Between Mars (180) and Jupiter (300), concentrated around 240
            const dist = 220 + Math.random() * 60;
            const angle = Math.random() * Math.PI * 2;
            const h = (Math.random() - 0.5) * 20; // Spread height

            dummy.position.set(
                Math.cos(angle) * dist,
                h,
                Math.sin(angle) * dist
            );
            dummy.rotation.set(Math.random()*3, Math.random()*3, Math.random()*3);
            dummy.scale.setScalar(Math.random() * 2 + 0.5);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        scene.add(mesh);
        
        // Rotate belt
        updatables.push((speed) => {
            mesh.rotation.y += 0.0005 * speed;
        });
    }
    createAsteroids();

    // --- 6. COMET SYSTEM (Special Feature) ---
    function createComet() {
        const cometHead = new THREE.Mesh(
            new THREE.SphereGeometry(1, 16, 16),
            new THREE.MeshBasicMaterial({ color: 0x00ffff })
        );
        scene.add(cometHead);

        // Trail (Particles)
        const trailGeo = new THREE.BufferGeometry();
        const trailCount = 50;
        const positions = new Float32Array(trailCount * 3);
        trailGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const trailMat = new THREE.PointsMaterial({ color: 0x00ffff, size: 2, transparent: true, opacity: 0.6 });
        const trail = new THREE.Points(trailGeo, trailMat);
        scene.add(trail);

        let t = 0;
        const trailPositions = [];

        updatables.push((speed) => {
            t += 0.008 * speed;
            // Elliptical Orbit
            const x = Math.cos(t) * 150 + 50; // Offset center
            const z = Math.sin(t) * 400;
            
            cometHead.position.set(x, z * 0.1, z); // Tilt orbit

            // Update Trail
            trailPositions.unshift(cometHead.position.clone());
            if(trailPositions.length > trailCount) trailPositions.pop();

            const arr = trail.geometry.attributes.position.array;
            for(let i=0; i<trailPositions.length; i++) {
                arr[i*3] = trailPositions[i].x;
                arr[i*3+1] = trailPositions[i].y;
                arr[i*3+2] = trailPositions[i].z;
            }
            trail.geometry.attributes.position.needsUpdate = true;
        });
    }
    createComet();

    // --- 7. STARFIELD (Background) ---
    function createStars() {
        const geo = new THREE.BufferGeometry();
        const pos = [];
        const cols = [];
        for(let i=0; i<10000; i++) {
            pos.push((Math.random()-0.5)*10000, (Math.random()-0.5)*10000, (Math.random()-0.5)*10000);
            const c = new THREE.Color();
            c.setHSL(Math.random(), 0.8, 0.8);
            cols.push(c.r, c.g, c.b);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        const mat = new THREE.PointsMaterial({ size: 2, vertexColors: true });
        const stars = new THREE.Points(geo, mat);
        scene.add(stars);
    }
    createStars();


    // --- 8. INTERACTION & LOGIC ---
    
    // Raycaster
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const tooltip = document.getElementById('tooltip');

    window.addEventListener('mousemove', (e) => {
        // UI Handling
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        // Tooltip pos
        tooltip.style.left = e.clientX + 'px';
        tooltip.style.top = e.clientY + 'px';

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactables);

        if(intersects.length > 0) {
            const data = intersects[0].object.userData;
            document.body.style.cursor = 'pointer';
            tooltip.style.opacity = 1;
            tooltip.innerText = data.name;
        } else {
            document.body.style.cursor = 'default';
            tooltip.style.opacity = 0;
        }
    });

    window.addEventListener('click', (e) => {
        if(e.target.closest('#ui-layer button') || e.target.closest('#info-panel')) return;
        
        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(interactables);
        if(intersects.length > 0) {
            openPanel(intersects[0].object.userData);
        }
    });

    function openPanel(data) {
        if(!data.data) return; // Ignore if no data
        const d = data.data;
        document.getElementById('p-name').innerText = d.name;
        document.getElementById('p-type').innerText = d.type.toUpperCase() + " PLANET";
        document.getElementById('p-temp').innerText = "CALCULATING..."; // Placeholder
        document.getElementById('p-dia').innerText = (d.r * 2 * 1000).toLocaleString() + " km";
        document.getElementById('p-dist').innerText = d.d + " Million Km";
        document.getElementById('p-desc').innerText = d.desc;
        document.getElementById('p-speed').innerText = (d.s * 1000).toFixed(1) + " km/s";

        const mContainer = document.getElementById('p-moons');
        mContainer.innerHTML = '';
        if(d.moons.length > 0) {
            d.moons.forEach(m => {
                const badge = document.createElement('div');
                badge.className = 'moon-badge';
                badge.innerText = m.name;
                mContainer.appendChild(badge);
            });
        } else {
            mContainer.innerHTML = '<span style="color:#666; font-size:12px;">No Moons Detected</span>';
        }

        document.getElementById('info-panel').classList.add('active');
        
        // Auto focus camera?
        // controls.target.copy(data.meshRef.position);
    }

    window.closePanel = () => document.getElementById('info-panel').classList.remove('active');

    // --- 9. CAMERA & CINEMATICS ---
    let tourMode = false;
    let tourIndex = 0;
    let tourTimer = 0;

    window.toggleTour = () => {
        tourMode = !tourMode;
        const btn = document.getElementById('tourBtn');
        if(tourMode) {
            btn.classList.add('active-mode');
            btn.innerText = "STOP TOUR";
            closePanel();
        } else {
            btn.classList.remove('active-mode');
            btn.innerText = "CINEMATIC TOUR";
            controls.autoRotate = false;
        }
    };

    window.resetCam = () => {
        tourMode = false;
        camera.position.set(0, 500, 0);
        controls.target.set(0,0,0);
    };

    // --- 10. MAIN LOOP ---
    const dateEl = document.getElementById('ui-date');
    const speedInput = document.getElementById('speedSlider');
    let timeSpeed = 1;
    let days = 0;

    speedInput.addEventListener('input', (e) => timeSpeed = parseFloat(e.target.value));

    function animate() {
        requestAnimationFrame(animate);
        
        // Run Physics
        updatables.forEach(fn => fn(timeSpeed));

        // Update Date
        if(timeSpeed > 0) {
            days += timeSpeed * 0.5;
            dateEl.innerText = "Year " + Math.floor(days/365 + 1) + " | Day " + Math.floor(days%365);
        }

        // Tour Mode Logic
        if(tourMode) {
            tourTimer += 0.01;
            if(tourTimer > 5) { // Switch every 5 seconds (simulated time unit)
                tourIndex = (tourIndex + 1) % planets.length;
                tourTimer = 0;
            }
            
            const targetP = planets[tourIndex];
            if(targetP.meshRef) {
                // Smooth follow
                const targetPos = new THREE.Vector3();
                targetP.meshRef.getWorldPosition(targetPos);
                
                // Camera lerp
                const camOffset = targetPos.clone().add(new THREE.Vector3(targetP.r*4, targetP.r*2, targetP.r*4));
                camera.position.lerp(camOffset, 0.05);
                controls.target.lerp(targetPos, 0.05);
            }
        }

        controls.update();
        renderer.render(scene, camera);
    }

    // Hide loader
    setTimeout(() => {
        document.getElementById('loader').style.opacity = 0;
        setTimeout(() => document.getElementById('loader').remove(), 1000);
    }, 1500);

    animate();

    // Resize Handler
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });

   const bgMusic = new Audio('music.mp3');
bgMusic.loop = true; 
bgMusic.volume = 0.5; 

window.addEventListener('mousedown', () => {
    bgMusic.play().catch(e => console.log("Audio play blocked"));
}, { once: true }); 
