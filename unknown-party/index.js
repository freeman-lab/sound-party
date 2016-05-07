var regl = require('regl')()
var mat4 = require('gl-mat4')
var hsv2rgb = require('hsv2rgb')
var ndarray = require('ndarray')
var Analyser = require('web-audio-analyser')
var blur = require('ndarray-gaussian-filter')

var analyser

navigator.getUserMedia  = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia

navigator.getUserMedia({audio: true, video: false, muted: true}, function(stream) {
  analyser = Analyser(stream, {audible: false, stereo: false})
}, function (err) {
})

var count = 60

var draw = regl({
  frag: [
    'precision mediump float;',
    'void main() {',
    '  gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);',
    '}'
  ].join('\n'),

  vert: [
    'precision mediump float;',
    'attribute vec2 position;',
    'uniform mat4 proj;',
    'uniform float offset;',
    'void main() {',
    '  gl_Position = vec4(position.x, position.y - offset, 0.0, 1.0);',
    '  gl_PointSize = 20.0;',
    '}'
  ].join('\n'),

  attributes: {
    position: regl.prop('waveform')
  },

  uniforms: {
    proj: mat4.perspective([], Math.PI/2, window.innerWidth / window.innerHeight, 0.01, 1000),
    offset: regl.prop('offset')
  },

  lineWidth: 4,

  primitive: 'line strip',

  count: count
})

var out = []
var xy = []
var tmp = []
var i, j, raw, blurred, background, freq, total

var color = []
var oldchoice = 0
var choice = 0
var interval = 400
var flag = 0
color[0] = hsv2rgb(192, 0.8, 0.0)
color[1] = hsv2rgb(192, 0.8, 0.7)
color[2] = hsv2rgb(100, 0.8, 0.7)
color[3] = hsv2rgb(335, 0.8, 0.7)

regl.frame(function (count) {
  
  if (analyser) {
    freq = analyser.frequencies().slice(5, 605)
    total = freq.reduce(function (x, y) {return x + y}) / 90000

    if ((count % interval) == 0) {
      oldchoice = choice
      flag = 0
      while (flag == 0) {
        choice = Math.round(Math.random() * 3)
        if (!(choice == oldchoice)) flag = 1
      }
    }

    regl.clear({
      color: [color[choice][0] / 255, color[choice][1] / 255, color[choice][2] / 255, 1]
    })

    for (j = 0; j < 20; j++) {
      raw = Array(15).fill(0).concat(Array.prototype.slice.call(freq.slice(j * 30, (j + 1) * 30))).concat(Array(15).fill(0))
      blurred = blur(ndarray(raw), 1).data
      for (i = 0; i < 60; i++) {
        out[i] = [((i - (60 / 2)) / (60 / 2) + 1 / 60) * 0.9, Math.random() / 100 + blurred[i] / 300]
      }
      draw({waveform: regl.buffer(out), offset: -j / (10 + 1.1) + 0.9})
    }
  }
})