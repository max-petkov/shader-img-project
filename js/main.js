import * as THREE from "https://unpkg.com/three@0.158.0/build/three.module.min.js";


function Sketch() {
    this.canvas = document.getElementById("container").firstElementChild;
    this.scene = null;
    this.camera = null;
    this.geometry = null;
    this.material = null;
    this.renderer = null;
    this.mesh = null;
    this.size = {
        width: window.innerWidth,
        height: window.innerHeight
    }
}

Sketch.prototype.createScene = function() {
    this.scene = new THREE.Scene();
}

Sketch.prototype.createCamera = function() {
    this.camera = new THREE.PerspectiveCamera(70, this.size.width / this.size.height);
    this.camera.position.z = 1;
}

Sketch.prototype.createModel = function() {
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.MeshBasicMaterial( {
        color: 0xffff00, 
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
    });
    this.renderer.setSize(this.size.width, this.size.height);
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

Sketch.prototype.init = function() {
    this.createScene();
    this.createCamera();
    this.createModel();
    this.createRenderer();
    this.resize();
}

new Sketch().init();