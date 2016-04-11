var regl = require('regl')()
var mat4 = require('gl-mat4')
var hsv2rgb = require('hsv2rgb')
var Analyser = require('web-audio-analyser')

var analyser

navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia

navigator.getUserMedia({audio: true, video: false, muted: true}, function(stream) {
  analyser = Analyser(stream, {audible: false, stereo: false})
}, function (err) {
})

var count = 2

var draw = regl({
  frag: [
    'precision mediump float;',
    'varying vec3 vcolor;',
    'void main() {',
    '  gl_FragColor = vec4(vcolor, 1.0);',
    '}'
  ].join('\n'),

  vert: [
    'precision mediump float;',
    'attribute vec2 position;',
    'uniform vec2 offset;',
    'uniform float depth;',
    'uniform mat4 proj;',
    'uniform vec3 color;',
    'varying vec3 vcolor;',
    'void main() {',
    '  vcolor = color;',
    '  gl_Position = proj * vec4(position.x + offset.x, position.y + offset.y, -0.5 + depth * 8.0, 1.0);',
    '  gl_PointSize = 20.0;',
    '}'
  ].join('\n'),

  attributes: {
    position: regl.buffer([[0.0, -0.2], [0.0, 0.2]])
  },

  uniforms: {
    proj: mat4.perspective([], Math.PI/2, window.innerWidth / window.innerHeight, 0.01, 1000),
    offset: regl.prop('offset'),
    depth: regl.prop('depth'),
    color: regl.prop('color')
  },

  lineWidth: 10,

  primitive: 'lines',

  count: count
})

var updates = []
var i, freq, wave, total, calc1, calc2, calc3

function bin (array, count) {
  var out = sub = []
  var width = Math.round(array.length / count)
  for (i = 0; i < count; i++) {
    sub = array.slice(i * width, (i + 1) * width)
    out[i] = sub.reduce(function (x, y) {return x + y}) / sub.length
  }
  return out
}

regl.frame(function (count) {
  regl.clear({
    color: [0, 0, 0, 1]
  })

  if (analyser) {
    freq = bin(analyser.frequencies().slice(5, 800), 100)
    wave = bin(analyser.waveform(), 100)
    total = freq.reduce(function (x, y) {return x + y}) / 100
    for (i = 0; i < 100; i++) {
      calc1 = (0.25 * (freq[i] / 150 - 1) + 0.15)
      calc2 = ((1.5 * (wave[i] / 128 - 1)))
      if (updates[i]) {
        updates[i] = {
          offset: [(i - 50)/50, 0.5 * updates[i].offset[1] + 0.5 * calc1],
          depth: 0.9 * updates[i].depth + 0.1 * calc2
        }
      } else {
        updates[i] = {
          offset: [(i - 50)/50, calc1],
          depth: calc2
        }
      }
      calc3 = hsv2rgb(((i / 100) * 360 + Math.cos(count * 0.1) * total) % 360, 0.65, Math.max((calc1 + 0.1) * 5, 0.12))
      updates[i].color = [calc3[0] / 255, calc3[1] / 255, calc3[2] / 255]
    }
  }

  draw(updates)
})