declare module 'virtual:plugin-host-ui/stylesheets' {
 export function createStylesheetLeases(document:Document):import('@hollis-labs/plugin-host-ui/vite').StylesheetLeases
}

declare module 'virtual:chimera/frame-fixture' { const value:{bootstrap:string;artifacts:readonly import('@hollis-labs/plugin-host-ui/isolation').BridgeArtifact[];imports:readonly import('@hollis-labs/plugin-host-ui/isolation').BridgeImport[]};export default value }
