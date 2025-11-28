// place files you want to import through the `$lib` alias in this folder.
import { users, repo } from '../../settings.json'

export function handleError(e) {
  const {message, stack} = e
  console.error({message, stack})
}

export function parseBuildArgs(cmdArgs, for_user) {
  let cmd = cmdArgs
  let args = {}
  args['x86_64-linux'] = true
  if (cmd.includes('+nofreespace')) {
    args['free-space'] = false
    cmd = cmd.replace('+nofreespace', '')
  }
  if (cmd.includes('+quiet')) {
    args['quiet'] = true
    cmd = cmd.replace('+quiet', '')
  }
  if (cmd.includes('+darwin')) {
    args['x86_64-darwin'] = true
    args['aarch64-darwin'] = true
    cmd = cmd.replace('+darwin', '')
  }
  let cmdList = cmd.split(' ').filter(s => s.length > 0)
  let pr = parseInt(cmdList[0])
  if (isNaN(pr)) {
    throw new Error("bad pr name: " + cmdList[0])
  }
  args['pr'] = String(pr)
  cmd = cmdList.slice(1).join(' ')
  args['extra-args'] = cmd
  args['for'] = for_user
  return args
}


export function workflowEmoji(workflow) {
  switch (workflow.status) {
    case 'in_progress':
      return '⌛'
    case 'completed':
      switch (workflow.conclusion) {
        case 'cancelled':
          return '🚫'
        case 'failure':
          return '❌'
        case 'success':
          return '✅'
      }
  }
  return '❔'
} 

export async function sleep(time) {
  return new Promise((res, rej) => setTimeout(res, time))
}

export async function ourFetch(url, args) {
  if (!args.headers) {
    args.headers = {}
  }
  args.headers['User-Agent'] = 'Mozilla/5.0 (X11; Linux x86_64; rv:132.0) Gecko/20100101 Firefox/132.0'
  const res = await fetch(url, args)
  let text = await res.text()
  let ret = text
  try {
    ret = JSON.parse(text)
  } catch {}
  console.log({
    message: (args.method ?? "GET") + " " + url,
    // ret
  })
  return {
    status: res.status,
    data: ret
  }
}

export class EventMethods {
  constructor(event) {
    this.event = event
    this.data = null
  }

  async setup() {
    this.data = await this.event.request.text()
    try {
      this.data = JSON.parse(this.data)
    } catch {}
  }

  async github(method, url, args = null) {
    let fetchArgs = {
      method,
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'Authorization': `Bearer ${this.event.platform.env.GITHUB_TOKEN}`,
      }
    }
    if (args) {
      fetchArgs.headers['Content-Type'] = 'application/json'
      fetchArgs.body = JSON.stringify(args)
    }
    return await ourFetch(`https://api.github.com/${url}`, fetchArgs)
  }
  async telegram(method, url, args = null) {
    let fetchArgs = {
      method,
      headers: {},
    }
    if (args) {
      fetchArgs.headers['Content-Type'] = 'application/json'
      fetchArgs.body = JSON.stringify(args)
    }
    return await ourFetch(`https://api.telegram.org/bot${this.event.platform.env.TELEGRAM_TOKEN}/${url}`, fetchArgs)
  }

  telegramUser() {
    const chatID = this.data?.message?.from?.id;
    if (!chatID) return null
    return users[String(chatID)]
  }

  async telegramReply(message: string, chatID = null, messageID = null) {
    if (!chatID) {
      chatID = this.data?.message?.from?.id;
    }
    if (!messageID) {
      messageID = this.data?.message?.message_id;
    }
    console.log({type: 'respond', message, chatID, messageID})
    let body = {
      chat_id: chatID,
      text: message,
      parse_mode: "Markdown",
      link_preview_options: {
        is_disabled: true
      }
    }
    if (messageID) {
      body['reply_parameters'] = {
        message_id: messageID
      }
    }
    return await this.telegram('POST', 'sendMessage', body)
  }

  async getWorkflowId() {
    const workflowList = await this.github('GET', `repos/${repo}/actions/workflows`)
    // console.log({workflowList})
    const thatWorkflows = workflowList.data.workflows.filter(w => w.path === ".github/workflows/nixpkgs-review.yml")
    if (thatWorkflows.length == 0) {
      throw new Error("that workflow is not defined on " + repo)
    }
    return thatWorkflows[0].id
  }

  async listWorkflowRuns() {
    const runs = await this.github('GET', `repos/${repo}/actions/runs`)
    return runs.data.workflow_runs.filter(w => w.path === ".github/workflows/nixpkgs-review.yml")
  }

  async launchWorkflow(args) {
    const thatWorkflow = await this.getWorkflowId()
    const workflowTrigger = await this.github('POST', `repos/${repo}/actions/workflows/${thatWorkflow}/dispatches`, {
      ref: 'main',
      inputs: args
    })
    console.log({message: "workflow trigger", workflowTrigger})
    if (workflowTrigger.status != 204) {
      throw new Error(workflowTrigger.data.message)
    }
    await sleep(2000)
    const runs = await this.listWorkflowRuns()
    const filteredRuns = runs.filter(w => w.name.includes(String(args.pr)))
    if (filteredRuns.length == 0) {
      throw new Error("not created")
    }
    return filteredRuns[0].html_url
  }
}
