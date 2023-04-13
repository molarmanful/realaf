import * as B from '@babylonjs/core'

let createScene = async (canvas, cb = _ => { }) => {
  let dpiScale = 4
  let engine = new B.Engine(canvas, true)
  engine.setHardwareScalingLevel(devicePixelRatio / dpiScale)
  let scene = new B.Scene(engine)
  scene.clearColor = B.Color3.Black().toLinearSpace()

  let camera = new B.ArcRotateCamera('camera', Math.PI / 4, Math.PI / 4, 100, B.Vector3.Zero(), scene)
  camera.fov = .1
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

  let boxSize = .2
  let box = B.MeshBuilder.CreateBox('box', { size: boxSize }, scene)
  shadow.getShadowMap().renderList.push(box)
  box.receiveShadows = true

  engine.runRenderLoop(() => {
    scene.render()
  })

  addEventListener('resize', _ => {
    engine.resize()
  })

  cb({ B, engine, scene })
}

export { createScene }