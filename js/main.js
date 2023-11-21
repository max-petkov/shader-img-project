import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

function Sketch() {
    this.canvas = document.getElementById("container").firstElementChild;
    this.imgs = document.querySelectorAll("img");
    this.loadedImages = [];
    this.scene = null;
    this.camera = null;
    this.geometry = null;
    this.material = null;
    this.renderer = null;
    this.mesh = null;
    this.controls = null;
    this.composer = null;
    this.customPass = null;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.size = {
        width: window.innerWidth,
        height: window.innerHeight
    }
    this.lenis = new Lenis({duration: 0.9});
    this.scrollCurrent = 0;
    this.scrollPrevious = 0;
}

Sketch.prototype.createScene = function() {
    this.scene = new THREE.Scene();
}

Sketch.prototype.createCamera = function() {
    // Calculating Height of viewport of THREEJS (units) to be EQUAL to the height of browser (pixels)
    // The idea is to connect the two worlds (THREEJS and Browser) and units to be equl to pixels
    const dist = 1;
    const fov = 2 * Math.atan((this.size.height / 2) / dist) * (180 / Math.PI);
    this.camera = new THREE.PerspectiveCamera(fov, this.size.width / this.size.height);
    this.camera.position.z = dist;
}

Sketch.prototype.createModel = function() {
    /* 
        Field of View is calculated in createCamera() method
        That way the geometry size will be easily sized via pixels
        Size of the geometry is in units and based of FOV now size will be in pixels
        
        The idea is to connect the two worlds (THREEJS and Browser) and units to be equl to pixels
    */
    this.geometry = new THREE.PlaneGeometry(343, 560, 25, 25);
    this.material = new THREE.ShaderMaterial( {
        uniforms: {
            time: {value: 0}
        },
        fragmentShader: this.fragment(),
        vertexShader: this.vertex(),
        side: THREE.DoubleSide,
        wireframe: true,
    });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.scene.add(this.mesh);
}

Sketch.prototype.createRenderer = function() {
    this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        alpha: true,
    });
    this.renderer.setSize(this.size.width, this.size.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.render(this.scene, this.camera);
}

Sketch.prototype.resize = function() {
    let ww = window.innerWidth;

    window.addEventListener("resize", function() {
        if(ww !== window.innerWidth) {
            ww = window.innerWidth;
    
            this.size.width = window.innerWidth;
            this.size.height = window.innerHeight;
            this.renderer.setSize(this.size.width, this.size.height);
            this.camera.aspect = this.size.width / this.size.height;
            this.camera.updateProjectionMatrix();
        }
    }.bind(this));
}

Sketch.prototype.createControls = function() {
    this.controls = new OrbitControls(this.camera, this.canvas);
}

Sketch.prototype.animate = function() {
    gsap.ticker.add((time) => {
        this.lenis.raf(time * 1000);
        this.scrollPrevious = this.scrollCurrent;
        this.scrollCurrent = this.lenis.scroll;
        this.loadedImages.forEach(img => img.material.uniforms.uTime.value = time);

        if(Math.round(this.scrollPrevious) !== Math.round(this.scrollCurrent)) {
            this.updateImagesPosition();

            if(this.customPass) this.customPass.uniforms.uScrollSpeed.value = Math.abs(this.lenis.velocity * 0.01);
        }
        
        
        if(!this.composer) this.renderer.render(this.scene, this.camera);
        else this.composer.render(); // We are using the composer render because we apply scroll distorsions on the bottom part of images
    });
}

Sketch.prototype.fragment = function() {
    return `
        uniform float uTime;
        uniform sampler2D uImage;
        uniform float uHoverState;

        varying vec2 vUv;

        void main() {
            vec4 img = texture2D(uImage, vUv);

            vec2 p = vUv;
			float x = uHoverState;
			x = smoothstep(.0,1.0,(x*2.0+p.y-1.0));
			vec4 imgs = mix(
				texture2D(uImage, (p-.5)*(1.-x)+.5), 
				texture2D(uImage, (p-.5)*x+.5), 
				x);

            //gl_FragColor = img;
            gl_FragColor = imgs;
        }
    `;
}

