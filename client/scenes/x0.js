import * as B from '@babylonjs/core'
import { GridMaterial } from '@babylonjs/materials'
import '@babylonjs/loaders'
import tick from './tick?worker'
import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation'
import { snapModel } from '../../common/schemas'
import VARS from '../../common/config'
import sandbox from './assets/sandbox.glb'
import dusk from './assets/dusk.env'
import clouds from './assets/clouds.env'

export class SCENE {
  static async build(canvas, ch) {
    let S = new SCENE()

    S.B = B
    S.canvas = canvas
    S.ch = ch
    S.SI = new SnapshotInterpolation(20)
    S.dpiScale = 1

    S.movSpeed = 2
    S.jumpForce = 7
    S.airInf = .01
    S.vel = B.Vector3.Zero()
    S.grounded = false
    S.fast = true
    S.boxSize = 1

    S.boxes = {}
    S.killQ = {}

    S.pads = {
      0: 31,
    }

    S.Engine()
    S.Scene()
    S.Sky()

    S.Camera()
    S.RPipe()

    S.Glow()

    S.Light()
    S.Shadow()

    // S.roomSize = 40
    // S.Room()

    await S.Sandbox()
    S.Box()

    S.init()

    return S
  }

  Engine() {
    let engine = new B.Engine(this.canvas, true)
    engine.setHardwareScalingLevel(devicePixelRatio / this.dpiScale)

    addEventListener('resize', _ => {
      engine.resize()
    })

    this.engine = engine
  }

  Scene() {
    let scene = new B.Scene(this.engine)
    scene.clearColor = B.Color3.Black().toLinearSpace()
    scene.collisionsEnabled = true
    scene.environmentTexture = new B.CubeTexture(dusk, scene)

    this.scene = scene
  }

  Sky() {
    let sky = B.MeshBuilder.CreateBox('sky', { size: 1000 }, this.scene)

    let mat = new B.StandardMaterial('', this.scene)
    mat.backFaceCulling = false
    // mat.reflectionTexture = this.scene.environmentTexture.clone()
    mat.reflectionTexture = new B.CubeTexture(clouds, this.scene)
    mat.reflectionTexture.coordinatesMode = B.Texture.SKYBOX_MODE
    mat.diffuseColor = mat.specularColor = B.Color3.Black()
    sky.material = mat

    this.sky = sky
  }

  Camera() {
    let camera = new B.UniversalCamera('camera', B.Vector3.Zero(), this.scene)
    camera.fov = 1.6
    camera.minZ = .01
    camera.speed = .2
    camera.inputs.clear()
    camera.inputs.addMouse()
    camera.attachControl(this.canvas)

    this.camera = camera
  }

  RPipe() {
    let pipe = new B.DefaultRenderingPipeline('pipe', true, this.scene, [this.camera])
    pipe.samples = 4
    pipe.chromaticAberrationEnabled = true
    pipe.chromaticAberration.aberrationAmount = 6
    pipe.grainEnabled = true
    pipe.grain.animated = true

    this.pipe = pipe
  }

  Glow() {
    let gl = new B.GlowLayer('glow', this.scene, {
      mainTextureSamples: 4,
    })

    this.gl = gl
  }

  Light() {
    // let hlight = new B.HemisphericLight('hlight', new B.Vector3(1, 4, 2), this.scene)
    // hlight.intensity = .1

    let light = new B.DirectionalLight('light', new B.Vector3(4, -2, -1), this.scene)
    light.intensity = 1.4
    light.diffuse = new B.Color3(1, .8, .9)

    // this.hlight = hlight
    this.light = light
  }

  Shadow() {
    let shadow = new B.CascadedShadowGenerator(2048, this.light)
    shadow.usePercentageCloserFiltering = true
    // shadow.stabilizeCascades = true
    shadow.lambda = 1
    shadow.cascadeBlendPercentage = 0
    shadow.shadowMaxZ = this.camera.maxZ
    shadow.depthClamp = false
    shadow.autoCalcDepthBounds = true

    this.shadow = shadow
  }

  enableShadows(m) {
    this.shadow.getShadowMap().renderList.push(m)
    m.receiveShadows = true
  }

  Room() {
    let room = B.MeshBuilder.CreateBox('room', { size: this.roomSize, sideOrientation: B.Mesh.BACKSIDE }, this.scene)
    room.position.y = this.roomSize / 2
    this.enableShadows(room)
    room.checkCollisions = true

    room.material = new GridMaterial('', this.scene)

    this.room = room
  }

  async Sandbox() {
    let sb = await B.SceneLoader.ImportMeshAsync('', sandbox, void 0, this.scene)
    for (let mesh of sb.meshes) {
      if (mesh.name == 'ref') {
        mesh.dispose()
        continue
      }

      mesh.checkCollisions = true

      if (mesh.name == 'walls') {
        mesh.visibility = .69
        mesh.material = mesh.material.clone()
        mesh.material.albedoColor = new B.Color3(.8, .4, 1)
        continue
      }

      this.enableShadows(mesh)

      if (mesh.name.startsWith('pad')) {
        mesh.material = mesh.material.clone()
        mesh.material.emissiveColor = B.Color3.FromHSV(180, .2, .2)
      }
    }

    this.sb = sb
  }

  Box() {
    let box = this.makeBox()
    box.isPickable = false

    this.box = box
  }

  makeBox(name = 'box') {
    let b = B.MeshBuilder.CreateBox(name, { size: this.boxSize }, this.scene)
    this.enableShadows(b)
    b.position = B.Vector3.Zero()
    b.ellipsoid = B.Vector3.One().scale(this.boxSize / 2)
    b.checkCollisions = true
    b.material = new B.StandardMaterial('', this.scene)

    return b
  }

