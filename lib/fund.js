'use strict'

var npm = require('./npm.js')
var npmConfig = require('./config/figgy-config.js')
var output = require('./utils/output.js')
var path = require('path')
var readPackageTree = require('read-package-tree')
var runParallelLimit = require('run-parallel-limit')
var simpleGet = require('simple-get')
var semver = require('semver')
var hasANSI = require('has-ansi')

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
          .sort(function (a, b) {
            var comparison = a.name.localeCompare(b.name)
            return comparison === 0
              ? semver.compare(a.version, b.version)
              : comparison
          })
          .map(displayFundingData)
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
  var entries = Array.from(fundablePackages)
  runParallelLimit(entries.map(function (entry) {
    return function task (done) {
      var url = entry.funding
      simpleGet({
        url: url,
        json: true
      }, function (error, response, data) {
        if (error) return done(error)
        var contributors = data.contributors
        if (!Array.isArray(contributors)) return done(null, data)
        runParallelLimit(contributors.map(function (contributor) {
          return function (done) {
            if (
              typeof contributor !== 'object' ||
              typeof contributor.url !== 'string'
            ) {
              return setImmediate(function () {
                done(null, contributor)
              })
            }
            simpleGet({
              url: contributor.url,
              json: true
            }, function (error, response, data) {
              if (error) {
                return done(null, {
                  url: contributor.url,
                  error: error
                })
              }
              done(null, data)
            })
          }
        }), 5, function (error, resolvedContributors) {
          if (error) return done(error)
          data.contributors = resolvedContributors
          done(null, data)
        })
      })
    }
  }), 5, cb)
}

function displayFundingData (entry) {
  var returned = [entry.name + '@' + entry.version]
  if (looksLikeURL(entry.project)) returned.push(entry.project)
  if (Array.isArray(entry.contributors)) {
    entry.contributors.forEach(function (contributor) {
      var name = contributor.name
      if (looksLikeSafeString(name)) {
        var item = [name]
        var type = contributor.type
        if (
          type === 'person' ||
          type === 'organization' ||
          type === 'government'
        ) {
          item.push(type)
        }
        var email = contributor.email
        if (looksLikeSafeString(email)) item.push(email)
        var homepage = contributor.homepage
        if (looksLikeURL(homepage)) item.push(homepage)
        var links = contributor.links
        if (Array.isArray(links)) {
          links.forEach(function (link) {
            if (looksLikeURL(link)) item.push('- ' + link)
          })
        }
        returned.push(item.join('\n'))
      }
    })
  }
  return returned.join('\n')
}

function looksLikeSafeString (argument) {
  return (
    typeof argument === 'string' &&
    argument.length > 0 &&
    argument.length < 80 &&
    !hasANSI(argument)
  )
}

function looksLikeURL (argument) {
  return (
    looksLikeSafeString(argument) &&
    (
      argument.indexOf('https://') === 0 ||
      argument.indexOf('http://') === 0
    )
  )
}
