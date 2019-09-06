'use strict'
var test = require('tap').test
var Tacks = require('tacks')
var Dir = Tacks.Dir
var File = Tacks.File
var common = require('../common-tap.js')

var testdir = common.pkg
var fixture = new Tacks(Dir({
  node_modules: Dir({
    a: Dir({
      'package.json': File({
        name: 'a',
        version: '1.0.0',
        dependencies: {
          b: '1.0.0'
        }
      }),
      node_modules: Dir({
        b: Dir({
          'package.json': File({
            name: 'b',
            version: '1.0.0'
          })
        })
      })
    })
  }),
  'b-src': Dir({
    'package.json': File({
      name: 'b',
      version: '1.0.0',
      funding: 'http://example.com/fund.json'
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

test('install-report', function (t) {
  common.npm(['install', '--no-save', './b-src'], {cwd: testdir}, function (err, code, stdout, stderr) {
    if (err) throw err
    t.is(code, 0, 'installed successfully')
    t.is(stderr, '', 'no warnings')
    t.includes(stdout, '`npm fund`', 'metions `npm fund`')
    t.end()
  })
})

test('cleanup', function (t) {
  cleanup()
  t.end()
})
