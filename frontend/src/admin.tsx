import { AdminContent, type AdminContentProps } from '@hollis-labs/kit-admin'
/** Existing shell owns viewport/scrolling. Controlled read-only composition
 * exposes no settings writer, setup mutation or implicit transport. */
export type ReadOnlyAdminProps=Omit<AdminContentProps,'settingsActions'|'setup'|'setupContext'>
export function ReadOnlyAdmin(props:ReadOnlyAdminProps){return <AdminContent contextKey={props.contextKey} discovery={props.discovery} selection={props.selection} destination={props.destination} settings={props.settings} observations={props.observations} nowMs={props.nowMs} renderSeries={props.renderSeries}/>}
