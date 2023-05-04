import * as B from '@babylonjs/core'
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
    S.fast = false
    S.boxSize = 1
    S.skyRot = Math.PI / 6
    S.sbPos = B.Vector3.Zero()

    S.boxes = {}
    S.killQ = {}

    S.pads = {
      0: 31,
      1: 31,
      2: 22,
    }

    S.Engine()
    S.Scene()
    S.Sky()

    S.Camera()
    // S.SSRPost()
    S.Post()

    S.Glow()

    S.Light()
    S.CShadow()

    // S.roomSize = 40
    // S.Room()

    await S.Sandbox()
    S.Box()

    return S
  }

  Engine() {
    let engine = new B.Engine(this.canvas, true, {}, true)
    // engine.setHardwareScalingLevel(devicePixelRatio / this.dpiScale)

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
    scene.environmentTexture.rotationY = this.skyRot
    scene.environmentIntensity = .69
    scene.skipPointerMovePicking = true

    this.scene = scene
  }

  Sky() {
    // let sky = B.MeshBuilder.CreateBox('sky', { size: 1000, sideOrientation: B.Mesh.BACKSIDE }, this.scene)

    // let mat = new B.StandardMaterial('', this.scene)
    // mat.diffuseColor = mat.specularColor = B.Color3.Black()
    // let tx = mat.reflectionTexture = this.scene.environmentTexture.clone()
    let tx = /* mat.reflectionTexture = */ new B.CubeTexture(clouds, this.scene)
    tx.coordinatesMode = B.Texture.SKYBOX_MODE
    // tx.boundingBoxSize = B.Vector3.One().scale(1e4)
    tx.rotationY = this.skyRot
    // sky.material = mat

    this.skyTx = tx
    // this.sky = sky
  }

  Camera() {
    let camera = new B.UniversalCamera('camera', B.Vector3.Zero(), this.scene)
    camera.fov = 1.6
    camera.minZ = .01
    camera.speed = .1
    camera.inputs.clear()
    camera.inputs.addMouse()
    camera.attachControl(this.canvas)

    this.camera = camera
  }

  Post() {
    let pipe = new B.DefaultRenderingPipeline('pipe', true, this.scene, [this.camera])
    pipe.samples = 4
    pipe.chromaticAberrationEnabled = true
    pipe.chromaticAberration.aberrationAmount = 6
    pipe.grainEnabled = true
    pipe.grain.animated = true
    pipe.grain.intensity = 10
  }

  SSRPost() {
    let pipe = new B.SSRRenderingPipeline('ssr', this.scene, [this.camera])
    pipe.samples = 4
    pipe.enableAutomaticThicknessComputation = true
    pipe.thickness = 0
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

    let light = new B.DirectionalLight('light', B.Vector3.Zero(), this.scene)
    this.rotDir(light)
    light.falloffType = B.DirectionalLight.FALLOFF_PHYSICAL
    light.intensity = 1.4
    light.diffuse = B.Color3.FromHSV(10, 1, 1)

    // this.hlight = hlight
    this.light = light
  }

  rotDir(l) {
    let d = new B.Vector3(1, -.5, 0)
      .applyRotationQuaternion(B.Quaternion.FromEulerAngles(0, -this.skyRot, 0))
    l.direction = d
  }

  CShadow() {
    let sg = new B.CascadedShadowGenerator(2048, this.light)
    sg.usePercentageCloserFiltering = true
    // shadow.stabilizeCascades = true
    sg.lambda = 1
    sg.cascadeBlendPercentage = 0
    sg.shadowMaxZ = this.camera.maxZ
    sg.depthClamp = false
    sg.autoCalcDepthBounds = true
    sg.penumbraDarkness = .2

    this.sg = sg
  }

  enableShadows(m) {
    this.sg.getShadowMap().renderList.push(m)
    m.receiveShadows = true
  }

  async Sandbox() {
    let sb = await B.SceneLoader.ImportMeshAsync('', sandbox, void 0, this.scene)

    for (let mesh of sb.meshes) {
      if (mesh.name == 'ref') {
        mesh.dispose()
        continue
      }

      mesh.checkCollisions = !mesh.name.includes('nocoll')
      mesh.freezeWorldMatrix()

      if (mesh.name.includes('walls')) {
        mesh.receiveShadows = true
      }
      else this.enableShadows(mesh)

      if (mesh.name.startsWith('fan')) {
        mesh.unfreezeWorldMatrix()
        this.scene.onBeforeRenderObservable.add(_ => {
          mesh.rotate(B.Vector3.Forward(), .5)
        })
      }

      let test = B.MeshBuilder.CreateBox('', { size: 100 }, this.scene)
      test.position = new B.Vector3(0, 50, -300)
      test.rotation = new B.Vector3(Math.PI / 3, Math.PI / 4)

      if (mesh.material) {
        let mat = mesh.material
        mat.metallic = 0
        mat.roughness = .5

        if (mesh.name.startsWith('pad')) {
          let m = mesh.material = mat.clone()
          m.roughness = 0
          m.emissiveColor = B.Color3.FromHSV(180, .2, .2)

          continue
        }

        if (mesh.name.includes('glass')) {
          let m = mesh.material = mat.clone()
          m.roughness = 0
          m.subSurface.isRefractionEnabled = true
          m.subSurface.indexOfRefraction = 1.5
          m.subSurface.tintColor = B.Color3.FromHSV(350, .1, 1)
          m.subSurface.refractionTexture = this.skyTx

          m.freeze()
          continue
        }

        if (mesh.name == 'cockpit') {
          let m = mesh.material = mat.clone()
          m.albedoColor = B.Color3.FromHSV(0, .5, 1)

          m.freeze()
          continue
        }

        mat.freeze()
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
    let b
    if (this.box) {
      b = this.box.clone(name)
      b.material = this.box.material.clone()
    }
    else {
      b = B.MeshBuilder.CreateBox(name, { size: this.boxSize }, this.scene)
      this.enableShadows(b)
      b.position = B.Vector3.Zero()
      b.ellipsoid = B.Vector3.One().scale(this.boxSize / 2)
      b.checkCollisions = true

      b.material = new B.PBRMaterial('', this.scene)
      b.material.metallic = 0
      b.material.roughness = .2
    }

    return b
  }

  updateBox(b, data) {
    b.material.albedoColor = B.Color3.FromHSV(data.hue, .2, 1)
    b.position = new B.Vector3(...data.pos)
    b.rotation.y = data.rot
  }

  checkGrounded() {
    let ray = new B.Ray(this.box.position, B.Vector3.Down(), this.boxSize / 2 + .01)
    let pick = this.scene.pickWithRay(ray)
    return pick.pickedMesh?.name
  }

  init() {
    this.ch.emit('hello')
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

      this.scene.onBeforeRenderObservable.add(_ => {
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
      delete down[e.code]
    })

    this.down = down
  }

  bounce(m) {
    if ((m.name + '').startsWith('pad')) {
      this.vel = new B.Vector3(0, this.pads[m.name.slice(3)], 0)
      return
    }

    if (this.grounded) return
    if (!this.down.Space) return

    let norm = this.box.collider.slidePlaneNormal.normalize()
    if (norm.y > .99) return
    norm.rotateByQuaternionToRef(
      B.Quaternion.FromEulerAngles(...this.box.rotation.scale(-1).asArray()),
      norm
    )
    B.Vector3.ReflectToRef(this.vel, norm, this.vel)
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
    let gr = this.grounded = this.checkGrounded()
    this.vel.y = gr && this.vel.y < 0 ? -1 : this.vel.y - 9.81 * dt

    this.act(dt)

    if (gr == 'cockpit') {
      this.skyTx.boundingBoxPosition = this.sbPos
      this.skyTx.rotationY = this.skyRot
      this.rotDir(this.light)
    }
    else {
      this.box.moveWithCollisions(
        this.box
          .getDirection(new B.Vector3(this.vel.x, 0, this.vel.z))
          .scale(Math.max(Math.abs(this.vel.x), Math.abs(this.vel.z)) * dt)
      )
    }

    this.box.moveWithCollisions(new B.Vector3(0, this.vel.y * dt, 0))

    this.camera.position = this.box.position.add(new B.Vector3(0, .4, 0))
    this.box.rotation.y = this.camera.rotation.y
  }

  send() {
    this.ch.emit('data', {
      hue: this.box.material.albedoColor.toHSV().r,
      pos: this.box.position.asArray(),
      rot: this.box.rotation.y,
    })
  }

  act(dt) {
    this.fast = false
    if (this.grounded == 'cockpit') this.vel.y = 0
    if (this.grounded) {
      this.vel.x = 0
      this.vel.z = 0
    }

    let map = {
      Space: _ => {
        if (!this.grounded) return
        this.vel.y = this.jumpForce
      },
      ShiftLeft: _ => {
        if (this.grounded == 'cockpit') return
        this.fast = true
      },
      KeyS: _ => {
        if (this.grounded == 'cockpit') return
        if (this.grounded) {
          this.vel.z = -this.movSpeed
          return
        }
        this.vel.z = Math.max(-this.movSpeed, this.vel.z - this.movSpeed * this.airInf)
      },
      KeyW: _ => {
        if (this.grounded == 'cockpit') {
          // this.sbPos.addInPlace(this.camera.getForwardRay(VARS.sbSpeed * dt).direction.scale(-1))
          return
        }
        let mov = this.movSpeed * (1 + !!this.fast)
        if (this.grounded) {
          this.vel.z = mov
          return
        }
        this.vel.z = Math.min(Math.max(mov, this.vel.z), this.vel.z + mov * this.airInf)
      },
      KeyA: _ => {
        if (this.grounded == 'cockpit') {
          this.skyRot -= VARS.sbTurn * dt
          return
        }
        if (this.grounded) {
          this.vel.x = -this.movSpeed
          return
        }
        this.vel.x = Math.max(-this.movSpeed, this.vel.x - this.movSpeed * this.airInf)
      },
      KeyD: _ => {
        if (this.grounded == 'cockpit') {
          this.skyRot += VARS.sbTurn * dt
          return
        }
        if (this.grounded) {
          this.vel.x = this.movSpeed
          return
        }
        this.vel.x = Math.min(this.movSpeed, this.vel.x + this.movSpeed * this.airInf)
      },
    }

    for (let k in map) {
      if (this.down[k]) map[k]()
    }
  }

  kill(id) {
    if (this.boxes[id]) {
      this.boxes[id].visibility = 0
      this.boxes[id].dispose()
      delete this.boxes[id]
      setTimeout(_ => {
        delete this.killQ[id]
      }, VARS.cTicks * 3)
    }
  }
}