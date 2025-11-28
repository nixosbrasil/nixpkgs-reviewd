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

<div class="card bg-base-100 shadow-xl">
  <div class="card-body">
    <h1 class="card-title text-3xl font-bold">nixpkgs-reviewd</h1>
    <p class="text-base-content/70">Solução para disparar instâncias do nixpkgs-review através do Telegram</p>

    <div class="divider"></div>

    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-semibold">Ongoing tasks</h2>
      <button class="btn btn-primary btn-sm" onclick="{() => actions = updateActions()}">
        Refresh
      </button>
    </div>

    {#await actions}
      <div class="flex justify-center p-8">
        <span class="loading loading-spinner loading-lg"></span>
      </div>
    {:then actionsData}
      <div class="overflow-x-auto">
        <table class="table table-zebra w-full">
          <thead>
            <tr>
              <th class="w-12">Status</th>
              <th>Task Name</th>
              <th class="w-24 text-right">Link</th>
            </tr>
          </thead>
          <tbody>
            {#each actionsData.workflow_runs as action}
              {#if action.path == '.github/workflows/nixpkgs-review.yml'}
                <tr class="hover">
                  <td class="text-2xl">{workflowEmoji(action)}</td>
                  <td class="font-medium">{ action.name }</td>
                  <td class="text-right">
                    <a target="_blank" href="{action.html_url}" class="btn btn-xs btn-outline">
                      View
                    </a>
                  </td>
                </tr>
              {/if}
            {/each}
          </tbody>
        </table>
      </div>
    {:catch error}
      <div role="alert" class="alert alert-error">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>Error: { error }</span>
      </div>
    {/await}
  </div>
</div>
