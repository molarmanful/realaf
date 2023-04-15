import * as B from '@babylonjs/core'
import { GridMaterial } from '@babylonjs/materials'
// import Ammo from 'ammojs-typed'
import tick from './tick?worker'
import { SnapshotInterpolation } from '@geckos.io/snapshot-interpolation'
import { snapModel } from '../../common/schemas'

export let createScene = async (canvas, ch, cb = _ => { }) => {
  let SI = new SnapshotInterpolation(20)

  // ENGINE + SCENE

  let dpiScale = 4
  let engine = new B.Engine(canvas, true)
  engine.setHardwareScalingLevel(devicePixelRatio / dpiScale)
  let scene = new B.Scene(engine)
  scene.clearColor = B.Color3.Black().toLinearSpace()
  scene.collisionsEnabled = true

  // CAMERA

  let camera = new B.FollowCamera('camera', new B.Vector3(0, 10, 0), scene)
  // camera.fov = .1
  camera.heightOffset = 10
  camera.lowerHeightOffsetLimit = 0
  camera.upperHeightOffsetLimit = 10
  camera.rotationOffset = camera.lowerRotationOffsetLimit = camera.upperRotationOffsetLimit = 180
  camera.radius = camera.lowerRadiusLimit = camera.upperRadiusLimit = 10
  // camera.attachControl(canvas, true)

  // POST-PROCESS

  let pipe = new B.DefaultRenderingPipeline('pipe', true, scene, [camera])
  pipe.samples = 4
  pipe.chromaticAberrationEnabled = true
  pipe.chromaticAberration.aberrationAmount = 6
  pipe.grainEnabled = true
  pipe.grain.animated = true

  // LIGHT + SHADOW

  // let light = new B.HemisphericLight('light', new B.Vector3(0, 1, .5), scene)
  let light = new B.DirectionalLight('light', new B.Vector3(-1, -4, -2), scene)
  light.intensity = 1.4
  let shadow = new B.CascadedShadowGenerator(2048, light)
  shadow.usePercentageCloserFiltering = true
  // shadow.stabilizeCascades = true
  shadow.lambda = 1
  shadow.cascadeBlendPercentage = 0
  shadow.shadowMaxZ = camera.maxZ
  shadow.depthClamp = false
  shadow.autoCalcDepthBounds = true

  // let gl = new B.GlowLayer('glow', scene, {
  //   mainTextureSamples: 4,
  // })

  // ROOM

  let roomSize = 40
  let room = B.MeshBuilder.CreateBox('room', { size: roomSize, sideOrientation: B.Mesh.BACKSIDE }, scene)
  room.position.y = roomSize / 2
  shadow.getShadowMap().renderList.push(room)
  room.receiveShadows = true
  room.checkCollisions = true

  room.material = new GridMaterial('', scene)

  // PLAYER

  let makeBox = (name = 'box') => {
    let b = B.MeshBuilder.CreateBox(name, { size: 1 }, scene)
    shadow.getShadowMap().renderList.push(b)
    b.receiveShadows = true
    b.material = new B.StandardMaterial('', scene)
    return b
  }

  let updateBox = (b, data) => {
    b.material.diffuseColor = B.Color3.FromHSV(data.hue, 1, 1)
    b.position = new B.Vector3(...data.pos)
    b.rotationQuaternion = new B.Quaternion(...data.rot)
    b.checkCollisions = true
  }

  let box = makeBox()

  camera.lockedTarget = box

  let sendPos = _ => ch.emit('pos', box.position.asArray())
  let sendRot = _ => ch.emit('rot', box.rotationQuaternion.asArray())

  // FIXED TICKS (e.g. PHYSICS)

  let loop = new tick()
  loop.postMessage(60)
  loop.addEventListener('message', now => {
    box.moveWithCollisions(new B.Vector3(0, -9.81 / 60, 0))
    sendPos()
  })

  // MULTIPLAYER

  let boxes = {}
  let left = {}
  boxes[ch.id] = box
  ch.on('spawn', state => {
    for (let i in state) {
      if (!boxes[i] && i != ch.id) {
        let b = makeBox(i)
        boxes[i] = b
      }
      updateBox(boxes[i], state[i])
    }

    ch.on('rawMessage', buf => {
      let snap = snapModel.fromBuffer(buf)
      for (let i in snap.state) {
        let { qx: x, qy: y, qz: z, qw: w } = snap.state[i]
        snap.state[i].q = { x, y, z, w }
      }
      SI.snapshot.add(snap)
    })

    scene.registerBeforeRender(_ => {
      let snap = SI.calcInterpolation('hue x y z q(quat)')
      if (snap) {
        for (let s of snap.state) {
          let { id, hue, x, y, z, q } = s
          if (!left[id] && id != ch.id) {
            if (!boxes[id]) {
              boxes[id] = makeBox(id)
            }
            updateBox(boxes[id], {
              hue,
              pos: [x, y, z],
              rot: [q.x, q.y, q.z, q.w]
            })
          }
        }
      }
    })

    ch.on('leave', id => {
      boxes[id].dispose()
      delete boxes[id]
      left[id] = true
    })

    engine.runRenderLoop(() => {
      scene.render()
    })
  })

  // INPUTS -> ACTIONS

  let down = {}
  addEventListener('keydown', e => {
    down[e.code] = true
  })
  addEventListener('keyup', e => {
    delete down[e.code]
  })

  let movSpeed = .1
  let rotSpeed = .02
  scene.registerBeforeRender(_ => {
    let map = {
      KeyW() {
        // box.locallyTranslate(B.Vector3.Forward().scale(movSpeed))
        box.moveWithCollisions(box.getDirection(B.Vector3.Forward()).scale(movSpeed))
        sendPos()
      },
      KeyA() {
        box.rotate(B.Vector3.Up(), -rotSpeed)
        sendRot()
      },
      KeyS() {
        // box.locallyTranslate(B.Vector3.Backward().scale(movSpeed))
        box.moveWithCollisions(box.getDirection(B.Vector3.Backward()).scale(movSpeed))
        sendPos()
      },
      KeyD() {
        box.rotate(B.Vector3.Up(), rotSpeed)
        sendRot()
      },
    }
    for (let k in down) {
      if (map[k]) map[k]()
    }
  })

  // let ammo = await Ammo.call({})
  // scene.enablePhysics(new B.Vector3(0, -9.81, 0), new B.AmmoJSPlugin(true, ammo))

  // room.physicsImpostor = new B.PhysicsImpostor(room, B.PhysicsImpostor.MeshImpostor, { mass: 0, restitution: .9, }, scene)
  // box.physicsImpostor = new B.PhysicsImpostor(box, B.PhysicsImpostor.BoxImpostor, { mass: 2, restitution: .1, }, scene)

  addEventListener('resize', _ => {
    engine.resize()
  })

  cb({ B, engine, scene })
}