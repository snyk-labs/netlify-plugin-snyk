/* eslint-disable security/detect-child-process */
'use strict'

const Util = require('util')
const debug = require('debug')('netlify-plugin-snyk')
const ChildProcess = require('child_process')

const nodeCliCommand = 'npx'
const auditCliCommand = 'snyk'
const auditCliArgs = [auditCliCommand, 'test']
const ERROR_VULNS_FOUND = 1
const ERROR_UNAUTHENTICATED = 2
const JSON_BUFFER_SIZE = 50 * 1024 * 1024

class Audit {
  async test({ directory }) {
    const SNYK_TOKEN = process.env.SNYK_TOKEN
    const shellEnvVariables = Object.assign({}, process.env, {
      SNYK_TOKEN
    })

    const ExecFile = Util.promisify(ChildProcess.execFile)
    const args = [...auditCliArgs, ...(directory ? [directory] : [])]
    let testResults
    try {
      // allow for 50MB of buffer for a large JSON output
      const auditOutput = await ExecFile(nodeCliCommand, args, {
        maxBuffer: JSON_BUFFER_SIZE,
        env: shellEnvVariables
      })
      debug(`Audit output from Snyk command:`)
      debug(auditOutput)
    } catch (error) {
      const errorMessage = error.stdout

      if (errorMessage && errorMessage.indexOf('Could not detect supported target files') !== -1) {
        throw new Error(`can't detect package manifest files\ntry running in the project's rootdir`)
      }

      if (errorMessage && errorMessage.indexOf("we can't test without dependencies") !== -1) {
        throw new Error(`missing node_modules folders\ninstall dependencies and try again`)
      }

      if (error.code === ERROR_VULNS_FOUND) {
        testResults = error.stdout
      } else if (error.code === ERROR_UNAUTHENTICATED) {
        console.log(`Seems like you're missing the Snyk API token.`)
        console.log()
        console.log(
          `1. If you have the Snyk CLI installed you can get it with: snyk config get api`
        )
        console.log(
          `2. Retrieve the API token from the UI: https://support.snyk.io/hc/en-us/articles/360004037537-Authentication-for-third-party-tools`
        )
        console.log()
        console.log(`Then set an environment variable SNYK_TOKEN with the API token value`)

        throw new Error('missing Snyk API token')
      }
    }

    return testResults
  }

  formatOutput(testResults) {
    const testResultsString = testResults
    return testResultsString.trim()
  }
}

module.exports = Audit
