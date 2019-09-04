'use strict'

var npm = require('./npm.js')
var npmConfig = require('./config/figgy-config.js')
var output = require('./utils/output.js')
var path = require('path')
var readPackageTree = require('read-package-tree')
var runParallelLimit = require('run-parallel-limit')
var https = require('https')
var http = require('http')
var url = require('url')

module.exports = fund

const usage = require('./utils/usage')
fund.usage = usage(
  'fund',
  '\nnpm fund [--json]'
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
  var dir = path.resolve(npm.dir, '..')
  readPackageTree(dir, function (error, tree) {
    if (error) return cb(error)
    var fundablePackages = findFundablePackages(tree)
    downloadFundingData(fundablePackages, function (error, data) {
      if (error) return cb(error)

      if (typeof cb !== 'function') {
        cb = silent
        silent = false
      }
      if (silent) return cb(null, data)

      var out
      var json = npm.config.get('json')
      if (json) {
        out = JSON.stringify(data, null, 2)
      } else {
        out = data
          .map(function (entry) {
            return entry.name + '@' + entry.version
          })
          .join('\n\n')
      }
      output(out)
      if (error) process.exitCode = 1
      cb(error, data)
    })
  })
}

function findFundablePackages (tree) {
  return recurse(tree, new Set())

  function recurse (tree, set) {
    Object.keys(tree).forEach(function (name) {
      var node = tree[name]
      var metadata = node.version
      if (set.has(metadata)) return
      if (metadata.funding) {
        set.add({
          name: metadata.name,
          version: metadata.version,
          homepage: metadata.homepage,
          repository: metadata.repository,
          funding: metadata.funding,
          parent: tree.parent,
          path: tree.path
        })
      }
      var dependencies = node.dependencies
      if (dependencies) recurse(node.dependencies, set)
    })
    return set
  }
}

function downloadFundingData (fundablePackages, cb) {
  var tasks = Array.from(fundablePackages).map(function (package) {
    return function task (done) {
      var uri = package.funding
    }
  })
  var limit = 5
  runParallelLimit(tasks, limit, cb)
}
