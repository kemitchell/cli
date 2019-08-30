'use strict'
var test = require('tap').test
var Tacks = require('tacks')
var Dir = Tacks.Dir
var File = Tacks.File
var common = require('../common-tap.js')

var testdir = common.pkg
var fixture = new Tacks(Dir({
  'b-src': Dir({
    'package.json': File({
      name: 'b',
      author: 'Author Contributor',
      contributors: [
        {name: 'Author Contributor'},
        'Another Contributor'
      ],
      funding: 'https://example.com/funding.json',
      version: '1.0.0'
    })
  })
}))

function setup () {
  cleanup()
  fixture.create(testdir)
}

function cleanup () {
  fixture.remove(testdir)
}

test('setup', function (t) {
  setup()
  t.end()
})

test('install', function (t) {
  common.npm(['install', '--no-save', './b-src'], {cwd: testdir}, function (err, code, stdout, stderr) {
    if (err) throw err
    t.is(code, 0, 'installed successfully')
    t.is(stderr, '', 'no warnings')
    t.includes(stdout, '`npm fund`', 'mentions `npm fund`')
    t.end()
  })
})

test('cleanup', function (t) {
  cleanup()
  t.end()
})
