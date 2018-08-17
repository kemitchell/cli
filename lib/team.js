/* eslint-disable standard/no-callback-literal */

const BB = require('bluebird')

const npmConfig = require('./config/figgy-config.js')
const npmFetch = require('npm-registry-fetch')
const output = require('./utils/output.js')
const usage = require('./utils/usage')
const validate = require('aproba')

module.exports = team

team.subcommands = ['create', 'destroy', 'add', 'rm', 'ls', 'edit']

team.usage = usage(
  'team',
  'npm team create <scope:team>\n' +
  'npm team destroy <scope:team>\n' +
  'npm team add <scope:team> <user>\n' +
  'npm team rm <scope:team> <user>\n' +
  'npm team ls <scope>|<scope:team>\n' +
  'npm team edit <scope:team>'
)

function UsageError () {
  throw Object.assign(new Error(team.usage), {code: 'EUSAGE'})
}

team.completion = function (opts, cb) {
  var argv = opts.conf.argv.remain
  if (argv.length === 2) {
    return cb(null, team.subcommands)
  }
  switch (argv[2]) {
    case 'ls':
    case 'create':
    case 'destroy':
    case 'add':
    case 'rm':
    case 'edit':
      return cb(null, [])
    default:
      return cb(new Error(argv[2] + ' not recognized'))
  }
}

const eu = encodeURIComponent

function team ([cmd, entity = '', user = ''], cb) {
  // Entities are in the format <scope>:<team>
  return BB.try(() => {
    let [scope, team] = entity.split(':')
    scope = scope.replace(/^@/, '')
    const opts = npmConfig().concat({
      scope: `@${scope}`
    })
    let uri
    switch (cmd) {
      case 'create':
        validate('SS', [scope, team])
        uri = `/-/org/${eu(scope)}/team`
        return npmFetch.json(uri, opts.concat({
          method: 'PUT',
          body: {name: team}
        }))
      case 'ls':
        if (team) {
          validate('SS', [scope, team])
          uri = `/-/team/${eu(scope)}/${eu(team)}/user`
        } else {
          validate('S', [scope])
          uri = `/-/org/${eu(scope)}/team`
        }
        return npmFetch.json(uri, opts.concat({query: {format: 'cli'}}))
      case 'destroy':
        validate('SS', [scope, team])
        uri = `/-/team/${eu(scope)}/${eu(team)}`
        return npmFetch.json(uri, opts.concat({method: 'DELETE'}))
      case 'add':
        validate('SSS', [scope, team, user])
        uri = `/-/team/${eu(scope)}/${eu(team)}/user`
        return npmFetch(uri, opts.concat({
          method: 'PUT',
          body: {user}
        })).then(() => ({}))
      case 'rm':
        validate('SSS', [scope, team, user])
        uri = `/-/team/${eu(scope)}/${eu(team)}/user`
        return npmFetch(uri, opts.concat({
          method: 'DELETE',
          body: {user}
        })).then(() => ({}))
      case 'edit':
        throw new Error('`npm team edit` is not implemented yet.')
      default:
        UsageError()
    }
  }).then(
    data => {
      data && output(JSON.stringify(data, undefined, 2))
      cb(null, data)
    },
    err => err.code === 'EUSAGE' ? cb(err.message) : cb(err)
  )
}