Sketch.prototype.vertex = function() {
    return `
        //	Classic Perlin 3D Noise 
        //	by Stefan Gustavson
        //
        vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
        vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
        vec3 fade(vec3 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}
        
        float cnoise(vec3 P){
            vec3 Pi0 = floor(P); // Integer part for indexing
            vec3 Pi1 = Pi0 + vec3(1.0); // Integer part + 1
            Pi0 = mod(Pi0, 289.0);
            Pi1 = mod(Pi1, 289.0);
            vec3 Pf0 = fract(P); // Fractional part for interpolation
            vec3 Pf1 = Pf0 - vec3(1.0); // Fractional part - 1.0
            vec4 ix = vec4(Pi0.x, Pi1.x, Pi0.x, Pi1.x);
            vec4 iy = vec4(Pi0.yy, Pi1.yy);
            vec4 iz0 = Pi0.zzzz;
            vec4 iz1 = Pi1.zzzz;
            
            vec4 ixy = permute(permute(ix) + iy);
            vec4 ixy0 = permute(ixy + iz0);
            vec4 ixy1 = permute(ixy + iz1);
            
            vec4 gx0 = ixy0 / 7.0;
            vec4 gy0 = fract(floor(gx0) / 7.0) - 0.5;
            gx0 = fract(gx0);
            vec4 gz0 = vec4(0.5) - abs(gx0) - abs(gy0);
            vec4 sz0 = step(gz0, vec4(0.0));
            gx0 -= sz0 * (step(0.0, gx0) - 0.5);
            gy0 -= sz0 * (step(0.0, gy0) - 0.5);
            
            vec4 gx1 = ixy1 / 7.0;
            vec4 gy1 = fract(floor(gx1) / 7.0) - 0.5;
            gx1 = fract(gx1);
            vec4 gz1 = vec4(0.5) - abs(gx1) - abs(gy1);
            vec4 sz1 = step(gz1, vec4(0.0));
            gx1 -= sz1 * (step(0.0, gx1) - 0.5);
            gy1 -= sz1 * (step(0.0, gy1) - 0.5);
            
            vec3 g000 = vec3(gx0.x,gy0.x,gz0.x);
            vec3 g100 = vec3(gx0.y,gy0.y,gz0.y);
            vec3 g010 = vec3(gx0.z,gy0.z,gz0.z);
            vec3 g110 = vec3(gx0.w,gy0.w,gz0.w);
            vec3 g001 = vec3(gx1.x,gy1.x,gz1.x);
            vec3 g101 = vec3(gx1.y,gy1.y,gz1.y);
            vec3 g011 = vec3(gx1.z,gy1.z,gz1.z);
            vec3 g111 = vec3(gx1.w,gy1.w,gz1.w);
            
            vec4 norm0 = taylorInvSqrt(vec4(dot(g000, g000), dot(g010, g010), dot(g100, g100), dot(g110, g110)));
            g000 *= norm0.x;
            g010 *= norm0.y;
            g100 *= norm0.z;
            g110 *= norm0.w;
            vec4 norm1 = taylorInvSqrt(vec4(dot(g001, g001), dot(g011, g011), dot(g101, g101), dot(g111, g111)));
            g001 *= norm1.x;
            g011 *= norm1.y;
            g101 *= norm1.z;
            g111 *= norm1.w;
            
            float n000 = dot(g000, Pf0);
            float n100 = dot(g100, vec3(Pf1.x, Pf0.yz));
            float n010 = dot(g010, vec3(Pf0.x, Pf1.y, Pf0.z));
            float n110 = dot(g110, vec3(Pf1.xy, Pf0.z));
            float n001 = dot(g001, vec3(Pf0.xy, Pf1.z));
            float n101 = dot(g101, vec3(Pf1.x, Pf0.y, Pf1.z));
            float n011 = dot(g011, vec3(Pf0.x, Pf1.yz));
            float n111 = dot(g111, Pf1);
            
            vec3 fade_xyz = fade(Pf0);
            vec4 n_z = mix(vec4(n000, n100, n010, n110), vec4(n001, n101, n011, n111), fade_xyz.z);
            vec2 n_yz = mix(n_z.xy, n_z.zw, fade_xyz.y);
            float n_xyz = mix(n_yz.x, n_yz.y, fade_xyz.x); 
            return 2.2 * n_xyz;
        }

        varying vec2 vUv;
        
        uniform float uTime;
        uniform vec2 uHover;
        uniform float uHoverState;

        void main() {
            vec3 newPosition = position;
            float dist = distance(uv,uHover);
            vUv = uv;

            newPosition.z += uHoverState * (0.015 * sin(dist*10. + (uTime*1.1)));

            gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.); 
        }
    `;
}

