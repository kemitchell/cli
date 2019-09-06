'use strict'

var npm = require('./npm.js')
var output = require('./utils/output.js')
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
  readPackageTree(npm.dir, function (error, tree) {
    if (error) return cb(error)
    var fundablePackages = Array.from(findFundablePackages(tree))
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

function findFundablePackages (root) {
  var set = new Set()
  iterate(root)
  return set

  function iterate (node) {
    node.children.forEach(recurse)
  }

  function recurse (node) {
    var metadata = node.package
    if (metadata.funding) {
      set.add({
        name: metadata.name,
        version: metadata.version,
        homepage: metadata.homepage,
        repository: metadata.repository,
        funding: metadata.funding,
        parent: node.parent,
        path: node.path
      })
    }
    if (node.children) iterate(node)
  }
}

function downloadFundingData (fundablePackages, cb) {
  var headers = { 'user-agent': npm.config.get('user-agent') }
  runParallelLimit(fundablePackages.map(function (entry) {
    return function task (done) {
      var url = entry.funding
      simpleGet.concat({
        url: url,
        json: true,
        headers: headers
      }, function (error, response, projectData) {
        if (error) {
          return done(null, {
            url: url,
            error: 'could not download data'
          })
        }
        if (typeof projectData !== 'object' || Array.isArray(projectData)) {
          return done(null, {
            url: url,
            error: 'not an object'
          })
        }
        var contributors = projectData.contributors
        if (!Array.isArray(contributors)) {
          return done(null, projectData)
        }
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
            simpleGet.concat({
              url: contributor.url,
              json: true,
              headers: headers
            }, function (error, response, contributorData) {
              if (error) {
                return done(null, {
                  url: contributor.url,
                  error: error
                })
              }
              contributorData.url = contributor.url
              done(null, contributorData)
            })
          }
        }), 5, function (error, resolvedContributors) {
          if (error) return done(error)
          done(null, {
            name: entry.name,
            version: entry.version,
            url: entry.funding,
            homepage: entry.homepage,
            contributors: resolvedContributors
          })
        })
      })
    }
  }), 5, cb)
}

function displayFundingData (entry) {
  var returned = [entry.name + '@' + entry.version]
  if (looksLikeURL(entry.homepage)) {
    returned[0] += ' (' + entry.homepage + ')'
  }
  if (Array.isArray(entry.contributors)) {
    entry.contributors.forEach(function (contributor) {
      var name = contributor.name
      if (looksLikeSafeString(name)) {
        var item = ['- ' + name]
        var email = contributor.email
        if (looksLikeSafeString(email)) {
          item[0] += ' <' + email + '>'
        }
        var links = contributor.links
        if (Array.isArray(links)) {
          links.forEach(function (link) {
            if (looksLikeURL(link)) item.push('  ' + link)
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
