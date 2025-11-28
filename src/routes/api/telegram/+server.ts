import { users, repo } from '../../../../settings.json'
import { handleError, parseBuildArgs, workflowEmoji, sleep, ourFetch, EventMethods } from '$lib'
import botHelp from '../../../../bot_help.txt?raw'

import { json } from '@sveltejs/kit'



export async function POST(event) {
  const genericOKResponse = new Response(":)", {status: 200})
  const genericNOKResponse = new Response(":(", {status: 500})

  const methods = new EventMethods(event)
  await methods.setup()

  const messageText = methods.data?.message?.text;
  if (!messageText) return genericOKResponse; // update is not a message

  const for_user = methods.telegramUser()
  if (!for_user) return genericOKResponse; // unauthorized

  try {
    if (messageText.startsWith('/')) {
      const messageWords = messageText.split(' ')
      const command = messageWords[0]
      const args = messageWords.slice(1).join(' ')
      
      if (command.startsWith('/list')) {
        try {
          const runs = await methods.listWorkflowRuns()
          const message = runs.reverse().map(r => `• ${workflowEmoji(r)} [${r.name}](${r.html_url})`).join('\n')
          await methods.telegramReply(message)
        } catch (error) {
          handleError(error)
          await methods.telegramReply("error handling the /list command: " + error.message)
        }
      } else if (command.startsWith('/build')) {
        try {
          const buildArgs = parseBuildArgs(args, for_user)
          const workflow = await methods.launchWorkflow(buildArgs)
          await methods.telegramReply(`launched [review](${workflow}) on [pull request](https://github.com/NixOS/nixpkgs/pull/${buildArgs.pr}) 👍\n\`\`\`\n${JSON.stringify(buildArgs, null, 2)}\n\`\`\``)
        } catch (error) {
          handleError(error)
          await methods.telegramReply("error handling the /build command: " + error.message)
        }
      }
    } else {
      await methods.telegramReply(botHelp)
    }
    return genericOKResponse
  } catch (error) {
    handleError(error)
    return genericNOKResponse
  }
}
