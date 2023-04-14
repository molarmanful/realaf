import * as B from '@babylonjs/core'
import { GridMaterial } from '@babylonjs/materials'
// import Ammo from 'ammojs-typed'
import tick from './tick?worker'

let createScene = async (canvas, ch, cb = _ => { }) => {
  let dpiScale = 4
  let engine = new B.Engine(canvas, true)
  engine.setHardwareScalingLevel(devicePixelRatio / dpiScale)
  let scene = new B.Scene(engine)
  scene.clearColor = B.Color3.Black().toLinearSpace()
  scene.collisionsEnabled = true

  let camera = new B.FollowCamera('camera', new B.Vector3(0, 10, 0), scene)
  // camera.fov = .1
  camera.heightOffset = 10
  camera.rotationOffset = 180
  camera.radius = 10
  // camera.attachControl(canvas, true)

  let pipe = new B.DefaultRenderingPipeline('pipe', true, scene, [camera])
  pipe.samples = 4
  pipe.chromaticAberrationEnabled = true
  pipe.chromaticAberration.aberrationAmount = 6
  pipe.grainEnabled = true
  pipe.grain.animated = true

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

  let roomSize = 40
  let room = B.MeshBuilder.CreateBox('room', { size: roomSize, sideOrientation: B.Mesh.BACKSIDE }, scene)
  room.position.y = roomSize / 2
  shadow.getShadowMap().renderList.push(room)
  room.receiveShadows = true
  room.checkCollisions = true

  room.material = new GridMaterial('', scene)

  let makeBox = (name = 'box') => {
    let b = B.MeshBuilder.CreateBox(name, { size: 1 }, scene)
    shadow.getShadowMap().renderList.push(b)
    b.receiveShadows = true
    return b
  }

  let updateBox = (b, data) => {
    b.position = new B.Vector3(...data.pos)
    b.rotationQuaternion = new B.Quaternion(...data.rot)
  }

  let box = makeBox()
  box.checkCollisions = true

  camera.lockedTarget = box

  let loop = new tick()
  loop.postMessage(60)
  loop.addEventListener('message', now => {
    box.moveWithCollisions(new B.Vector3(0, -9.81 / 60, 0))
  })

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
      },
      KeyA() {
        box.rotate(B.Vector3.Up(), -rotSpeed)
      },
      KeyS() {
        // box.locallyTranslate(B.Vector3.Backward().scale(movSpeed))
        box.moveWithCollisions(box.getDirection(B.Vector3.Backward()).scale(movSpeed))
      },
      KeyD() {
        box.rotate(B.Vector3.Up(), rotSpeed)
      },
    }
    for (let k in down) {
      if (map[k]) map[k]()
    }
  })

  let boxes = {}
  boxes[ch.id] = box
  ch.on('spawn', ({ id, data, state }) => {
    if (!boxes[id] && id != ch.id) {
      let b = makeBox(id)
      updateBox(b, data)
      boxes[id] = b
    }
    else {
      for (let i in state) {
        if (!boxes[i] && i != ch.id) {
          let b = makeBox(i)
          boxes[i] = b
        }
        updateBox(boxes[i], state[i])
      }

      ch.on('ping', state => {
        for (let i in state) {
          if (i != ch.id) updateBox(boxes[i], state[i])
        }

        ch.emit('pong', {
          pos: box.position.asArray(),
          rot: box.rotationQuaternion.asArray()
        })
      })

      ch.on('die', id => {
        boxes[id].dispose()
        delete boxes[id]
      })

      engine.runRenderLoop(() => {
        scene.render()
      })
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

export { createScene }