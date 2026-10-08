import { it, expect } from 'vitest';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { AccountProfileProps, AccountPreferencesProps, WhoamiBadgeProps, ApiTokenManagerProps, ConnectedAccountsProps, AccountIdentity } from '@hollis-labs/kit-account';
type Assert<T extends true> = T;
type IsAny<T> = 0 extends (1 & T) ? true : false;
type ProfileTyped = Assert<IsAny<AccountProfileProps> extends false ? true : false>;
type PreferencesTyped = Assert<IsAny<AccountPreferencesProps> extends false ? true : false>;
type IdentityTyped = Assert<IsAny<WhoamiBadgeProps> extends false ? true : false>;
type TokensTyped = Assert<IsAny<ApiTokenManagerProps> extends false ? true : false>;
type ConnectedTyped = Assert<IsAny<ConnectedAccountsProps> extends false ? true : false>;
// @ts-expect-error Editable profile data cannot invent an assurance state.
const unsupportedAssurance: AccountIdentity = { state: 'identified', displayName: 'fixture', assurance: 'authenticated' };
void unsupportedAssurance;
it('exact account archive and served license retain complete MIT attribution', async () => { const installed = await readFile(fileURLToPath(new URL('../node_modules/@hollis-labs/kit-account/LICENSE', import.meta.url)), 'utf8'), asset = await readFile(fileURLToPath(new URL('../example/public/licenses/kit-account.LICENSE', import.meta.url)), 'utf8'); expect(asset).toBe(installed); expect(asset).toContain('Permission is hereby granted'); const provenance = JSON.parse(await readFile(fileURLToPath(new URL('../../third_party/kit-account-provenance.json', import.meta.url)), 'utf8')); expect(JSON.stringify(provenance)).toContain('dbcf4fa'); });
