'use strict'

var npm = require('./npm.js')
var npmConfig = require('./config/figgy-config.js')
var output = require('./utils/output.js')
var path = require('path')
var readPackageTree = require('read-package-tree')

module.exports = fund

const usage = require('./utils/usage')
fund.usage = usage(
  'fund',
  '\nnpm fund [--json] [--production]'
)

fund.completion = function (opts, cb) {
  const argv = opts.conf.argv.remain

  switch (argv[2]) {
    case 'fund':
      return cb(null, [])
    default:
      return cb(new Error(argv[2] + ' not recognized'))
  }
}

function fund (args, silent, cb) {
  const opts = npmConfig()
  if (opts.global) {
    const err = new Error('`npm fund` does not support funding globals')
    err.code = 'EFUNDGLOBAL'
    throw err
  }
  if (typeof cb !== 'function') {
    cb = silent
    silent = false
  }
  var dir = path.resolve(npm.dir, '..')
  readPackageTree(dir, function (_, tree) {
    var fundable = findFundablePackages(tree)

    if (silent) return cb(null, data)

    var json = npm.config.get('json')
    var out
    if (json) {
      var seen = new Set()
      out = JSON.stringify(d, null, 2)
    } else if (data) {
    }
    output(out)

    if (error) process.exitCode = 1

    cb(er, data, lite)
  })
}

function findFundablePackages (tree, results) {
  return recurse(tree, [])
  function recurse (children, results) {
    if (Array.isArray(tree)) {
      tree.forEach(function (child) {
        var metadata = child.package
        if (metadata.funding) {
          results.push({
            name: metadata.name,
            version: metadata.version,
            homepage: metadata.homepage,
            repository: metadata.repository,
            funding: metadata.funding,
            parent: tree.parent,
            path: tree.path
          })
        }
      })
    } else {
      return results
    }
  }
}
