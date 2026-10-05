import './developer-style.css';
import { useEffect, useRef, useState } from 'react';
import { Textarea } from '@hollis-labs/design-components';
import { CodeBlock, CodeBlockCopyButton, FileTree, FileTreeFolder, FileTreeFile, StackTrace, StackTraceHeader, StackTraceFrames } from '@hollis-labs/kit-code';
import { Canvas, Controls, Node as ReviewCard, NodeHeader, NodeTitle, NodeContent } from '@hollis-labs/kit-workflow/canvas';
import { applyNodeChanges, type Node, type NodeProps, type Edge, type NodeChange } from '@xyflow/react';
import { createAdminPresentationSession } from '../src/admin-session.js';
type ReviewGraphNode = Node<{
    label: string;
}, 'review'>;
function ReviewNode({ data }: NodeProps<ReviewGraphNode>) { return <ReviewCard handles={{ target: true, source: true }}><NodeHeader><NodeTitle>{data.label}</NodeTitle></NodeHeader><NodeContent>Read-only fixture step</NodeContent></ReviewCard>; }
const nodeTypes = { review: ReviewNode };
const initialNodes = (): ReviewGraphNode[] => [{ id: 'plan', type: 'review', position: { x: 0, y: 0 }, data: { label: 'Plan' }, ariaLabel: 'Review Plan node' }, { id: 'inspect', type: 'review', position: { x: 0, y: 192 }, data: { label: 'Inspect' }, ariaLabel: 'Review Inspect node' }];
const edges: Edge[] = [{ id: 'plan-inspect', source: 'plan', target: 'inspect' }];
const files: Readonly<Record<string, string>> = { 'src/review.ts': '// Fixture source displayed as text only\nexport const review = "local";', 'src/unsafe.ts': '<script>globalThis.executed = true</script>\n// inert source text, never executed' };
export function DeveloperStartup() {
    const [lifetime] = useState(() => createAdminPresentationSession('context-a', 'source-a', ['inspector']));
    const [context, setContext] = useState('context-a'), [source, setSource] = useState('source-a'), [selectedFile, setFile] = useState('src/review.ts'), [expanded, setExpanded] = useState(new Set(['src'])), [draft, setDraft] = useState(''), [focus, setFocus] = useState({ kind: 'file', key: 'src/review.ts' }), [inspector, setInspector] = useState('No inspector outcome'), [nodes, setNodes] = useState(initialNodes);
    const held = useRef<(() => void)[]>([]), revision = useRef(0);
    useEffect(() => () => { lifetime.dispose(); held.current = []; }, [lifetime]);
    function invalidate() { lifetime.begin('inspector').cancel(); setInspector('No inspector outcome'); }
    function selectFile(path: string) { if (!(path in files))
        return; invalidate(); setFile(path); setDraft(''); setFocus({ kind: 'file', key: path }); }
    function selectNode(id: string) { if (!nodes.some(node => node.id === id))
        return; invalidate(); setFocus({ kind: 'node', key: id }); }
    function changeNodes(changes: NodeChange<ReviewGraphNode>[]) { const selections = changes.filter(change => change.type === 'select'); setNodes(previous => applyNodeChanges(selections, previous)); const selected = selections.find(change => change.type === 'select' && change.selected); if (selected)
        selectNode(selected.id);
    else if (selections.some(change => change.type === 'select' && !change.selected && change.id === focus.key)) {
        invalidate();
        setFocus({ kind: 'file', key: selectedFile });
    } }
    function inspect() { const ticket = lifetime.begin('inspector'), target = { ...focus }, stamp = { context, source }, preview = draft; setInspector('Inspector pending'); held.current.push(() => ticket.commit(() => setInspector(`Fixture inspector: ${target.kind} ${target.key}; ${stamp.context}/${stamp.source}; draft ${preview ? 'present' : 'absent'}`))); }
    function retire(kind: 'context' | 'source') { const version = ++revision.current, nextContext = kind === 'context' ? `context-${version}` : context, nextSource = kind === 'source' ? `source-${version}` : source; lifetime.reset(nextContext, nextSource); setContext(nextContext); setSource(nextSource); setFile('src/review.ts'); setExpanded(new Set(['src'])); setDraft(''); setFocus({ kind: 'file', key: 'src/review.ts' }); setNodes(initialNodes()); setInspector('No inspector outcome'); }
    return <main className="p-4 space-y-4"><h1>Controlled developer and workflow proof</h1><p>Local selection, draft and inspector review only. No code/workflow execution or persistence.</p><p>Developer context: {context}; source: {source}</p><nav aria-label="Developer fixture controls"><button onClick={inspect}>Inspect current selection</button><button onClick={() => held.current.shift()?.()}>Release developer inspector</button><button onClick={() => retire('context')}>Switch developer context</button><button onClick={() => retire('source')}>Retire developer source</button></nav>
 <p role="status" aria-label="Developer inspector">{inspector}</p><p>Focused review: {focus.kind} {focus.key}</p><div className="developer-layout"><section aria-label="Controlled file review"><FileTree expanded={expanded} onExpandedChange={setExpanded} selectedPath={selectedFile} onSelect={selectFile}><FileTreeFolder path="src" name="src"><FileTreeFile path="src/review.ts" name="review.ts"/><FileTreeFile path="src/unsafe.ts" name="unsafe.ts"/></FileTreeFolder></FileTree><label>Local code draft<Textarea aria-label="Local code draft" value={draft} onChange={event => { invalidate(); setDraft(event.target.value); }}/></label><CodeBlock code={draft || files[selectedFile]} language="typescript"><CodeBlockCopyButton aria-label="Copy fixture source"/></CodeBlock><StackTrace trace={'Error: fixture review\n    at inspect (src/review.ts:2:1)\n    unknown fixture frame'} defaultOpen onFilePathClick={selectFile}><StackTraceHeader>Fixture stack trace</StackTraceHeader><StackTraceFrames /></StackTrace></section>
 <section aria-label="Controlled workflow review"><p>Fixed graph: {nodes.length} nodes, {edges.length} edge. Read-only review.</p><div className="h-96 min-w-0" aria-label="Workflow canvas"><Canvas key={`${context}:${source}`} nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={changeNodes} onNodeClick={(_event, node) => selectNode(node.id)} nodesDraggable={false} nodesConnectable={false} edgesReconnectable={false} deleteKeyCode={null} ariaLabelConfig={{ 'node.a11yDescription.default': 'Review nodes with keyboard selection only.' }}><Controls position="bottom-right" showInteractive={false}/></Canvas></div></section></div></main>;
}
