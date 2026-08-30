import { normalizeArchifyMermaidSource } from "./mermaid-source.mjs";

const HEADER = /^(?:graph|flowchart)\s+(TB|TD|BT|LR|RL)\b/i;
const SEQUENCE_HEADER = /^sequenceDiagram\b/i;
const UNSUPPORTED_HEADER = /^(?:sequenceDiagram|stateDiagram(?:-v2)?|classDiagram|erDiagram|gantt|pie|journey|gitGraph|mindmap|timeline|quadrantChart|xychart-beta|sankey-beta)\b/i;
const COSMETIC_LINE = /^(?:style|classDef|class|linkStyle|click|accTitle|accDescr)\b/i;
const IDENTIFIER = /^([A-Za-z0-9_][A-Za-z0-9_.:-]*)/;
const MAX_NODES = 48;
const MAX_CONNECTIONS = 96;
const MAX_SEQUENCE_PARTICIPANTS = 14;
const MAX_SEQUENCE_MESSAGES = 64;

function unsupported(reason, detail = "") {
  return { supported: false, reason, ...(detail ? { detail } : {}) };
}

function unquote(value) {
  const text = value.trim();
  if ((text.startsWith('"') && text.endsWith('"')) || (text.startsWith("'") && text.endsWith("'"))) {
    return text.slice(1, -1);
  }
  return text;
}

