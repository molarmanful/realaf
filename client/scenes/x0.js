import * as B from '@babylonjs/core'
import { GridMaterial } from '@babylonjs/materials'
import tick from './tick?worker'
import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation'
import { snapModel } from '../../common/schemas'
import VARS from '../../common/config'

export class SCENE {
  constructor(canvas, ch) {
    this.B = B
    this.canvas = canvas
    this.ch = ch
    this.SI = new SnapshotInterpolation(20)
    this.dpiScale = 1

    this.Engine()
    this.Scene()

    this.Camera()
    this.RPipe()

    // this.Glow()

    this.Light()
    this.Shadow()

    this.roomSize = 40
    this.Room()

    this.boxSize = 1
    this.Box()

    this.movSpeed = 12
    this.rotSpeed = 3
    this.jumpForce = 7
    this.airInf = .01
    this.vel = B.Vector3.Zero()
    this.rot = 0
    this.toJump = false

    this.init()
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

    this.scene = scene
  }

  Camera() {
    let camera = new B.FollowCamera('camera', new B.Vector3(0, 10, 0), this.scene)
    // camera.fov = .1
    camera.heightOffset = 10
    camera.lowerHeightOffsetLimit = 0
    camera.upperHeightOffsetLimit = 10
    camera.rotationOffset = camera.lowerRotationOffsetLimit = camera.upperRotationOffsetLimit = 180
    camera.radius = camera.lowerRadiusLimit = camera.upperRadiusLimit = 10
    // camera.attachControl(this.canvas, true)

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
    // let light = new B.HemisphericLight('light', new B.Vector3(0, 1, .5), this.scene)
    let light = new B.DirectionalLight('light', new B.Vector3(-1, -4, -2), this.scene)
    light.intensity = 1.4

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

  Box() {
    let box = this.makeBox()
    box.isPickable = false
    this.camera.lockedTarget = box

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
    b.material.diffuseColor = B.Color3.FromHSV(data.hue, 1, 1)
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
    this.ch.on('spawn', ({ id, state }) => {
      this.boxes = {}
      this.left = {}

      this.id = id
      this.boxes[id] = this.box

      this.initBoxes(state)

      this.ch.on('rawMessage', buf => {
        this.addSnap(buf)
      })

      this.listenKey()

      this.scene.registerBeforeRender(_ => {
        this.play()
        this.snapInter()
      })

      this.tickLoop(_ => {
        this.sendPos()
        this.sendRot()
      })

      this.ch.on('leave', this.kill)

      this.engine.runRenderLoop(() => {
        this.scene.render()
      })
    })
  }

  initBoxes(state) {
    for (let i in state) {
      if (!this.boxes[i] && i != this.id) {
        let b = this.makeBox(i)
        this.boxes[i] = b
      }
      this.updateBox(this.boxes[i], state[i])
    }
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

  addSnap(buf) {
    let snap = snapModel.fromBuffer(buf)
    this.SI.snapshot.add(snap)
  }

  snapInter() {
    let snap = this.SI.calcInterpolation('hue(deg) x y z rot(rad)')
    if (snap) {
      for (let s of snap.state) {
        let { id, hue, x, y, z, rot } = s
        if (!this.left[id] && id != this.id) {
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
    }
  }

  tickLoop(f, t = VARS.cTicks) {
    let loop = new tick()
    loop.postMessage(t)
    loop.addEventListener('message', f)
  }

  play() {
    let dt = this.scene.deltaTime * .001
    this.grounded = this.checkGrounded()
    let g = this.grounded
    this.vel.y -= 9.81 * dt

    this.act(dt)

    if (this.toJump) {
      this.toJump = false
    }
    this.box.moveWithCollisions(this.box.getDirection(B.Vector3.Forward()).scale(this.vel.z * dt))
    this.box.moveWithCollisions(new B.Vector3(0, this.vel.y * dt, 0))
    this.box.rotation.y += this.rot * dt

    this.rot = 0
  }

  sendPos() {
    this.ch.emit('pos', this.box.position.asArray())
  }

  sendRot() {
    this.ch.emit('rot', this.box.rotation.y)
  }

  act(dt) {
    if (this.grounded) this.vel.z = 0

    let map = {
      Space(t) {
        if (t.grounded) t.vel.y = t.jumpForce
      },
      KeyW(t) {
        if (t.grounded) t.vel.z = t.movSpeed
        else t.vel.z = Math.min(t.movSpeed, t.vel.z + t.movSpeed * t.airInf)
      },
      KeyA(t) {
        t.rot -= t.rotSpeed
      },
      KeyS(t) {
        if (t.grounded) t.vel.z = -t.movSpeed
        else t.vel.z = Math.max(-t.movSpeed, t.vel.z - t.movSpeed * t.airInf)
      },
      KeyD(t) {
        t.rot += t.rotSpeed
      },
    }

    for (let k in map) {
      if (this.down[k]) map[k](this)
    }
  }

  kill(id) {
    this.boxes[id].dispose()
    delete this.boxes[id]
    this.left[id] = true
    setTimeout(_ => delete this.left[id], 3 / VARS.cTicks)
  }
}