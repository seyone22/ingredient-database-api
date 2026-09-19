"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { DerivativeItem } from "@/types/types";
import {
  ArrowLeftRight,
  ChevronRight,
  ExternalLink,
  Flame,
  GitBranch,
  Info,
  Layers,
  LayoutGrid,
  Maximize2,
  Minimize2,
  Network,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  Utensils,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

export interface IngredientGraphExplorerProps {
  ingredientId: string;
  ingredientName: string;
  partOf?: string[];
  varieties?: string[];
  derivatives?: (DerivativeItem | string)[];
  substitutes?: string[];
  pairsWith?: string[];
  usedIn?: string[];
  className?: string;
}

export type LinkageCategoryKey =
  | "partOf"
  | "varieties"
  | "derivatives"
  | "substitutes"
  | "pairsWith"
  | "usedIn";

interface CategoryMeta {
  key: LinkageCategoryKey;
  label: string;
  shortLabel: string;
  relationDesc: string;
  baseAngle: number;
  color: string;
  strokeHex: string;
  bgRgba: string;
  badgeClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_DEFINITIONS: CategoryMeta[] = [
  {
    key: "partOf",
    label: "Parent Taxonomy",
    shortLabel: "Taxonomy",
    relationDesc: "Taxonomical ancestor / category",
    baseAngle: -Math.PI / 2, // Top (12 o'clock)
    color: "blue",
    strokeHex: "#3b82f6",
    bgRgba: "rgba(59, 130, 246, 0.12)",
    badgeClass:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    icon: Layers,
  },
  {
    key: "substitutes",
    label: "Lateral Substitutes",
    shortLabel: "Substitutes",
    relationDesc: "Culinary swap / alternative",
    baseAngle: (7 * Math.PI) / 6, // Upper Left (10 o'clock)
    color: "amber",
    strokeHex: "#f59e0b",
    bgRgba: "rgba(245, 158, 11, 0.12)",
    badgeClass:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    icon: ArrowLeftRight,
  },
  {
    key: "varieties",
    label: "Cultivars & Varieties",
    shortLabel: "Varieties",
    relationDesc: "Botanical variety / cultivar",
    baseAngle: (5 * Math.PI) / 6, // Lower Left (8 o'clock)
    color: "purple",
    strokeHex: "#a855f7",
    bgRgba: "rgba(168, 85, 247, 0.12)",
    badgeClass:
      "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    icon: GitBranch,
  },
  {
    key: "derivatives",
    label: "Culinary Derivatives",
    shortLabel: "Derivatives",
    relationDesc: "Processed form / derivative product",
    baseAngle: Math.PI / 2, // Bottom (6 o'clock)
    color: "emerald",
    strokeHex: "#10b981",
    bgRgba: "rgba(16, 185, 129, 0.12)",
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    icon: Sparkles,
  },
  {
    key: "usedIn",
    label: "Culinary Uses & Dishes",
    shortLabel: "Uses & Dishes",
    relationDesc: "Culinary preparation / dish",
    baseAngle: Math.PI / 6, // Lower Right (4 o'clock)
    color: "sky",
    strokeHex: "#0ea5e9",
    bgRgba: "rgba(14, 165, 233, 0.12)",
    badgeClass:
      "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
    icon: Utensils,
  },
  {
    key: "pairsWith",
    label: "Flavor Pairings",
    shortLabel: "Pairings",
    relationDesc: "Flavor synergy / affinity",
    baseAngle: -Math.PI / 6, // Upper Right (2 o'clock)
    color: "rose",
    strokeHex: "#f43f5e",
    bgRgba: "rgba(244, 63, 94, 0.12)",
    badgeClass:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
    icon: Flame,
  },
];

interface LeafNodeData {
  id: string;
  categoryKey: LinkageCategoryKey;
  categoryLabel: string;
  name: string;
  targetId?: string | null;
  process?: string | null;
  yieldRatio?: number | null;
  strokeHex: string;
  bgRgba: string;
  x: number;
  y: number;
  hubX: number;
  hubY: number;
  pillWidth: number;
}

interface HubNodeData {
  id: string;
  key: LinkageCategoryKey;
  label: string;
  shortLabel: string;
  relationDesc: string;
  strokeHex: string;
  bgRgba: string;
  x: number;
  y: number;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
}

export default function IngredientGraphExplorer({
  ingredientId,
  ingredientName,
  partOf = [],
  varieties = [],
  derivatives = [],
  substitutes = [],
  pairsWith = [],
  usedIn = [],
  className,
}: IngredientGraphExplorerProps) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // View state: graph vs matrix
  const [viewMode, setViewMode] = useState<"graph" | "matrix">("graph");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    LinkageCategoryKey | "all"
  >("all");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<
    LeafNodeData | HubNodeData | null
  >(null);

  // Zoom and Pan state for interactive canvas
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Deduplicate and clean inputs
  const cleanedVarieties = useMemo(() => {
    return Array.from(new Set(varieties.map((v) => v.trim()))).filter(
      (v) => Boolean(v) && v.toLowerCase() !== ingredientName.toLowerCase(),
    );
  }, [varieties, ingredientName]);

  const cleanedPartOf = useMemo(() => {
    return Array.from(new Set(partOf.map((p) => p.trim()))).filter(Boolean);
  }, [partOf]);

  const cleanedSubstitutes = useMemo(() => {
    return Array.from(new Set(substitutes.map((s) => s.trim()))).filter(
      Boolean,
    );
  }, [substitutes]);

  const cleanedPairsWith = useMemo(() => {
    return Array.from(new Set(pairsWith.map((p) => p.trim()))).filter(Boolean);
  }, [pairsWith]);

  const cleanedUsedIn = useMemo(() => {
    return Array.from(new Set(usedIn.map((u) => u.trim()))).filter(Boolean);
  }, [usedIn]);

  const normalizedDerivatives = useMemo(() => {
    return derivatives
      .map((d) => {
        if (!d) return null;
        if (typeof d === "string") {
          return {
            name: d.trim(),
            targetId: null,
            process: null,
            yieldRatio: null,
          };
        }
        if (typeof d === "object" && d.name) {
          return {
            name: d.name.trim(),
            targetId: d.targetId || null,
            process: d.process || null,
            yieldRatio: typeof d.yieldRatio === "number" ? d.yieldRatio : null,
          };
        }
        return null;
      })
      .filter(Boolean) as {
      name: string;
      targetId: string | null;
      process: string | null;
      yieldRatio: number | null;
    }[];
  }, [derivatives]);

  // Total count of all connected entities
  const totalCount =
    cleanedPartOf.length +
    cleanedVarieties.length +
    normalizedDerivatives.length +
    cleanedSubstitutes.length +
    cleanedPairsWith.length +
    cleanedUsedIn.length;

  // Compute graph coordinates
  const canvasWidth = 1000;
  const canvasHeight = 650;
  const cx = canvasWidth / 2;
  const cy = canvasHeight / 2;

  const { hubs, leaves, links, activeCategories } = useMemo(() => {
    const rawDataMap: Record<LinkageCategoryKey, any[]> = {
      partOf: cleanedPartOf,
      substitutes: cleanedSubstitutes,
      varieties: cleanedVarieties,
      derivatives: normalizedDerivatives,
      usedIn: cleanedUsedIn,
      pairsWith: cleanedPairsWith,
    };

    const active = CATEGORY_DEFINITIONS.filter(
      (cat) => rawDataMap[cat.key] && rawDataMap[cat.key].length > 0,
    );

    const hubsList: HubNodeData[] = [];
    const leavesList: LeafNodeData[] = [];
    const linksList: {
      id: string;
      sourceX: number;
      sourceY: number;
      targetX: number;
      targetY: number;
      strokeHex: string;
      categoryKey: LinkageCategoryKey;
      isHubLink: boolean;
      leafId?: string;
    }[] = [];

    const K = active.length;
    if (K === 0) {
      return {
        hubs: hubsList,
        leaves: leavesList,
        links: linksList,
        activeCategories: active,
      };
    }

    active.forEach((catMeta, idx) => {
      // Position Hub: If all 6 are present, use natural angles; otherwise distribute evenly
      const hubAngle =
        K === 6 ? catMeta.baseAngle : -Math.PI / 2 + (2 * Math.PI * idx) / K;
      const rHub = 160;
      const hx = cx + rHub * Math.cos(hubAngle);
      const hy = cy + rHub * Math.sin(hubAngle);
      const items = rawDataMap[catMeta.key];
      const hubId = `hub-${catMeta.key}`;

      hubsList.push({
        id: hubId,
        key: catMeta.key,
        label: catMeta.label,
        shortLabel: catMeta.shortLabel,
        relationDesc: catMeta.relationDesc,
        strokeHex: catMeta.strokeHex,
        bgRgba: catMeta.bgRgba,
        x: hx,
        y: hy,
        count: items.length,
        icon: catMeta.icon,
      });

      // Center to Hub link
      linksList.push({
        id: `link-center-${hubId}`,
        sourceX: cx,
        sourceY: cy,
        targetX: hx,
        targetY: hy,
        strokeHex: catMeta.strokeHex,
        categoryKey: catMeta.key,
        isHubLink: true,
      });

      // Position leaf nodes
      const M = items.length;
      const span = Math.min(Math.PI * 0.72, 0.16 * M + 0.24);

      items.forEach((item, j) => {
        const isObj = typeof item === "object" && item !== null;
        const name = isObj ? item.name : String(item);
        const targetId = isObj ? item.targetId : null;
        const process = isObj ? item.process : null;
        const yieldRatio =
          isObj && typeof item.yieldRatio === "number" ? item.yieldRatio : null;

        let leafAngle = hubAngle;
        let rLeaf = rHub + 130;

        if (M === 1) {
          leafAngle = hubAngle;
          rLeaf = rHub + 125;
        } else if (M <= 8) {
          leafAngle = hubAngle - span / 2 + (span * j) / (M - 1);
          rLeaf = rHub + 120 + (j % 2 === 1 ? 26 : -10);
        } else {
          // Two staggered rings for dense categories
          const isOuter = j % 2 === 1;
          const ringIndex = Math.floor(j / 2);
          const ringTotal = Math.ceil(M / 2);
          const ringSpan = Math.min(Math.PI * 0.85, 0.19 * ringTotal + 0.2);
          leafAngle =
            hubAngle -
            ringSpan / 2 +
            (ringSpan * ringIndex) / Math.max(1, ringTotal - 1);
          rLeaf = isOuter ? rHub + 215 : rHub + 115;
        }

        const lx = cx + rLeaf * Math.cos(leafAngle);
        const ly = cy + rLeaf * Math.sin(leafAngle);
        const leafId = `leaf-${catMeta.key}-${j}`;
        const pillWidth = Math.max(76, Math.min(160, name.length * 7.2 + 24));

        leavesList.push({
          id: leafId,
          categoryKey: catMeta.key,
          categoryLabel: catMeta.label,
          name,
          targetId,
          process,
          yieldRatio,
          strokeHex: catMeta.strokeHex,
          bgRgba: catMeta.bgRgba,
          x: lx,
          y: ly,
          hubX: hx,
          hubY: hy,
          pillWidth,
        });

        linksList.push({
          id: `link-${hubId}-${leafId}`,
          sourceX: hx,
          sourceY: hy,
          targetX: lx,
          targetY: ly,
          strokeHex: catMeta.strokeHex,
          categoryKey: catMeta.key,
          isHubLink: false,
          leafId,
        });
      });
    });

    return {
      hubs: hubsList,
      leaves: leavesList,
      links: linksList,
      activeCategories: active,
    };
  }, [
    cleanedPartOf,
    cleanedVarieties,
    normalizedDerivatives,
    cleanedSubstitutes,
    cleanedPairsWith,
    cleanedUsedIn,
    cx,
    cy,
  ]);

  // Navigate to ingredient
  const handleNodeClick = useCallback(
    (leaf: LeafNodeData) => {
      if (leaf.targetId) {
        router.push(`/ingredient/${leaf.targetId}`);
      } else {
        router.push(`/?query=${encodeURIComponent(leaf.name)}`);
      }
    },
    [router],
  );

  // Zoom and Pan Handlers
  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(2.5, prev.scale * 1.25),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.45, prev.scale / 1.25),
    }));
  };

  const handleResetZoom = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(2.5, Math.max(0.45, prev.scale * zoomFactor)),
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    isDraggingRef.current = true;
    dragStartRef.current = {
      x: e.clientX - transform.x,
      y: e.clientY - transform.y,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStartRef.current.x,
      y: e.clientY - dragStartRef.current.y,
    }));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  // Close fullscreen on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  // Filter evaluation
  const isNodeMatching = useCallback(
    (name: string, categoryKey: LinkageCategoryKey) => {
      if (selectedCategory !== "all" && categoryKey !== selectedCategory) {
        return false;
      }
      if (!searchFilter.trim()) return true;
      return name.toLowerCase().includes(searchFilter.trim().toLowerCase());
    },
    [searchFilter, selectedCategory],
  );

  // Active hover/selected highlight logic
  const isLeafHighlighted = useCallback(
    (leaf: LeafNodeData) => {
      if (hoveredNodeId === leaf.id) return true;
      if (hoveredNodeId === `hub-${leaf.categoryKey}`) return true;
      if (hoveredNodeId === "center-node") return true;
      if (selectedNode && selectedNode.id === leaf.id) return true;
      return false;
    },
    [hoveredNodeId, selectedNode],
  );

  const isLinkHighlighted = useCallback(
    (link: (typeof links)[0]) => {
      if (hoveredNodeId === "center-node") return true;
      if (hoveredNodeId === `hub-${link.categoryKey}`) return true;
      if (link.leafId && hoveredNodeId === link.leafId) return true;
      if (selectedNode && selectedNode.id === `hub-${link.categoryKey}`)
        return true;
      if (selectedNode && link.leafId && selectedNode.id === link.leafId)
        return true;
      return false;
    },
    [hoveredNodeId, selectedNode],
  );

  if (totalCount === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "rounded-2xl border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col transition-all duration-200",
        isFullscreen
          ? "fixed inset-4 z-50 rounded-2xl shadow-2xl bg-background border-border"
          : "w-full",
        className,
      )}
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b bg-muted/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Network className="h-5 w-5 text-primary" />
              Culinary Knowledge Graph
            </h2>
            <Badge
              variant="secondary"
              className="font-mono text-xs font-semibold px-2 py-0.5"
            >
              {totalCount} Linkages
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            Interactive ontology map showing taxonomy, culinary derivatives,
            cultivars, swaps, and pairings.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search graph..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="h-8 pl-8 pr-7 text-xs bg-background"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {/* View Mode Toggle: Graph vs Matrix */}
          <div className="flex items-center bg-muted p-0.5 rounded-lg border">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("graph")}
              className={cn(
                "h-7 px-2.5 text-xs font-medium rounded-md gap-1.5",
                viewMode === "graph"
                  ? "bg-background shadow-xs text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Network className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Visual Graph</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewMode("matrix")}
              className={cn(
                "h-7 px-2.5 text-xs font-medium rounded-md gap-1.5",
                viewMode === "matrix"
                  ? "bg-background shadow-xs text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cluster Matrix</span>
            </Button>
          </div>

          {/* Fullscreen Toggle */}
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen graph view"}
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0"
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Category Filter Chips Bar */}
      <div className="px-4 py-2.5 border-b bg-muted/10 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-xs">
        <span className="text-muted-foreground font-semibold uppercase tracking-wider text-[10px] mr-1 shrink-0 flex items-center gap-1">
          <SlidersHorizontal className="h-3 w-3" /> Axis:
        </span>
        <button
          type="button"
          onClick={() => setSelectedCategory("all")}
          className={cn(
            "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border",
            selectedCategory === "all"
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground",
          )}
        >
          All ({totalCount})
        </button>

        {activeCategories.map((cat) => {
          const HubIcon = cat.icon;
          const count = hubs.find((h) => h.key === cat.key)?.count || 0;
          const isSelected = selectedCategory === cat.key;
          return (
            <button
              key={cat.key}
              type="button"
              onClick={() => setSelectedCategory(isSelected ? "all" : cat.key)}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors cursor-pointer border flex items-center gap-1.5",
                isSelected
                  ? "bg-foreground text-background border-foreground shadow-xs font-semibold"
                  : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground",
              )}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: cat.strokeHex }}
              />
              <HubIcon className="h-3 w-3" />
              <span>
                {cat.shortLabel} ({count})
              </span>
            </button>
          );
        })}
      </div>

      {/* MAIN VIEW AREA */}
      {viewMode === "graph" ? (
        <div
          role="region"
          aria-label="Interactive graph canvas"
          className="relative flex-1 min-h-[520px] sm:min-h-[580px] bg-muted/5 select-none overflow-hidden cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Zoom & Canvas Tool Controls (Floating Bottom-Right) */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-background/90 backdrop-blur-md p-1 rounded-xl border shadow-md">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomIn}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleZoomOut}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <div className="h-4 w-px bg-border my-auto" />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleResetZoom}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
              title="Reset View"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>
            <span className="font-mono text-[10px] text-muted-foreground px-1.5 select-none">
              {Math.round(transform.scale * 100)}%
            </span>
          </div>

          {/* Interactive Legend / Guide (Floating Top-Left) */}
          <div className="hidden md:flex absolute top-4 left-4 z-20 flex-col gap-1 bg-background/85 backdrop-blur-md p-2.5 rounded-xl border shadow-xs text-[11px] text-muted-foreground max-w-xs">
            <div className="flex items-center gap-1.5 font-semibold text-foreground text-xs mb-0.5">
              <Info className="h-3.5 w-3.5 text-primary" /> Navigation Hint
            </div>
            <p>
              Click any node to navigate or discover. Drag to pan, scroll to
              zoom.
            </p>
          </div>

          {/* Selected Node HUD Inspector (Floating Bottom-Left) */}
          {selectedNode && (
            <div className="absolute bottom-4 left-4 z-20 bg-background/95 backdrop-blur-md p-3.5 rounded-xl border shadow-lg max-w-sm animate-in slide-in-from-bottom-2 fade-in duration-200">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  {"categoryLabel" in selectedNode ? (
                    <>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        {selectedNode.categoryLabel}
                      </span>
                      <h4 className="text-sm font-bold text-foreground capitalize">
                        {selectedNode.name}
                      </h4>
                      {selectedNode.process && (
                        <p className="text-xs text-muted-foreground">
                          Process:{" "}
                          <span className="text-foreground font-medium">
                            {selectedNode.process}
                          </span>
                        </p>
                      )}
                      {typeof selectedNode.yieldRatio === "number" && (
                        <p className="text-xs text-muted-foreground">
                          Yield Ratio:{" "}
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold font-mono">
                            {Math.round(selectedNode.yieldRatio * 100)}%
                          </span>
                        </p>
                      )}
                      <div className="pt-2">
                        <Button
                          size="sm"
                          variant="default"
                          className="h-7 text-xs gap-1.5"
                          onClick={() =>
                            handleNodeClick(selectedNode as LeafNodeData)
                          }
                        >
                          <span>Explore in database</span>
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Category Hub
                      </span>
                      <h4 className="text-sm font-bold text-foreground">
                        {selectedNode.label} ({selectedNode.count})
                      </h4>
                      <p className="text-xs text-muted-foreground">
                        {selectedNode.relationDesc}
                      </p>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedNode(null)}
                  className="text-muted-foreground hover:text-foreground p-0.5 rounded-md"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* SVG Canvas */}
          <svg
            ref={svgRef}
            role="img"
            aria-label="Culinary Knowledge Graph"
            viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
            className="w-full h-full min-h-[520px] sm:min-h-[580px] transition-transform duration-75 ease-out"
          >
            <title>Culinary Knowledge Graph</title>
            <defs>
              {/* Radial gradient for center glow */}
              <radialGradient id="center-glow" cx="50%" cy="50%" r="50%">
                <stop
                  offset="0%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity="0.18"
                />
                <stop
                  offset="100%"
                  stopColor="hsl(var(--primary))"
                  stopOpacity="0"
                />
              </radialGradient>
              {/* Subtle grid pattern */}
              <pattern
                id="canvas-grid"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                <circle
                  cx="20"
                  cy="20"
                  r="1"
                  fill="currentColor"
                  className="text-border/60"
                />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect
              width={canvasWidth}
              height={canvasHeight}
              fill="url(#canvas-grid)"
            />

            <g
              transform={`translate(${transform.x + canvasWidth / 2}, ${
                transform.y + canvasHeight / 2
              }) scale(${transform.scale}) translate(${-canvasWidth / 2}, ${-canvasHeight / 2})`}
            >
              {/* Center Glow Ambient Ring */}
              <circle cx={cx} cy={cy} r="180" fill="url(#center-glow)" />

              {/* Connecting Bezier Lines */}
              <g className="links-group">
                {links.map((link) => {
                  const isVisible =
                    selectedCategory === "all" ||
                    link.categoryKey === selectedCategory;
                  if (!isVisible) return null;

                  const isHigh = isLinkHighlighted(link);
                  const isFilteredOut =
                    link.leafId &&
                    !isNodeMatching(
                      leaves.find((l) => l.id === link.leafId)?.name || "",
                      link.categoryKey,
                    );

                  // Calculate cubic bezier
                  const dx = link.targetX - link.sourceX;
                  const dy = link.targetY - link.sourceY;
                  const cx1 = link.sourceX + dx * 0.45;
                  const cy1 = link.sourceY + dy * 0.2;
                  const cx2 = link.sourceX + dx * 0.65;
                  const cy2 = link.sourceY + dy * 0.85;

                  return (
                    <path
                      key={link.id}
                      d={`M ${link.sourceX} ${link.sourceY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${link.targetX} ${link.targetY}`}
                      fill="none"
                      stroke={link.strokeHex}
                      strokeWidth={
                        isHigh
                          ? link.isHubLink
                            ? 3
                            : 2.5
                          : link.isHubLink
                            ? 2
                            : 1.25
                      }
                      strokeOpacity={
                        isFilteredOut
                          ? 0.08
                          : isHigh
                            ? 0.95
                            : link.isHubLink
                              ? 0.5
                              : 0.28
                      }
                      strokeDasharray={link.isHubLink ? undefined : "3 3"}
                      className="transition-all duration-200"
                    />
                  );
                })}
              </g>

              {/* Category Hub Nodes */}
              <g className="hubs-group">
                {hubs.map((hub) => {
                  const isVisible =
                    selectedCategory === "all" || hub.key === selectedCategory;
                  if (!isVisible) return null;

                  const isHovered = hoveredNodeId === hub.id;
                  const isSelected = selectedNode?.id === hub.id;

                  return (
                    <g
                      key={hub.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${hub.label} Hub (${hub.count})`}
                      transform={`translate(${hub.x}, ${hub.y})`}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredNodeId(hub.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={() => setSelectedNode(isSelected ? null : hub)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setSelectedNode(isSelected ? null : hub);
                        }
                      }}
                    >
                      {/* Hub Circle / Badge */}
                      <circle
                        r={isHovered || isSelected ? 30 : 26}
                        fill="hsl(var(--card))"
                        stroke={hub.strokeHex}
                        strokeWidth={isHovered || isSelected ? 2.5 : 1.75}
                        className="transition-all duration-200 shadow-sm"
                      />
                      <circle
                        r={isHovered || isSelected ? 25 : 21}
                        fill={hub.bgRgba}
                        className="transition-all duration-200"
                      />

                      {/* Hub Count text */}
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        y="-4"
                        fill="currentColor"
                        className="text-[13px] font-bold font-mono text-foreground"
                      >
                        {hub.count}
                      </text>
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        y="10"
                        fill={hub.strokeHex}
                        className="text-[8px] font-bold uppercase tracking-wider"
                      >
                        {hub.shortLabel}
                      </text>
                    </g>
                  );
                })}
              </g>

              {/* Leaf Nodes */}
              <g className="leaves-group">
                {leaves.map((leaf) => {
                  const isVisible =
                    selectedCategory === "all" ||
                    leaf.categoryKey === selectedCategory;
                  if (!isVisible) return null;

                  const matchesSearch = isNodeMatching(
                    leaf.name,
                    leaf.categoryKey,
                  );
                  const isHovered = hoveredNodeId === leaf.id;
                  const isSelected = selectedNode?.id === leaf.id;
                  const isHigh = isLeafHighlighted(leaf);
                  const opacity = matchesSearch ? (isHigh ? 1 : 0.85) : 0.2;

                  const width = leaf.pillWidth;
                  const height = 26;
                  const rx = 13;

                  return (
                    <g
                      key={leaf.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${leaf.name} (${leaf.categoryLabel})`}
                      transform={`translate(${leaf.x}, ${leaf.y})`}
                      opacity={opacity}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredNodeId(leaf.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      onClick={() => {
                        setSelectedNode(leaf);
                      }}
                      onDoubleClick={() => handleNodeClick(leaf)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleNodeClick(leaf);
                        } else if (e.key === " ") {
                          e.preventDefault();
                          setSelectedNode(leaf);
                        }
                      }}
                    >
                      {/* Outer glow on hover or search match */}
                      {(isHovered ||
                        isSelected ||
                        (searchFilter && matchesSearch)) && (
                        <rect
                          x={-width / 2 - 2}
                          y={-height / 2 - 2}
                          width={width + 4}
                          height={height + 4}
                          rx={rx + 2}
                          fill="none"
                          stroke={leaf.strokeHex}
                          strokeWidth="2.5"
                          strokeOpacity="0.75"
                          className="animate-pulse"
                        />
                      )}

                      {/* Pill Background */}
                      <rect
                        x={-width / 2}
                        y={-height / 2}
                        width={width}
                        height={height}
                        rx={rx}
                        fill="hsl(var(--card))"
                        stroke={
                          isHovered || isSelected
                            ? leaf.strokeHex
                            : "hsl(var(--border))"
                        }
                        strokeWidth={isHovered || isSelected ? 1.75 : 1}
                        className="transition-all duration-200 filter drop-shadow-xs"
                      />

                      {/* Pill Accent Dot */}
                      <circle
                        cx={-width / 2 + 10}
                        cy={0}
                        r={3.5}
                        fill={leaf.strokeHex}
                      />

                      {/* Pill Text */}
                      <text
                        x={-width / 2 + 19}
                        y={0}
                        dominantBaseline="central"
                        textAnchor="start"
                        fill="currentColor"
                        className="text-[11px] font-medium text-card-foreground capitalize select-none"
                      >
                        {leaf.name.length > 18
                          ? `${leaf.name.slice(0, 16)}…`
                          : leaf.name}
                      </text>

                      {/* Yield Tag for derivatives if room */}
                      {typeof leaf.yieldRatio === "number" && (
                        <text
                          x={width / 2 - 8}
                          y={0}
                          dominantBaseline="central"
                          textAnchor="end"
                          fill={leaf.strokeHex}
                          className="text-[9px] font-mono font-bold select-none"
                        >
                          {Math.round(leaf.yieldRatio * 100)}%
                        </text>
                      )}
                    </g>
                  );
                })}
              </g>

              {/* Central Ingredient Node */}
              <g
                id="center-node"
                transform={`translate(${cx}, ${cy})`}
                className="cursor-pointer transition-all duration-200"
                onMouseEnter={() => setHoveredNodeId("center-node")}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {/* Outer Pulsing Accent Ring */}
                <circle
                  r="52"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="1.5"
                  strokeOpacity="0.3"
                  strokeDasharray="4 4"
                  className="animate-spin"
                  style={{ animationDuration: "25s" }}
                />

                {/* Center Badge Body */}
                <rect
                  x="-75"
                  y="-26"
                  width="150"
                  height="52"
                  rx="26"
                  fill="hsl(var(--card))"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2.5"
                  className="shadow-md"
                />

                {/* Subtitle */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  y="-10"
                  fill="hsl(var(--primary))"
                  className="text-[9px] font-bold uppercase tracking-widest select-none"
                >
                  Root Entity
                </text>

                {/* Main Name */}
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  y="8"
                  fill="currentColor"
                  className="text-sm font-extrabold text-foreground capitalize select-none"
                >
                  {ingredientName.length > 16
                    ? `${ingredientName.slice(0, 14)}…`
                    : ingredientName}
                </text>
              </g>
            </g>
          </svg>
        </div>
      ) : (
        /* MATRIX VIEW (Structured Grid by Category) */
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-muted/5 max-h-[640px] overflow-y-auto">
          {activeCategories.map((cat) => {
            const CatIcon = cat.icon;
            const items = leaves.filter((l) => l.categoryKey === cat.key);
            const filteredItems = items.filter((item) =>
              isNodeMatching(item.name, cat.key),
            );

            if (selectedCategory !== "all" && selectedCategory !== cat.key) {
              return null;
            }

            return (
              <div
                key={cat.key}
                className="rounded-xl border bg-card text-card-foreground p-4 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div
                        className="p-1.5 rounded-md"
                        style={{
                          backgroundColor: cat.bgRgba,
                          color: cat.strokeHex,
                        }}
                      >
                        <CatIcon className="h-4 w-4" />
                      </div>
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">
                          {cat.label}
                        </h3>
                        <span className="text-[10px] text-muted-foreground block">
                          {cat.relationDesc}
                        </span>
                      </div>
                    </div>
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px] font-semibold"
                    >
                      {items.length}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-2 max-h-48 overflow-y-auto pr-1">
                    {filteredItems.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic py-2">
                        No matches for "{searchFilter}"
                      </span>
                    ) : (
                      filteredItems.map((item) => {
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNodeClick(item)}
                            className={cn(
                              "text-xs px-2.5 py-1 rounded-md border text-left cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-1.5",
                              cat.badgeClass,
                              "hover:bg-primary hover:text-primary-foreground hover:border-primary",
                            )}
                            title={
                              item.process
                                ? `${item.name}: ${item.process}${
                                    item.yieldRatio
                                      ? ` (${Math.round(item.yieldRatio * 100)}% yield)`
                                      : ""
                                  }`
                                : `Explore ${item.name}`
                            }
                          >
                            <span className="capitalize">{item.name}</span>
                            {typeof item.yieldRatio === "number" && (
                              <span className="font-mono text-[10px] font-bold opacity-80 border-l pl-1 border-current">
                                {Math.round(item.yieldRatio * 100)}%
                              </span>
                            )}
                            {item.process && (
                              <span className="text-[9px] opacity-70 hidden sm:inline">
                                ({item.process})
                              </span>
                            )}
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Click item to search</span>
                  <ChevronRight className="h-3 w-3 text-muted-foreground/60" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
