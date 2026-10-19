import { app } from './app.js'
import { config } from './config.js'
import { failStaleAnalyses } from './services/triageService.js'

const failed = await failStaleAnalyses()
if (failed) {
  console.info(`Marked ${failed} unfinished AI analyses as failed`)
}

app.listen(config.PORT, () => {
  console.info(`API listening on port ${config.PORT}`)
})
