var context = require('gl-context')
var fit = require('canvas-fit')
var orbit = require('canvas-orbit-camera')
var icosphere = require('icosphere')
var tinycolor = require('tinycolor2')
var Analyser = require('web-audio-analyser')
var time = require('right-now')

var canvas = document.body.appendChild(document.createElement('canvas'))
window.addEventListener('resize', fit(canvas), false)
var gl = context(canvas, tick)

var analyser

navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia

navigator.getUserMedia({audio: true, video: false, muted: true}, function(stream) {
  analyser = Analyser(stream, {audible: false})
}, function (err) {
  console.log(err)
})

var scene = require('gl-scene')(gl, {background: [0, 0, 0]})

var phases = []
var positions = []
var i
for (i = 0; i < 200; i++) {
  phases[i] = Math.random() * Math.PI * 2
  positions[i] = [Math.random() * 20 - 10, Math.random() * 20 - 10, Math.random() * 20 - 10]
}

var basecolors = []
var color
for (i = 0; i < 200; i++) {
  color = tinycolor.fromRatio({h: i / 200, s: 0.8, v: 0.7}).toRgb()
  basecolors[i] = [color.r / 255, color.g / 255, color.b / 255]
}

var shapes = []
for (i = 0; i < 200; i++) {
  shapes.push({
    class: 'sphere',
    complex: icosphere(3),
    position: swirl(positions[i], phases[i], 0),
    style: {
      emissive: [Math.max(Math.random(), 0.3), 0.01, Math.max(Math.random(), 0.3)],
      diffuse: [0.9, 0.9, 0.9]
    }
  })
}

var lights = [
  {
    position: [0, 0, 0],
    style: {intensity: 2.0, ambient: 1, attenuation: 0.01}
  }
]

scene.lights(lights)
scene.shapes(shapes)
scene.init()

var camera = orbit(canvas)

var t = 0

var freq, hsv, rgb, fullfreq
var rotate = 0.005
var updates = []

function tick () {
  var now = time() * 0.001
  var axis = Math.sin(now) * 2
  
  camera.rotate([0, 0, 0], [axis * rotate, -rotate, 0])

  if (analyser) {
    freq = analyser.frequencies().reduce(function (x, y) { return x + y })
    fullfreq = analyser.frequencies()
    for (i=0; i < 50; i++) {
      if (updates[i]) {
        updates[i] = 0.1 * fullfreq.slice(i*8, (i+1)*8).reduce(function (x, y) { return x + y }) / 8 + 0.9 * updates[i]
      } else {
      updates[i] = fullfreq.slice(i*8, (i+1)*8).reduce(function (x, y) { return x + y }) / 8
      } 
    }
    rotate = freq / 10000000
  }
  scene.draw(camera)
  scene.selectAll('.sphere').each(function (d, i) {
    d.position(swirl(positions[i], phases[i], t, freq / 500))
  })
  scene.selectAll('.sphere').each(function (d, i) {
    hsv = tinycolor.fromRatio({r: basecolors[i][0], g: basecolors[i][1], b: basecolors[i][2]}).toHsv()
    hsv.h = hsv.h + Math.sin(t) * 100
    hsv.v = Math.min(4 + updates[Math.floor(i / 4)] / 1.5, 100)
    rgb = tinycolor(hsv).toRgb()
    d.style.emissive = [rgb.r / 255, rgb.g / 255, rgb.b / 255]
  })
  t += 0.01
}

function swirl (p, r, t, s) {
  var dx = Math.sin(t + r)
  var dy = Math.cos(t + r)
  return [p[0] + dx, p[1] + dy, p[2] + dx + dy]
}