Sketch.prototype.createImages = function() {
    this.imgs.forEach((img, i) => {
        const bounds = img.getBoundingClientRect();
        const geometry = new THREE.PlaneGeometry(1, 1, 25, 25);
        const texture = new THREE.TextureLoader().load(img.src);
        const material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: {value: 0},
                uImage: {value: texture},
                uHover: {value: new THREE.Vector2(0.5, 0.5)}, // vec2 value will change from mouse move
                uHoverState: {value: 0}, // Value is used to detect when is hover over image and from there to start the animation
            },
            fragmentShader: this.fragment(),
            vertexShader: this.vertex(),
            // wireframe: true,
        });
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.y = -bounds.top + (this.size.height/2) - (bounds.height / 2);
        mesh.position.x = bounds.left - (this.size.width / 2) + (bounds.width/2);
        mesh.scale.set(bounds.width, bounds.height); // Setting the size of the geometry this way will be easier to be resized afterwards

        this.scene.add(mesh);

        this.loadedImages.push({
            img: img,
            top: bounds.top,
            left: bounds.left,
            width: bounds.width,
            height: bounds.height,
            material: material,
            mesh: mesh,
        });
    });
}

Sketch.prototype.hasLoaded = function(cb) {
    // Need to check Promises
    const fontOpen = new Promise(resolve => new FontFaceObserver("Open Sans").load().then(() => resolve()));
    const fontPlayfair = new Promise(resolve => new FontFaceObserver("Playfair Display").load().then(() => resolve()));
    const preloadImages = new Promise((resolve, reject) => imagesLoaded(this.imgs, {background: true}, resolve));

    Promise.all([fontOpen, fontPlayfair, preloadImages])
    .then(() => cb())
    .catch(err => console.log(err));
}

Sketch.prototype.hideHTMLImages = function() {
    if(!this.loadedImages.length) return;
    this.loadedImages.forEach(obj => obj.img.style.opacity = 0);
}

Sketch.prototype.updateImagesPosition = function() {
    this.loadedImages.forEach(obj => {
        obj.mesh.position.y = window.scrollY -obj.top + (this.size.height/2) - (obj.height / 2);
        obj.mesh.position.x = obj.left - (this.size.width / 2) + (obj.width/2);
    });
}

Sketch.prototype.mouseMove = function() {
    window.addEventListener("mousemove", function(e) {
        this.pointer.x = ( e.clientX / this.size.width ) * 2 - 1;
        this.pointer.y = - ( e.clientY / this.size.height ) * 2 + 1;

        this.raycaster.setFromCamera( this.pointer, this.camera );

        const intersects = this.raycaster.intersectObjects( this.scene.children );

        if(intersects.length) intersects[0].object.material.uniforms.uHover.value = intersects[0].uv;
        
    }.bind(this));
}

Sketch.prototype.hoverImage = function() {
    this.loadedImages.forEach(obj => {
        obj.img.addEventListener("mouseenter", () => gsap.to(obj.material.uniforms.uHoverState, { value: 1 }));
        obj.img.addEventListener("mouseleave", () => gsap.to(obj.material.uniforms.uHoverState, { value: 0}));
    });
}

Sketch.prototype.composerPass = function() {
    this.composer = new EffectComposer(this.renderer);
      this.renderPass = new RenderPass(this.scene, this.camera);
      this.composer.addPass(this.renderPass);

      //custom shader pass
      let counter = 0.0;
      this.myEffect = {
        uniforms: {
          "tDiffuse": { value: null },
          "uScrollSpeed": {value: 0},
        },
        vertexShader: `
        varying vec2 vUv;

        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
        `,
        fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uScrollSpeed;

        varying vec2 vUv;

        void main(){
            vec2 newUv = vUv;
            float area = smoothstep(0.5, 0.,vUv.y);
            area = pow(area, 7.);
            newUv.x -= (vUv.x - 0.5) * 0.1 * (area * uScrollSpeed);
            gl_FragColor = texture2D(tDiffuse, newUv);
        }
        `
      }

      this.customPass = new ShaderPass(this.myEffect);
      this.customPass.renderToScreen = true;

      this.composer.addPass(this.customPass);
}

Sketch.prototype.initLenis = function(time) {
    this.lenis.raf(time);
    requestAnimationFrame(() => this.initLenis(time));
}

Sketch.prototype.init = function() {
    this.hasLoaded(function(){
        this.createScene();
        this.createCamera();
        this.createImages();
        this.createRenderer();
        this.createControls();
        this.resize();
        this.mouseMove();
        this.hoverImage();
        this.composerPass(); // It is used to scale bottom part of the image on scroll
        this.animate();
        this.hideHTMLImages();
    }.bind(this));
}

new Sketch().init();