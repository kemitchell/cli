'use strict'
var test = require('tap').test
var Tacks = require('tacks')
var Dir = Tacks.Dir
var File = Tacks.File
var http = require('http')
var common = require('../common-tap.js')

var testdir = common.pkg
var port = 8989
var server

var fixture = new Tacks(Dir({
  'b-src': Dir({
    'package.json': File({
      name: 'b',
      funding: 'http://localhost:' + port + '/funding.json',
      version: '1.0.0'
    })
  })
}))

test('setup', function (t) {
  fixture.remove(testdir)
  fixture.create(testdir)
  t.end()
  /*
  server = http.createServer()
    .on('request', function (request, response) {
      response.end(JSON.stringify({
        project: 'http://example.com/b',
        contributors: [
          {
            name: 'Test Contributor',
            type: 'person',
            homepage: 'http://example.com/person',
            links: ['http://example.com/fund']
          }
        ]
      }))
    })
    .listen(port, function () {
      t.end()
    })
    */
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

test('fund', function (t) {
  common.npm([
    'fund', '--json'
  ], {cwd: testdir}, function (err, code, stdout, stderr) {
    t.ifErr(err, 'fund succeeded')
    t.equal(0, code, 'fund exited 0')
    var output = JSON.parse(stdout)
    t.ok(output, 'output present')
    t.end()
  })
})

test('cleanup', function (t) {
  fixture.remove(testdir)
  // server.close()
  t.end()
})
