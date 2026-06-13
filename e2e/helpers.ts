import { APIRequestContext, Page } from '@playwright/test';

export interface SeededGroup {
  groupId: string;
  players: { id: string; name: string }[];
}

/**
 * Seed a group and players directly through the production HTTP API.
 * Using the API for setup keeps tests fast and deterministic; the behaviour
 * under test is still driven through the real browser UI.
 */
export async function seedGroup(
  request: APIRequestContext,
  groupName: string,
  playerNames: string[],
  defaultBuyIn = 100
): Promise<SeededGroup> {
  const groupRes = await request.post('/api/groups', {
    data: { name: groupName, defaultBuyIn },
  });
  if (!groupRes.ok()) {
    throw new Error(`Failed to create group: ${groupRes.status()} ${await groupRes.text()}`);
  }
  const group = await groupRes.json();

  const players = [];
  for (const name of playerNames) {
    const res = await request.post('/api/players', {
      data: { groupId: group.id, name },
    });
    if (!res.ok()) {
      throw new Error(`Failed to create player ${name}: ${res.status()} ${await res.text()}`);
    }
    const player = await res.json();
    players.push({ id: player.id, name: player.name });
  }

  return { groupId: group.id, players };
}

/**
 * Make the SPA treat `group` as the selected group and the user as an EDITOR,
 * by pre-seeding localStorage before the app boots.
 */
export async function selectGroupInBrowser(
  page: Page,
  group: { id: string; name: string; defaultBuyIn?: number }
) {
  await page.addInitScript((g) => {
    localStorage.setItem('userRole', 'EDITOR');
    localStorage.setItem(
      'selectedGroup',
      JSON.stringify({
        id: g.id,
        name: g.name,
        defaultBuyIn: g.defaultBuyIn ?? 100,
        currency: 'USD',
        userRole: 'EDITOR',
      })
    );
  }, group);
}
