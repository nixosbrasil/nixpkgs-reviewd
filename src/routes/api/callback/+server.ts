import { users, repo } from '../../../../settings.json'
import { EventMethods, workflowEmoji } from '$lib'

import { json } from '@sveltejs/kit'

export async function POST(event) {
  const genericOK = await json({ok: true})
  const methods = new EventMethods(event)
  await methods.setup()
  const {action, workflow_run} = methods.data
  if (action !== 'completed') {
    // irrelevant
    return genericOK
  }
  console.log(methods.data)
  // return await json({ok: true})

  const { id, name, status, conclusion, html_url } = workflow_run
  const prData = name.match('#([0-9]*)')
  if (!prData) {
    console.error({message: "Can't detect PR number", data: methods.data})
    return genericOK
  }
  const pr = prData[1]
  const triggerData = name.match('for (.*)')
  if (!triggerData) {
    console.error({message: "Can't detect trigger owner", data: methods.data})
    return genericOK
  }
  const triggerUser = triggerData[1]
  const triggerChatID = Object.keys(users).find(k => users[k] === String(triggerUser))
  console.log({triggerChatID, triggerData})
  if (!triggerChatID) {
    console.error({message: "Can't detect trigger owner", data: methods.data})
    return genericOK
  }
  const emoji = workflowEmoji(workflow_run)

  return await json(await methods.telegramReply(`${emoji} **${name}**\n\n• [Result](${html_url})\n• [PR](https://github.com/NixOS/nixpkgs/pull/${pr})`, triggerChatID), {status: 200})
}
