import { Component, OnInit } from '@angular/core';
import * as THREE from "three";
import * as CANNON from "cannon";

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {
  camera: any;
  scene: any;
  renderer: any;
  boxHeight = 1;
  boxSize = 3;
  stack: any[];
  overhangs: any[];
  gameStarted = false;
  gameOver = false;
  highScore: string;
  onGoing: boolean;

  constructor() { }

  //cannon stuff
  world: any;

  startGame() {
    this.stack = [];
    this.overhangs = [];
    this.gameStarted = true;
    this.gameOver = false;
    this.onGoing = true;
    this.renderer.setAnimationLoop(() => this.animation());

    if (this.world) {
      // Remove every object from world
      while (this.world.bodies.length > 0) {
        this.world.remove(this.world.bodies[0]);
      }
    }

    if (this.scene) {
      // Remove every Mesh from the scene
      while (this.scene.children.find((c) => c.type == "Mesh")) {
        const mesh = this.scene.children.find((c) => c.type == "Mesh");
        this.scene.remove(mesh);
      }

      // Foundation
      this.addLayer(0, 0, this.boxSize, this.boxSize);

      // First layer
      this.addLayer(-10, 0, this.boxSize, this.boxSize, "x");
    }

    if (this.camera) {
      // Reset camera positions
      this.camera.position.set(4, 4, 4);
      this.camera.lookAt(0, 0, 0);
    }
  }
  setup() {
    if (localStorage.getItem('high-score') == null) {
      localStorage.setItem('high-score', "0");
    }
    this.stack = [];
    this.overhangs = [];

    //physics stuff
    this.world = new CANNON.World();
    this.world.gravity.set(0, -50, 0);; //pulls things down on axis Y
    this.world.broadphase = new CANNON.NaiveBroadphase();
    this.world.solver.iterations = 40;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9eafb8);

    this.addLayer(0, 0, this.boxSize, this.boxSize);
    this.addLayer(-10, 0, this.boxSize, this.boxSize, "x");

    //adding lights
    //ambiente will hit everything, the directional only from one position
    //obs.: there is, also, the point ligh, which simulates a light bulb
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); //color n intensity
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6); //color n intensity
    dirLight.position.set(10, 20, 0); // x, y, z //from 10,20,0 to 0,0,0
    this.scene.add(dirLight);

    //adding a camera
    // Perspective camera
    // const aspect = window.innerWidth / window.innerHeight;
    // this.camera = new THREE.PerspectiveCamera(
    //   45, // field of view in degrees
    //   aspect, // aspect ratio
    //   1, // near plane
    //   100 // far plane
    // ); //the last 2 parameters: things that are to close or too far will be ignored

    //ortographic camera
    const width = 10;
    const height = width * (window.innerHeight / window.innerWidth);
    this.camera = new THREE.OrthographicCamera(
      width / -2,
      width / 2,
      height / 2,
      height / -2,
    )

    this.camera.position.set(4, 4, 4);
    this.camera.lookAt(0, 0, 0);
    this.camera.zoom = 0.5;
    this.camera.updateProjectionMatrix();

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.render(this.scene, this.camera);

    // Add it to HTML
    document.body.appendChild(this.renderer.domElement);
  }
  createBox(x, y, z, width, depth, falls, fromOverhang?): any {
    //adding a object
    const geometry = new THREE.BoxGeometry(width, this.boxHeight, depth); //w, h, d
    let color;
    if (fromOverhang) {
      color = this.stack[this.stack.length - 1].threejs.material.color;
    }
    else {
      color = (this.stack.length % 2 == 0) ? 0xfb8e00 : 0xdb5400;
    }
    const material = new THREE.MeshLambertMaterial({ color: color });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    this.scene.add(mesh);

    //cannonjs
    const shape = new CANNON.Box(
      new CANNON.Vec3(width / 2, this.boxHeight / 2, depth / 2)
    )
    let mass = falls ? 5 : 0;
    const body = new CANNON.Body({ mass, shape });
    body.position.set(x, y, z);
    console.log(body)
    this.world.addBody(body);

    return {
      threejs: mesh,
      cannonjs: body,
      width,
      depth
    };
  }
  addLayer(x, z, width, depth, direction?) {
    const y = this.boxHeight * this.stack.length;
    const layer = this.createBox(x, y, z, width, depth, false);
    layer.direction = direction;

    this.stack.push(layer);
  }
  addOverhang(x, z, width, depth) {
    const y = this.boxHeight * ((this.stack.length - 1));
    const overhang = this.createBox(x, y, z, width, depth, true, true);
    this.overhangs.push(overhang);
  }
  updatePhysics() {
    this.world.step(1 / 60);

    this.overhangs.forEach((el) => {
      el.threejs.position.copy(el.cannonjs.position);
      el.threejs.quaternion.copy(el.cannonjs.quaternion);
    })
  }
  endGame() {
    this.gameOver = true;
    this.gameStarted = false;
    this.onGoing = false;
    this.renderer.setAnimationLoop();
    this.highScore = Math.max(this.stack.length - 1, parseInt(localStorage.getItem('high-score'))).toString();
    localStorage.setItem('high-score', this.highScore.toString());
  }
  animation() {
    const speed = 0.15;
    const topLayer = this.stack[this.stack.length - 1];
    const previousLayer = this.stack[this.stack.length - 2];
    const previousSize = (topLayer.direction == "x") ? previousLayer.threejs.geometry.parameters.width : previousLayer.threejs.geometry.parameters.depth;
    const maxPos = previousLayer.threejs.position[topLayer.direction] + previousSize;
    console.log(speed)
    topLayer.threejs.position[topLayer.direction] += speed;
    topLayer.cannonjs.position[topLayer.direction] += speed;
    if (topLayer.threejs.position[topLayer.direction] > (maxPos + 1)) {
      this.endGame();
    };
    //4 is the initial camera height
    if (this.camera.position.y < this.boxHeight * (this.stack.length - 2) + 4) {
      this.camera.position.y += speed;
    }
    this.updatePhysics();
    this.renderer.render(this.scene, this.camera);
  }
  ngOnInit(): void {
    this.gameOver = false;
    this.onGoing = true;
    window.addEventListener("click", () => {
      if(!this.onGoing) {
        return;
      }
      else if (!this.gameStarted) {
        this.renderer.setAnimationLoop(() => this.animation());
        this.gameStarted = (this.gameOver) ? false : true;
      }
      else {
        const topLayer = this.stack[this.stack.length - 1];
        const previousLayer = this.stack[this.stack.length - 2];
        const direction = topLayer.direction;

        const delta = topLayer.threejs.position[direction] - previousLayer.threejs.position[direction];
        const overhangSize = Math.abs(delta);
        const size = (direction == "x") ? topLayer.width : topLayer.depth;
        const overlap = size - overhangSize;

        if (overlap > 0) {
          //cut the layer
          const newWidth = (direction == "x") ? overlap : topLayer.width;
          const newDepth = (direction == "z") ? overlap : topLayer.depth;
          //update data
          topLayer.width = newWidth;
          topLayer.depth = newDepth;

          //update 3JS module
          topLayer.threejs.scale[direction] = overlap / size;
          topLayer.threejs.position[direction] -= delta / 2;
          topLayer.cannonjs.position[direction] -= delta / 2;

          //calculate the overhang part
          const overhangShit = (overlap / 2 + overhangSize / 2) * Math.sign(delta);
          const overhangX = (direction == "x")
            ? topLayer.threejs.position.x + overhangShit
            : topLayer.threejs.position.x;
          const overhangZ = (direction == "z")
            ? topLayer.threejs.position.z + overhangShit
            : topLayer.threejs.position.z;
          const overhangWidth = (direction == "x") ? overhangSize : newWidth;
          const overhangDepth = (direction == "z") ? overhangSize : newDepth;
          this.addOverhang(overhangX, overhangZ, overhangWidth, overhangDepth);

          //next layer
          const nextX = (direction == "x") ? topLayer.threejs.position.x : -10;
          const nextZ = (direction == "z") ? topLayer.threejs.position.z : -10;
          const nextDirection = (direction == "x") ? "z" : "x";

          this.addLayer(nextX, nextZ, newWidth, newDepth, nextDirection);

        }
        else {
          this.endGame();
        }

      }
    })
    this.setup();
  }
  restart(e: Event) {
    e.stopPropagation();
    e.preventDefault();
    this.startGame();
  }

}