function decodeText(value) {
  const entity = (match, name) => {
    const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
    if (name in named) return named[name];
    if (/^#x[\da-f]+$/i.test(name)) return String.fromCodePoint(Number.parseInt(name.slice(2), 16));
    if (/^#\d+$/.test(name)) return String.fromCodePoint(Number(name.slice(1)));
    return match;
  };
  return unquote(value)
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&([#\w]+);/g, entity)
    .replace(/\\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+|[ \t]+\n/g, "\n")
    .trim();
}

function truncate(value, maximum) {
  const characters = [...value];
  return characters.length <= maximum ? value : `${characters.slice(0, maximum - 1).join("")}…`;
}

function splitOutside(value, separator) {
  const parts = [];
  let start = 0;
  let quote = "";
  const depth = { "[": 0, "(": 0, "{": 0 };
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote) {
      if (character === quote && value[index - 1] !== "\\") quote = "";
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      continue;
    }
    if (character === "[") depth["["] += 1;
    else if (character === "]") depth["["] = Math.max(0, depth["["] - 1);
    else if (character === "(") depth["("] += 1;
    else if (character === ")") depth["("] = Math.max(0, depth["("] - 1);
    else if (character === "{") depth["{"] += 1;
    else if (character === "}") depth["{"] = Math.max(0, depth["{"] - 1);
    else if (character === separator && Object.values(depth).every((value) => value === 0)) {
      parts.push(value.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(value.slice(start));
  return parts.map((part) => part.trim()).filter(Boolean);
}

function parseNodeExpression(raw) {
  const value = raw.trim().replace(/:::[A-Za-z0-9_-]+\s*$/, "").trim();
  const identifier = value.match(IDENTIFIER)?.[1];
  if (!identifier) return null;
  const rest = value.slice(identifier.length).trim();
  if (!rest) return { sourceId: identifier, label: identifier, shape: "default" };

  const shapes = [
    [/^\[\(([\s\S]*)\)\]$/, "database"],
    [/^\[\[([\s\S]*)\]\]$/, "subroutine"],
    [/^\(\(([\s\S]*)\)\)$/, "circle"],
    [/^\{\{([\s\S]*)\}\}$/, "hexagon"],
    [/^\[\/([\s\S]*)\/\]$/, "io"],
    [/^\[\\([\s\S]*)\\\]$/, "io"],
    [/^\[([\s\S]*)\]$/, "box"],
    [/^\(([\s\S]*)\)$/, "round"],
    [/^\{([\s\S]*)\}$/, "decision"],
  ];
  for (const [pattern, shape] of shapes) {
    const match = rest.match(pattern);
    if (match) return { sourceId: identifier, label: decodeText(match[1]), shape };
  }
  return null;
}

function parseEndpointGroup(raw) {
  return splitOutside(raw, "&").map(parseNodeExpression).filter(Boolean);
}

function subgraphLabel(raw, index) {
  const value = raw.trim();
  if (!value) return `Group ${index}`;
  const named = value.match(/^[A-Za-z0-9_.:-]+\s*\[([\s\S]+)\]$/);
  return truncate(decodeText(named?.[1] || value.replace(/^[A-Za-z0-9_.:-]+\s+(?=["'])/, "")), 56) || `Group ${index}`;
}

function componentType(node) {
  if (node.shape === "database" || /(?:db|database|sqlite|postgres|mysql|redis|chroma|store|storage|cache)/i.test(`${node.sourceId} ${node.label}`)) return "database";
  if (/(?:queue|bus|broker|stream|event|message|mcp)/i.test(`${node.sourceId} ${node.label}`)) return "messagebus";
  if (/(?:auth|security|policy|guard|approval|vault|permission)/i.test(`${node.sourceId} ${node.label}`)) return "security";
  if (/(?:cloud|cdn|s3|external api|github|provider)/i.test(`${node.sourceId} ${node.label}`)) return "cloud";
  if (/(?:user|client|customer|contributor|community|channel)/i.test(`${node.sourceId} ${node.label}`)) return "external";
  if (/(?:ui|browser|frontend|view|render|dashboard|page|slide)/i.test(`${node.sourceId} ${node.label}`)) return "frontend";
  return "backend";
}

function archifyId(sourceId, usedIds) {
  let value = sourceId.replace(/[^A-Za-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!/^[A-Za-z]/.test(value)) value = `node-${value || "item"}`;
  const base = value;
  let suffix = 2;
  while (usedIds.has(value)) value = `${base}-${suffix++}`;
  usedIds.add(value);
  return value;
}

function layoutNodes(nodes, edges, direction, boundaries = []) {
  const order = new Map(nodes.map((node, index) => [node.sourceId, index]));
  const indegree = new Map(nodes.map((node) => [node.sourceId, 0]));
  const outgoing = new Map(nodes.map((node) => [node.sourceId, []]));
  for (const edge of edges) {
    if (edge.from === edge.to) continue;
    outgoing.get(edge.from)?.push(edge.to);
    indegree.set(edge.to, (indegree.get(edge.to) || 0) + 1);
  }
  const queue = nodes.filter((node) => indegree.get(node.sourceId) === 0).map((node) => node.sourceId);
  const depth = new Map(nodes.map((node) => [node.sourceId, 0]));
  const visited = new Set();
  while (queue.length) {
    queue.sort((left, right) => (order.get(left) || 0) - (order.get(right) || 0));
    const source = queue.shift();
    visited.add(source);
    for (const target of outgoing.get(source) || []) {
      depth.set(target, Math.max(depth.get(target) || 0, (depth.get(source) || 0) + 1));
      indegree.set(target, (indegree.get(target) || 0) - 1);
      if (indegree.get(target) === 0) queue.push(target);
    }
  }

  // Strongly connected repository diagrams (message channels and a delivery
  // loop are common) do not have a useful topological rank. When the authored
  // Mermaid already supplies non-overlapping subgraphs, use those semantic
  // groups as bands rather than collapsing the whole cycle into one strip.
  if (boundaries.length >= 2) {
    const groups = boundaries.map((boundary) => nodes.filter((node) => boundary.nodes.has(node.sourceId)));
    const assigned = new Set(groups.flatMap((group) => group.map((node) => node.sourceId)));
    const ungrouped = nodes.filter((node) => !assigned.has(node.sourceId));
    if (ungrouped.length) groups.push(ungrouped);
    const maximumSize = Math.max(1, ...groups.map((group) => group.length));
    const vertical = ["TB", "TD", "BT"].includes(direction);
    const positions = new Map();
    groups.forEach((group, groupIndex) => group.forEach((node, itemIndex) => {
      const centered = itemIndex + (maximumSize - group.length) / 2;
      let x = vertical ? 90 + centered * 312 : 90 + groupIndex * 344;
      let y = vertical ? 100 + groupIndex * 184 : 100 + centered * 164;
      if (direction === "BT") y *= -1;
      if (direction === "RL") x *= -1;
      positions.set(node.sourceId, [x, y]);
    }));
    return positions;
  }
  // Cycles retain declaration order in one final band instead of inventing
  // reachability that is not present in the Mermaid topology.
  const maximumDepth = Math.max(0, ...depth.values());
  nodes.filter((node) => !visited.has(node.sourceId)).forEach((node) => depth.set(node.sourceId, maximumDepth + 1));

  const bands = new Map();
  for (const node of nodes) {
    const band = depth.get(node.sourceId) || 0;
    bands.set(band, [...(bands.get(band) || []), node.sourceId]);
  }
  const maximumBandSize = Math.max(1, ...[...bands.values()].map((items) => items.length));
  const maximumPerBand = Math.min(6, maximumBandSize);
  const vertical = ["TB", "TD", "BT"].includes(direction);
  const bandStarts = new Map();
  let bandCursor = 0;
  for (const band of [...bands.keys()].sort((left, right) => left - right)) {
    bandStarts.set(band, bandCursor);
    bandCursor += Math.max(1, Math.ceil((bands.get(band)?.length || 1) / maximumPerBand));
  }

  return new Map(nodes.map((node) => {
    const band = depth.get(node.sourceId) || 0;
    const items = bands.get(band) || [];
    const within = items.indexOf(node.sourceId);
    const wrap = Math.floor(within / maximumPerBand);
    const slot = within % maximumPerBand;
    const centeredOffset = (maximumPerBand - Math.min(maximumPerBand, items.length - wrap * maximumPerBand)) * 0.5;
    let x;
    let y;
    if (vertical) {
      x = 90 + (slot + centeredOffset) * 312;
      y = 100 + ((bandStarts.get(band) || 0) + wrap) * 164;
      if (direction === "BT") y *= -1;
    } else {
      x = 90 + ((bandStarts.get(band) || 0) + wrap) * 310;
      y = 100 + (slot + centeredOffset) * 164;
      if (direction === "RL") x *= -1;
    }
    return [node.sourceId, [x, y]];
  }));
}

function normalizeCoordinates(positions) {
  const values = [...positions.values()];
  const minimumX = Math.min(...values.map(([x]) => x));
  const minimumY = Math.min(...values.map(([, y]) => y));
  if (minimumX >= 60 && minimumY >= 80) return positions;
  const dx = 80 - minimumX;
  const dy = 100 - minimumY;
  return new Map([...positions].map(([id, [x, y]]) => [id, [x + dx, y + dy]]));
}

function fitArchitectureGeometry(components, connections) {
  const componentPoints = components.flatMap((component) => [
    [component.pos[0], component.pos[1]],
    [component.pos[0] + component.size[0], component.pos[1] + component.size[1]],
  ]);
  const routePoints = connections.flatMap((connection) => [
    ...(connection.via || []),
    ...(connection.labelAt ? [connection.labelAt] : []),
  ]);
  const points = [...componentPoints, ...routePoints];
  const minimumX = Math.min(...points.map(([x]) => x));

  // Archify's automatic architecture viewBox measures components and
  // boundaries, while a deliberately routed Mermaid relationship may use an
  // outer corridor. Move the complete authored geometry together when that
  // corridor crosses the origin, then publish an explicit viewBox containing
  // both nodes and routes. This keeps the renderer authoritative without
  // allowing a valid edge to be clipped outside its canvas.
  const shiftX = Math.max(0, 32 - minimumX);
  if (shiftX) {
    components.forEach((component) => { component.pos[0] += shiftX; });
    connections.forEach((connection) => {
      connection.via?.forEach((point) => { point[0] += shiftX; });
      if (connection.labelAt) connection.labelAt[0] += shiftX;
    });
  }

  const shiftedPoints = [
    ...components.flatMap((component) => [
      [component.pos[0], component.pos[1]],
      [component.pos[0] + component.size[0], component.pos[1] + component.size[1]],
    ]),
    ...connections.flatMap((connection) => [
      ...(connection.via || []),
      ...(connection.labelAt ? [connection.labelAt] : []),
    ]),
  ];
  const maximumX = Math.max(...shiftedPoints.map(([x]) => x));
  const maximumY = Math.max(...shiftedPoints.map(([, y]) => y));
  const roundCanvas = (value) => Math.ceil(value / 20) * 20;
  return [
    Math.max(640, roundCanvas(maximumX + 64)),
    Math.max(480, roundCanvas(maximumY + 88)),
  ];
}

/**
 * Convert the conservative, lossless subset of Mermaid sequenceDiagram:
 * participant/actor declarations plus ordered point-to-point messages. Blocks,
 * notes, activation shorthand and destroyed participants are rejected rather
 * than represented as a different interaction.
 */
export function mermaidSequenceToArchify(source, { title = "Interaction sequence", repository = "" } = {}) {
  const normalized = normalizeArchifyMermaidSource(source);
  const lines = normalized.split("\n");
  const firstLineIndex = lines.findIndex((line) => line.trim() && !line.trim().startsWith("%%"));
  const firstLine = lines[firstLineIndex]?.trim() || "";
  if (!SEQUENCE_HEADER.test(firstLine)) return unsupported("unsupported-mermaid-type", firstLine || "missing header");

  const participants = new Map();
  const messages = [];
  const unparsed = [];
  const registerParticipant = (sourceId, label = sourceId, kind = "participant") => {
    const current = participants.get(sourceId);
    if (!current) participants.set(sourceId, { sourceId, label: decodeText(label) || sourceId, kind });
    else if (label !== sourceId) {
      current.label = decodeText(label) || sourceId;
      current.kind = kind;
    }
  };

  for (let index = firstLineIndex + 1; index < lines.length; index += 1) {
    const line = lines[index].trim().replace(/;$/, "").trim();
    if (!line || line.startsWith("%%") || /^autonumber$/i.test(line)) continue;
    const declaration = line.match(/^(participant|actor)\s+([A-Za-z][\w.:-]*)(?:\s+as\s+(.+))?$/i);
    if (declaration) {
      registerParticipant(declaration[2], declaration[3] || declaration[2], declaration[1].toLowerCase());
      continue;
    }
    const message = line.match(/^([A-Za-z][\w.:-]*?)\s*(-->>|->>|-->|->|--\)|-\))\s*([A-Za-z][\w.:-]*)\s*:\s*(.+)$/);
    if (message) {
      const [, from, arrow, to, rawLabel] = message;
      const label = truncate(decodeText(rawLabel), 72);
      if (!label) {
        unparsed.push(`line ${index + 1}: empty message label`);
        continue;
      }
      registerParticipant(from);
      registerParticipant(to);
      messages.push({ from, to, label, arrow });
      continue;
    }
    unparsed.push(`line ${index + 1}: unsupported sequence statement`);
  }

  if (unparsed.length) return unsupported("unsupported-sequence-syntax", unparsed.slice(0, 4).join("; "));
  if (participants.size < 2 || !messages.length) return unsupported("insufficient-topology", "sequence must contain participants and messages");
  if (participants.size > MAX_SEQUENCE_PARTICIPANTS || messages.length > MAX_SEQUENCE_MESSAGES) {
    return unsupported("diagram-too-large", `${participants.size} participants, ${messages.length} messages`);
  }

  const usedIds = new Set();
  const idMap = new Map([...participants.values()].map((participant) => [participant.sourceId, archifyId(participant.sourceId, usedIds)]));
  const participantItems = [...participants.values()].map((participant) => ({
    id: idMap.get(participant.sourceId),
    type: participant.kind === "actor" ? "external" : componentType(participant),
    label: truncate(participant.label, 40),
  }));
  const messageItems = messages.map((message, index) => ({
    id: `message-${index + 1}`,
    from: idMap.get(message.from),
    to: idMap.get(message.to),
    y: 180 + index * 50,
    label: message.label,
    variant: message.arrow.startsWith("--") ? "return" : message.arrow.endsWith(")") ? "dashed" : "default",
  }));

  return {
    supported: true,
    type: "sequence",
    ir: {
      schema_version: 1,
      diagram_type: "sequence",
      meta: {
        title: truncate(title || `${repository} sequence`, 80),
        locale: /[\u3400-\u9fff]/u.test(`${title} ${normalized}`) ? "zh-CN" : "en",
        visual_preset: "editorial",
        animation: "none",
        subtitle: repository ? `ZRead · ${repository}` : "ZRead repository documentation",
        viewBox: [Math.max(640, participantItems.length * 194 + 120), Math.max(480, 260 + messageItems.length * 50)],
        ...(participantItems.length > 4 ? { column_fit: "spread" } : {}),
      },
      participants: participantItems,
      messages: messageItems,
    },
  };
}

export function mermaidToArchify(source, options = {}) {
  const normalized = normalizeArchifyMermaidSource(source);
  const firstLine = normalized.split("\n").find((line) => line.trim() && !line.trim().startsWith("%%"))?.trim() || "";
  if (SEQUENCE_HEADER.test(firstLine)) return mermaidSequenceToArchify(normalized, options);
  return mermaidFlowchartToArchify(normalized, options);
}

/**
 * Read flowchart topology and author a fresh Archify architecture IR. Mermaid
 * layout/style directives are intentionally discarded; Archify owns layout,
 * semantic component types, boundaries, routing and the final visual language.
 */
export function mermaidFlowchartToArchify(source, { title = "Repository architecture", repository = "" } = {}) {
  const normalized = normalizeArchifyMermaidSource(source);
  const lines = normalized.split("\n");
  const firstLineIndex = lines.findIndex((line) => line.trim() && !line.trim().startsWith("%%"));
  const firstLine = lines[firstLineIndex]?.trim() || "";
  if (UNSUPPORTED_HEADER.test(firstLine)) return unsupported("unsupported-mermaid-type", firstLine.split(/\s/)[0]);
  const header = firstLine.match(HEADER);
  if (!header) return unsupported("unsupported-mermaid-type", firstLine || "missing header");
  const direction = header[1].toUpperCase();
  const nodes = new Map();
  const edges = [];
  const boundaries = [];
  const boundaryStack = [];
  const unparsed = [];

  const registerNode = (parsed) => {
    const existing = nodes.get(parsed.sourceId);
    if (!existing) nodes.set(parsed.sourceId, { ...parsed, declaration: nodes.size });
    else if (parsed.label !== parsed.sourceId) {
      existing.label = parsed.label;
      existing.shape = parsed.shape;
    }
    for (const boundary of boundaryStack) boundary.nodes.add(parsed.sourceId);
    return parsed.sourceId;
  };

  for (let index = firstLineIndex + 1; index < lines.length; index += 1) {
    let line = lines[index].trim();
    if (!line || line.startsWith("%%")) continue;
    line = line.replace(/\s+%%.*$/, "").trim();
    if (!line) continue;
    if (/^subgraph\b/i.test(line)) {
      const raw = line.replace(/^subgraph\s*/i, "");
      const boundary = { label: subgraphLabel(raw, boundaries.length + 1), nodes: new Set() };
      boundaries.push(boundary);
      boundaryStack.push(boundary);
      continue;
    }
    if (/^end\s*;?$/i.test(line)) {
      if (!boundaryStack.length) unparsed.push(`line ${index + 1}: unmatched end`);
      else boundaryStack.pop();
      continue;
    }
    if (/^direction\s+(?:TB|TD|BT|LR|RL)\b/i.test(line) || COSMETIC_LINE.test(line)) continue;

    line = line
      .replace(/\s+--\s+"([^"\n]+)"\s+-->\s+/g, " -->|$1| ")
      .replace(/\s+--\s+'([^'\n]+)'\s+-->\s+/g, " -->|$1| ");
    const arrowPattern = /(-->|---|-\.->|==>|~~~)(?:\|([^|\n]*)\|)?/g;
    const arrowMatches = [...line.matchAll(arrowPattern)];
    if (!arrowMatches.length) {
      const parsed = parseNodeExpression(line.replace(/;$/, ""));
      if (parsed) registerNode(parsed);
      else unparsed.push(`line ${index + 1}: unsupported statement`);
      continue;
    }

    const endpoints = [];
    let cursor = 0;
    for (const match of arrowMatches) {
      endpoints.push(line.slice(cursor, match.index));
      cursor = match.index + match[0].length;
    }
    endpoints.push(line.slice(cursor).replace(/;$/, ""));
    if (endpoints.length !== arrowMatches.length + 1) {
      unparsed.push(`line ${index + 1}: malformed relationship`);
      continue;
    }
    const groups = endpoints.map(parseEndpointGroup);
    if (groups.some((group) => !group.length)) {
      unparsed.push(`line ${index + 1}: unsupported relationship endpoint`);
      continue;
    }
    groups.flat().forEach(registerNode);
    for (let edgeIndex = 0; edgeIndex < arrowMatches.length; edgeIndex += 1) {
      const arrow = arrowMatches[edgeIndex][1];
      if (arrow === "~~~") continue;
      const label = truncate(decodeText(arrowMatches[edgeIndex][2] || ""), 52);
      for (const from of groups[edgeIndex]) {
        for (const to of groups[edgeIndex + 1]) {
          edges.push({
            from: from.sourceId,
            to: to.sourceId,
            label,
            variant: arrow === "==>" ? "emphasis" : arrow === "-.->" || arrow === "---" ? "dashed" : "default",
          });
        }
      }
    }
  }

  if (boundaryStack.length) unparsed.push(`${boundaryStack.length} unclosed subgraph(s)`);
  if (unparsed.length) return unsupported("unsupported-flowchart-syntax", unparsed.slice(0, 4).join("; "));
  if (!nodes.size || !edges.length) return unsupported("insufficient-topology", "flowchart must contain nodes and relationships");
  if (nodes.size > MAX_NODES || edges.length > MAX_CONNECTIONS) {
    return unsupported("diagram-too-large", `${nodes.size} nodes, ${edges.length} relationships`);
  }

  const nodeList = [...nodes.values()];
  const usedIds = new Set();
  const idMap = new Map(nodeList.map((node) => [node.sourceId, archifyId(node.sourceId, usedIds)]));
  const positions = normalizeCoordinates(layoutNodes(nodeList, edges, direction, boundaries));
  const components = nodeList.map((node) => {
    const parts = decodeText(node.label || node.sourceId).split("\n").filter(Boolean);
    const labelWidth = [...(parts[0] || node.sourceId)].length * 7 + 32;
    const sublabelWidth = [...parts.slice(1).join(" · ")].length * 6 + 32;
    return {
      id: idMap.get(node.sourceId),
      type: componentType(node),
      label: truncate(parts[0] || node.sourceId, 40),
      ...(parts.length > 1 ? { sublabel: truncate(parts.slice(1).join(" · "), 76) } : {}),
      pos: positions.get(node.sourceId),
      size: [Math.min(268, Math.max(176, labelWidth, sublabelWidth)), parts.length > 1 ? 76 : 64],
    };
  });
  const componentsBySourceId = new Map(nodeList.map((node, index) => [node.sourceId, components[index]]));
  const outerLeft = Math.min(...components.map((component) => component.pos[0])) - 74;
  const outerRight = Math.max(...components.map((component) => component.pos[0] + component.size[0])) + 74;
  const outerTop = Math.min(...components.map((component) => component.pos[1])) - 68;
  const outerBottom = Math.max(...components.map((component) => component.pos[1] + component.size[1])) + 68;
  const diagramCenterX = (outerLeft + outerRight) / 2;
  const diagramCenterY = (outerTop + outerBottom) / 2;
  const connections = edges.map((edge, index) => {
    const from = componentsBySourceId.get(edge.from);
    const to = componentsBySourceId.get(edge.to);
    const [fromX, fromY] = from.pos;
    const [toX, toY] = to.pos;
    const [fromWidth, fromHeight] = from.size;
    const [toWidth] = to.size;
    const fromCenter = [fromX + fromWidth / 2, fromY + fromHeight / 2];
    const toCenter = [toX + toWidth / 2, toY + to.size[1] / 2];
    const dx = toCenter[0] - fromCenter[0];
    const dy = toCenter[1] - fromCenter[1];
    const declaredVertical = ["TB", "TD", "BT"].includes(direction);
    const verticalRelationship = declaredVertical
      ? Math.abs(dy) >= 80
      : Math.abs(dx) < 100 && Math.abs(dy) >= 80;
    const longRelationship = verticalRelationship ? Math.abs(dy) > 230 : Math.abs(dx) > 390;
    let route = {};
    let labelAt;
    if (verticalRelationship) {
      const downward = dy >= 0;
      const fromSide = downward ? "bottom" : "top";
      const toSide = downward ? "top" : "bottom";
      if (longRelationship) {
        const useLeft = fromCenter[0] <= diagramCenterX;
        const corridorX = useLeft ? outerLeft - (index % 4) * 26 : outerRight + (index % 4) * 26;
        const startY = downward ? fromY + fromHeight + 30 : fromY - 30;
        const endY = downward ? toY - 30 : toY + to.size[1] + 30;
        route = {
          fromSide,
          toSide,
          via: [
            [fromCenter[0], startY],
            [corridorX, startY],
            [corridorX, endY],
            [toCenter[0], endY],
          ],
        };
        labelAt = [corridorX + (index % 2 ? 18 : -18), (startY + endY) / 2];
      } else {
        const midpointY = (fromCenter[1] + toCenter[1]) / 2;
        route = {
          fromSide,
          toSide,
          ...(Math.abs(dx) > 4 ? { via: [[fromCenter[0], midpointY], [toCenter[0], midpointY]] } : {}),
        };
        labelAt = [(fromCenter[0] + toCenter[0]) / 2 + (index % 2 ? 22 : -22), (fromCenter[1] + toCenter[1]) / 2];
      }
    } else {
      const rightward = dx >= 0;
      const fromSide = rightward ? "right" : "left";
      const toSide = rightward ? "left" : "right";
      if (longRelationship) {
        const sameBand = Math.abs(dy) < 100;
        const useTop = fromCenter[1] <= diagramCenterY;
        const corridorY = sameBand
          ? Math.max(fromY + fromHeight, toY + to.size[1]) + 34 + (index % 3) * 10
          : useTop ? outerTop - (index % 4) * 24 : outerBottom + (index % 4) * 24;
        const startX = rightward ? fromX + fromWidth + 30 : fromX - 30;
        const endX = rightward ? toX - 30 : toX + toWidth + 30;
        route = {
          fromSide,
          toSide,
          via: [
            [startX, fromCenter[1]],
            [startX, corridorY],
            [endX, corridorY],
            [endX, toCenter[1]],
          ],
        };
        labelAt = [(startX + endX) / 2, corridorY + (index % 2 ? 18 : -18)];
      } else {
        const midpointX = (fromCenter[0] + toCenter[0]) / 2;
        route = {
          fromSide,
          toSide,
          ...(Math.abs(dy) > 4 ? { via: [[midpointX, fromCenter[1]], [midpointX, toCenter[1]]] } : {}),
        };
        labelAt = [
          (fromCenter[0] + toCenter[0]) / 2,
          index % 2 ? Math.max(fromY + fromHeight, toY + to.size[1]) + 24 : Math.min(fromY, toY) - 24,
        ];
      }
    }
    return {
      id: `edge-${index + 1}`,
      from: idMap.get(edge.from),
      to: idMap.get(edge.to),
      ...(edge.label ? { label: edge.label, labelAt } : {}),
      ...(edge.variant !== "default" ? { variant: edge.variant } : {}),
      ...route,
    };
  });
  const archifyBoundaries = boundaries
    .map((boundary) => ({
      kind: "region",
      label: boundary.label,
      wraps: [...boundary.nodes].map((sourceId) => idMap.get(sourceId)).filter(Boolean),
      pad: 24,
    }))
    .filter((boundary) => boundary.wraps.length);
  const viewBox = fitArchitectureGeometry(components, connections);

  return {
    supported: true,
    type: "architecture",
    ir: {
      schema_version: 1,
      diagram_type: "architecture",
      meta: {
        title: truncate(title || `${repository} architecture`, 80),
        locale: /[\u3400-\u9fff]/u.test(`${title} ${normalized}`) ? "zh-CN" : "en",
        visual_preset: "editorial",
        animation: "none",
        subtitle: repository ? `ZRead · ${repository}` : "ZRead repository documentation",
        viewBox,
      },
      components,
      ...(archifyBoundaries.length ? { boundaries: archifyBoundaries } : {}),
      connections,
    },
  };
}
