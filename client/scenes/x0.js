import * as B from '@babylonjs/core'
import { GridMaterial } from '@babylonjs/materials'

let createScene = async (canvas, cb = _ => { }) => {
  let dpiScale = 4
  let engine = new B.Engine(canvas, true)
  engine.setHardwareScalingLevel(devicePixelRatio / dpiScale)
  let scene = new B.Scene(engine)
  scene.clearColor = B.Color3.Black().toLinearSpace()

  let camera = new B.FollowCamera('camera', new B.Vector3(0, 10, 0), scene)
  // camera.fov = .1
  camera.heightOffset = 10
  camera.rotationOffset = 45
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

  let groundSize = 40
  let ground = B.MeshBuilder.CreatePlane('ground', { size: groundSize }, scene)
  ground.rotation.x = Math.PI / 2
  shadow.getShadowMap().renderList.push(ground)
  ground.receiveShadows = true
  console.log(ground)

  ground.material = new GridMaterial('', scene)

  let box = B.MeshBuilder.CreateBox('box', { size: 1 }, scene)
  box.position.y = .5
  shadow.getShadowMap().renderList.push(box)
  box.receiveShadows = true

  let speed = .1

  camera.lockedTarget = box

  let down = {}
  addEventListener('keydown', e => {
    down[e.key] = true
  })
  addEventListener('keyup', e => {
    delete down[e.key]
  })

  scene.registerBeforeRender(_ => {
    let map = {
      w() {
        box.position.x -= speed
      },
      a() {
        box.position.z -= speed
      },
      s() {
        box.position.x += speed
      },
      d() {
        box.position.z += speed
      },
    }
    for (let k in down) {
      if (map[k]) map[k]()
    }
  })

  engine.runRenderLoop(() => {
    scene.render()
  })

  addEventListener('resize', _ => {
    engine.resize()
  })

  cb({ B, engine, scene })
}

export { createScene }