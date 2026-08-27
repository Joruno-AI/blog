import dagre from '@dagrejs/dagre'
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from '@xyflow/react'
import { createRoot, type Root } from 'react-dom/client'
import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'

import '@xyflow/react/dist/style.css'
import './agent-dependency-graph.css'

export interface AgentDependencyItem {
  id: string
  name: string
  path: string
  dependencies: string[]
  workspace: boolean
}

export interface AgentDependencyGraphApi {
  destroy: () => void
  fit: () => void
  select: (id: string, focus?: boolean) => void
  zoomIn: () => void
  zoomOut: () => void
}

interface PackageNodeData extends Record<string, unknown> {
  label: string
  path: string
  workspace: boolean
}

type PackageNode = Node<PackageNodeData, 'package'>

interface GraphHandle {
  fit: () => void
  select: (id: string, focus?: boolean) => void
  zoomIn: () => void
  zoomOut: () => void
}

interface GraphProps {
  items: AgentDependencyItem[]
  onSelect: (id: string) => void
}

const NODE_WIDTH = 214
const NODE_HEIGHT = 68

function PackageNodeView({ data, selected }: NodeProps<PackageNode>) {
  const directory = data.path.replace(/\/package\.json$/, '') || '/'

  return (
    <div className={`agent-flow-node${selected ? ' is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <span aria-hidden="true" />
      <div>
        <strong title={data.label}>{data.label}</strong>
        <small title={directory}>{directory}</small>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  )
}

function layoutGraph(items: AgentDependencyItem[]) {
  const links = items.flatMap((item) =>
    item.dependencies
      .filter((dependency) =>
        items.some((candidate) => candidate.id === dependency)
      )
      .map((dependency) => ({ source: item.id, target: dependency }))
  )
  const linkedIds = new Set(
    links.flatMap(({ source, target }) => [source, target])
  )
  const linkedItems = items.filter((item) => linkedIds.has(item.id))
  const isolatedItems = items.filter((item) => !linkedIds.has(item.id))
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({
    rankdir: 'LR',
    align: 'UL',
    nodesep: 36,
    ranksep: 92,
    marginx: 42,
    marginy: 42,
  })

  linkedItems.forEach((item) =>
    graph.setNode(item.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  )
  links.forEach(({ source, target }) => graph.setEdge(source, target))
  if (linkedItems.length) dagre.layout(graph)

  const linkedPositions = new Map(
    linkedItems.map((item) => {
      const point = graph.node(item.id)
      return [
        item.id,
        {
          x: point.x - NODE_WIDTH / 2,
          y: point.y - NODE_HEIGHT / 2,
        },
      ] as const
    })
  )
  const linkedBounds = [...linkedPositions.values()].reduce(
    (bounds, position) => ({
      minX: Math.min(bounds.minX, position.x),
      maxX: Math.max(bounds.maxX, position.x + NODE_WIDTH),
      maxY: Math.max(bounds.maxY, position.y + NODE_HEIGHT),
    }),
    { minX: 0, maxX: 0, maxY: 0 }
  )
  const isolatedColumns = Math.min(
    4,
    Math.max(1, Math.ceil(Math.sqrt(isolatedItems.length)))
  )
  const isolatedGapX = 34
  const isolatedGapY = 30
  const isolatedWidth =
    isolatedColumns * NODE_WIDTH + (isolatedColumns - 1) * isolatedGapX
  const linkedWidth = linkedBounds.maxX - linkedBounds.minX
  const graphWidth = Math.max(linkedWidth, isolatedWidth)
  const linkedOffsetX = (graphWidth - linkedWidth) / 2 - linkedBounds.minX
  const isolatedOffsetX = (graphWidth - isolatedWidth) / 2
  const isolatedOffsetY = linkedItems.length ? linkedBounds.maxY + 86 : 0

  linkedPositions.forEach((position, id) => {
    linkedPositions.set(id, {
      x: position.x + linkedOffsetX,
      y: position.y,
    })
  })
  const isolatedPositions = new Map(
    isolatedItems.map((item, index) => [
      item.id,
      {
        x:
          isolatedOffsetX +
          (index % isolatedColumns) * (NODE_WIDTH + isolatedGapX),
        y:
          isolatedOffsetY +
          Math.floor(index / isolatedColumns) * (NODE_HEIGHT + isolatedGapY),
      },
    ])
  )

  const nodes: PackageNode[] = items.map((item) => {
    const position = linkedPositions.get(item.id) ??
      isolatedPositions.get(item.id) ?? { x: 0, y: 0 }
    return {
      id: item.id,
      type: 'package',
      position,
      data: {
        label: item.name,
        path: item.path,
        workspace: item.workspace,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    }
  })

  const edges: Edge[] = links.map(({ source, target }) => ({
    id: `${source}->${target}`,
    source,
    target,
    type: 'smoothstep',
    markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
  }))

  return { nodes, edges }
}

const DependencyGraph = forwardRef<GraphHandle, GraphProps>(
  function DependencyGraph({ items, onSelect }, ref) {
    const layout = useMemo(() => layoutGraph(items), [items])
    const [nodes, setNodes] = useState(layout.nodes)
    const instanceRef = useRef<ReactFlowInstance<PackageNode, Edge> | null>(
      null
    )

    useEffect(() => setNodes(layout.nodes), [layout.nodes])

    const fit = () =>
      instanceRef.current?.fitView({ padding: 0.18, duration: 260, maxZoom: 1 })

    const select = (id: string, focus = false) => {
      setNodes((current) =>
        current.map((node) => ({ ...node, selected: node.id === id }))
      )
      if (!focus) return
      const node = instanceRef.current?.getNode(id)
      if (node)
        void instanceRef.current?.fitView({
          nodes: [node],
          padding: 1.8,
          duration: 260,
          maxZoom: 1.15,
        })
    }

    useImperativeHandle(ref, () => ({
      fit,
      select,
      zoomIn: () => void instanceRef.current?.zoomIn({ duration: 180 }),
      zoomOut: () => void instanceRef.current?.zoomOut({ duration: 180 }),
    }))

    return (
      <ReactFlow<PackageNode, Edge>
        className="agent-dependency-flow"
        nodes={nodes}
        edges={layout.edges}
        nodeTypes={{ package: PackageNodeView }}
        onInit={(instance) => {
          instanceRef.current = instance
          window.requestAnimationFrame(fit)
        }}
        onNodeClick={(_, node) => {
          select(node.id)
          onSelect(node.id)
        }}
        nodesConnectable={false}
        nodesDraggable
        elementsSelectable
        panOnDrag
        zoomOnDoubleClick={false}
        minZoom={0.22}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
        fitView
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1}
          className="agent-flow-background"
        />
        <Controls
          position="bottom-left"
          showInteractive={false}
          className="agent-flow-controls"
        />
      </ReactFlow>
    )
  }
)

export function mountAgentDependencyGraph(
  container: HTMLElement,
  items: AgentDependencyItem[],
  onSelect: (id: string) => void
): AgentDependencyGraphApi {
  const root: Root = createRoot(container)
  const graphRef = { current: null as GraphHandle | null }

  root.render(
    createElement(DependencyGraph, {
      items,
      onSelect,
      ref: (value: GraphHandle | null) => {
        graphRef.current = value
      },
    })
  )

  return {
    destroy: () => root.unmount(),
    fit: () => graphRef.current?.fit(),
    select: (id, focus) => graphRef.current?.select(id, focus),
    zoomIn: () => graphRef.current?.zoomIn(),
    zoomOut: () => graphRef.current?.zoomOut(),
  }
}
