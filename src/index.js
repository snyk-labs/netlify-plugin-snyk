const chalk = require('chalk')
const debug = require('debug')('netlify-plugin-snyk')
const Audit = require('./Audit')
const audit = new Audit()

module.exports = {
  onPostBuild: async ({ utils }) => {
    debug(`detected working directory: `, process.cwd())

    let testResults
    try {
      testResults = await audit.test({ directory: process.cwd() })
    } catch (error) {
      utils.build.failBuild(error)
    }

    if (testResults) {
      const testResultsString = audit.formatOutput(testResults)
      console.log(testResultsString)
      console.log(chalk.red(`Snyk test found security vulnerabilities in production dependencies.`))
      console.log(chalk.red(`It is recommended you review before deploying`))
      utils.build.failBuild(`error, security vulnerabilities detected.`)
    } else {
      console.log(chalk.green(`Snyk security test completed. no vulnerable paths found.`))
      console.log(chalk.green(`You're good to go, sir!`))
    }
  }
}
