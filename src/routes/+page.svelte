<script lang="ts">
  import { repo } from "../../settings.json"
  import { workflowEmoji } from "$lib";

  async function updateActions() {
    const res = await fetch(`https://api.github.com/repos/${repo}/actions/runs`, {
      headers: {
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    })
    return await res.json()
  }

  let actions = updateActions()
</script>

<article class="prose p-4">
  <h1>nixpkgs-reviewd</h1>

  <p>Solução para disparar instâncias do nixpkgs-review através do Telegram</p>

  <h2>Ongoing tasks <button class="btn btn-sm" onclick="{() => actions = updateActions()}">Refresh</button></h2>

  {#await actions}
    <p>Loading...</p>
  {:then actionsData}
  <ul>
  {#each actionsData.workflow_runs as action}
    {#if action.path == '.github/workflows/nixpkgs-review.yml'}
      <li>
        {workflowEmoji(action)}
        <a target="_blank" href="{action.html_url}">
          { action.name }
        </a>
      </li>
    {/if}
  {/each}
  </ul>
  {:catch error}
    <p color="red">Error { error }</p>
  {/await}
</article>
