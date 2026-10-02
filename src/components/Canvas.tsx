import { useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ConnectionMode,
  useNodesState,
  type NodeChange,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useProjectStore } from "../store/useProjectStore";
import { useUiStore } from "../store/useUiStore";
import { deviceTypes } from "../lib/deviceTypes";
import type { DeviceTypeId } from "../types";
import { nodeTypes, edgeTypes, sceneNodes, sceneEdges } from "./scene";
export function Canvas() {
  const state = useProjectStore(),
    tab = state.tabs.find((t) => t.id === state.activeTabId)!;
  const ui = useUiStore();
  const flow = useReactFlow();
  const source = useMemo(() => sceneNodes(tab, state.meta), [tab, state.meta]);
  const [nodes, setNodes, onNodesChange] = useNodesState(source);
  useEffect(() => {
    setNodes((current) => {
      const active = useUiStore.getState().selected;
      const selected = new Set(
        active
          ? [active, ...current.filter((n) => n.selected).map((n) => n.id)]
          : [],
      );
      const previous = new Map(current.map((node) => [node.id, node]));
      return source.map((n) => {
        const prior = previous.get(n.id);
        return {
          ...n,
          measured: prior && prior.type === n.type ? prior.measured : undefined,
          selected: n.selectable !== false && selected.has(n.id),
        };
      });
    });
  }, [source, setNodes]);
  useEffect(() => {
    if (ui.focusId) {
      const n = flow.getNode(ui.focusId);
      if (n)
        void flow.fitView({
          nodes: [n],
          padding: 1,
          duration: 350,
          maxZoom: 1,
        });
    }
  }, [ui.focusId, flow]);
  useEffect(() => {
    const timer = setTimeout(() => void flow.fitView({ padding: 0.18 }), 100);
    return () => clearTimeout(timer);
  }, [tab.id, flow]);
  const edges = sceneEdges(tab, ui.selected);
  return (
    <main className="canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={(changes: NodeChange[]) => {
          onNodesChange(changes);
          const current = useProjectStore.getState();
          if (current.activeTabId !== tab.id) return;
          const active = current.tabs.find((item) => item.id === tab.id);
          if (!active) return;
          const positions = new Map<string, { x: number; y: number }>();
          for (const change of changes)
            if (change.type === "position" && change.dragging === false && change.position !== undefined)
              positions.set(change.id, change.position);
          if (!positions.size) return;
          let changed = false;
          const devices = active.devices.map((device) => {
            const position = positions.get(device.id);
            if (!position || (device.x === position.x && device.y === position.y)) return device;
            changed = true;
            return { ...device, x: position.x, y: position.y };
          });
          const segments = active.segments.map((segment) => {
            const position = positions.get(segment.id);
            if (!position || (segment.x === position.x && segment.y === position.y)) return segment;
            changed = true;
            return { ...segment, x: position.x, y: position.y };
          });
          if (changed) current.updateTab({ ...active, devices, segments });
        }}
        connectionMode={ConnectionMode.Loose}
        minZoom={0.08}
        maxZoom={2}
        fitView
        deleteKeyCode={["Backspace", "Delete"]}
        onConnect={(c) =>
          state.addLink({
            from: c.source,
            to: c.target,
            sourceHandle: c.sourceHandle,
            targetHandle: c.targetHandle,
            vpn: false,
            redundant: false,
          })
        }
        onNodeClick={(_, n) => ui.select(n.id)}
        onEdgeClick={(_, e) => ui.select(e.id)}
        onPaneClick={() => ui.select(null)}
        onBeforeDelete={async ({ nodes, edges }) => {
          const selected = nodes.filter((n) => n.selected),
            ids = new Set(selected.map((n) => n.id));
          return {
            nodes: selected,
            edges: edges.filter(
              (e) => e.selected || ids.has(e.source) || ids.has(e.target),
            ),
          };
        }}
        onNodesDelete={(deleted) => {
          deleted.forEach((n) =>
            n.type === "segment"
              ? state.removeSegment(n.id)
              : state.removeDevice(n.id),
          );
          ui.select(null);
        }}
        onEdgesDelete={(deleted) =>
          deleted.forEach((e) => state.removeLink(e.id))
        }
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }}
        onDrop={(e) => {
          e.preventDefault();
          const type = e.dataTransfer.getData(
            "application/netgraph",
          ) as DeviceTypeId;
          if (!Object.hasOwn(deviceTypes, type)) return;
          const p = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
          const s = tab.segments.find(
            (s) =>
              p.x >= s.x &&
              p.x <= s.x + s.w &&
              p.y >= s.y + 50 &&
              p.y <= s.y + s.h,
          );
          state.addDevice({
            type,
            name: deviceTypes[type].label,
            segmentId: s?.id ?? null,
            x: s ? Math.max(0, Math.min(s.w - 140, p.x - s.x)) : p.x,
            y: s ? Math.max(55, p.y - s.y) : p.y,
          });
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <MiniMap
          position="top-right"
          style={{ width: 150, height: 100 }}
          pannable
          zoomable
        />
        <Controls />
      </ReactFlow>
      <div className="canvas-hint">
        핸들을 연결해 링크 추가 · 드래그로 위치 조정 · Delete로 삭제
      </div>
    </main>
  );
}