  updateBox(b, data) {
    b.material.diffuseColor = B.Color3.FromHSV(data.hue, .2 * (1 + !!this.fast), 1)
    b.position = new B.Vector3(...data.pos)
    b.rotation.y = data.rot
  }

  checkGrounded() {
    let ray = new B.Ray(this.box.position, B.Vector3.Down(), this.boxSize / 2 + .01)
    return this.scene.pickWithRay(ray).hit
  }

  checkCeiled() {
    let ray = new B.Ray(this.box.position, B.Vector3.Up(), this.boxSize / 2 + .01)
    return this.scene.pickWithRay(ray).hit
  }

  init() {
    this.ch.on('spawn', ({ id, data }) => {
      this.id = id
      this.updateBox(this.box, data)
      this.boxes[id] = this.box

      this.ch.on('rawMessage', buf => {
        this.addSnap(buf)
      })

      this.listenKey()

      this.box.onCollideObservable.add((m, e) => {
        this.bounce(m)
      })

      this.scene.registerBeforeRender(_ => {
        this.engine.enterPointerlock()
        this.scene.onPointerDown = _ => {
          if (!this.engine.isPointerLock) this.engine.enterPointerlock()
        }

        let dt = this.scene.deltaTime * .001
        this.play(dt)
        this.snapInter()
      })

      this.tickLoop(_ => {
        this.send()
      })

      this.ch.on('leave', id => {
        this.killQ[id] = true
      })

      this.engine.runRenderLoop(() => {
        this.scene.render()
      })
    })
  }

  listenKey() {
    let down = {}
    addEventListener('keydown', e => {
      down[e.code] = true
    })
    addEventListener('keyup', e => {
      if (e.code == 'ShiftLeft') this.fast = !this.fast
      delete down[e.code]
    })

    this.down = down
  }

  bounce(m) {
    if ((m.name + '').startsWith('pad')) {
      this.vel.y = this.pads[m.name.slice(3)]
      return
    }

    if (!this.grounded && this.down.Space) {
      let norm = this.box.collider.slidePlaneNormal.normalize()
      if (norm.y < .99) {
        norm.rotateByQuaternionToRef(
          B.Quaternion.FromEulerAngles(...this.box.rotation.scale(-1).asArray()),
          norm
        )
        B.Vector3.ReflectToRef(this.vel, norm, this.vel)
      }
    }
  }

  addSnap(buf) {
    let snap = snapModel.fromBuffer(buf)
    this.SI.snapshot.add(snap)
  }

  snapInter(first = false) {
    let snap = first
      ? this.SI.vault.get()
      : this.SI.calcInterpolation('hue(deg) x y z rot(rad)')

    if (!snap) return
    for (let s of snap.state) {
      let { id, hue, x, y, z, rot } = s
      if (!(first || id != this.id)) continue
      if (this.killQ[id]) {
        this.kill(id)
        continue
      }
      if (!this.boxes[id]) {
        this.boxes[id] = this.makeBox(id)
      }

      this.updateBox(this.boxes[id], {
        hue,
        pos: [x, y, z],
        rot,
      })
    }
  }

  tickLoop(f, t = VARS.cTicks) {
    let loop = new tick()
    loop.postMessage(t)
    loop.addEventListener('message', f)
  }

  play(dt) {
    this.grounded = this.checkGrounded()
    this.vel.y -= 9.81 * dt

    this.act()

    this.box.moveWithCollisions(
      this.box
        .getDirection(new B.Vector3(this.vel.x, 0, this.vel.z))
        .scale(Math.max(Math.abs(this.vel.x), Math.abs(this.vel.z)) * dt)
    )
    this.box.moveWithCollisions(new B.Vector3(0, this.vel.y * dt, 0))

    this.camera.position = this.box.position
    this.box.rotation.y = this.camera.rotation.y
  }

  send() {
    this.ch.emit('data', {
      hue: this.box.material.diffuseColor.toHSV().r,
      pos: this.box.position.asArray(),
      rot: this.box.rotation.y,
    })
  }

  act() {
    if (this.grounded) {
      this.vel.x = 0
      this.vel.z = 0
    }

    let map = {
      Space: _ => {
        if (this.grounded) this.vel.y = this.jumpForce
      },
      KeyS: _ => {
        if (this.grounded) this.vel.z = -this.movSpeed
        else this.vel.z = Math.max(-this.movSpeed, this.vel.z - this.movSpeed * this.airInf)
      },
      KeyW: _ => {
        let mov = this.movSpeed * (1 + !!this.fast)
        if (this.grounded) this.vel.z = mov
        else this.vel.z = Math.min(Math.max(mov, this.vel.z), this.vel.z + mov * this.airInf)
      },
      KeyA: _ => {
        if (this.grounded) this.vel.x = -this.movSpeed
        else this.vel.x = Math.max(-this.movSpeed, this.vel.x - this.movSpeed * this.airInf)
      },
      KeyD: _ => {
        if (this.grounded) this.vel.x = this.movSpeed
        else this.vel.x = Math.min(this.movSpeed, this.vel.x + this.movSpeed * this.airInf)
      },
    }

    for (let k in map) {
      if (this.down[k]) map[k]()
    }
  }

  kill(id) {
    if (this.boxes[id]) {
      this.boxes[id].dispose()
      delete this.boxes[id]
      setTimeout(_ => {
        delete this.killQ[id]
      }, VARS.cTicks * 3)
    }
  }
}