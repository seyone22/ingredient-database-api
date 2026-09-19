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
  preferredSide: "left" | "right";
  strokeHex: string;
  badgeClass: string;
  pillBgClass: string;
  icon: React.ComponentType<{ className?: string }>;
}

const CATEGORY_DEFINITIONS: CategoryMeta[] = [
  {
    key: "partOf",
    label: "Parent Taxonomy",
    shortLabel: "Taxonomy",
    relationDesc: "Taxonomical ancestor / category",
    preferredSide: "left",
    strokeHex: "#3b82f6",
    badgeClass:
      "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30",
    pillBgClass: "hover:border-blue-500/60",
    icon: Layers,
  },
  {
    key: "substitutes",
    label: "Lateral Substitutes",
    shortLabel: "Substitutes",
    relationDesc: "Culinary swap / alternative",
    preferredSide: "left",
    strokeHex: "#f59e0b",
    badgeClass:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30",
    pillBgClass: "hover:border-amber-500/60",
    icon: ArrowLeftRight,
  },
  {
    key: "varieties",
    label: "Cultivars & Varieties",
    shortLabel: "Varieties",
    relationDesc: "Botanical variety / cultivar",
    preferredSide: "left",
    strokeHex: "#a855f7",
    badgeClass:
      "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30",
    pillBgClass: "hover:border-purple-500/60",
    icon: GitBranch,
  },
  {
    key: "derivatives",
    label: "Culinary Derivatives",
    shortLabel: "Derivatives",
    relationDesc: "Processed form / derivative product",
    preferredSide: "right",
    strokeHex: "#10b981",
    badgeClass:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    pillBgClass: "hover:border-emerald-500/60",
    icon: Sparkles,
  },
  {
    key: "pairsWith",
    label: "Flavor Pairings",
    shortLabel: "Pairings",
    relationDesc: "Flavor synergy / affinity",
    preferredSide: "right",
    strokeHex: "#f43f5e",
    badgeClass:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30",
    pillBgClass: "hover:border-rose-500/60",
    icon: Flame,
  },
  {
    key: "usedIn",
    label: "Culinary Uses & Dishes",
    shortLabel: "Uses & Dishes",
    relationDesc: "Culinary preparation / dish",
    preferredSide: "right",
    strokeHex: "#0ea5e9",
    badgeClass:
      "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30",
    pillBgClass: "hover:border-sky-500/60",
    icon: Utensils,
  },
];

interface LeafItem {
  id: string;
  categoryKey: LinkageCategoryKey;
  categoryLabel: string;
  name: string;
  targetId?: string | null;
  process?: string | null;
  yieldRatio?: number | null;
  strokeHex: string;
  x: number;
  y: number;
  side: "left" | "right";
  hubId: string;
}

interface HubItem {
  id: string;
  key: LinkageCategoryKey;
  label: string;
  shortLabel: string;
  relationDesc: string;
  strokeHex: string;
  badgeClass: string;
  x: number;
  y: number;
  side: "left" | "right";
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

  // View mode
  const [viewMode, setViewMode] = useState<"graph" | "matrix">("graph");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    LinkageCategoryKey | "all"
  >("all");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Canvas pan & zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });

  // Clean inputs
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

  const totalCount =
    cleanedPartOf.length +
    cleanedVarieties.length +
    normalizedDerivatives.length +
    cleanedSubstitutes.length +
    cleanedPairsWith.length +
    cleanedUsedIn.length;

  // Compute Layout: Center ingredient in middle, categories on left and right
  const layout = useMemo(() => {
    const rawDataMap: Record<LinkageCategoryKey, any[]> = {
      partOf: cleanedPartOf,
      substitutes: cleanedSubstitutes,
      varieties: cleanedVarieties,
      derivatives: normalizedDerivatives,
      pairsWith: cleanedPairsWith,
      usedIn: cleanedUsedIn,
    };

    const activeMeta = CATEGORY_DEFINITIONS.filter(
      (cat) => rawDataMap[cat.key] && rawDataMap[cat.key].length > 0,
    );

    if (activeMeta.length === 0) {
      return {
        width: 1000,
        height: 500,
        cx: 500,
        cy: 250,
        hubs: [],
        leaves: [],
        links: [],
      };
    }

    // Partition categories into left and right sides
    let leftCats = activeMeta.filter((c) => c.preferredSide === "left");
    let rightCats = activeMeta.filter((c) => c.preferredSide === "right");

    // Balance sides if one side is empty
    if (leftCats.length === 0 && rightCats.length > 1) {
      const half = Math.ceil(rightCats.length / 2);
      leftCats = rightCats.slice(0, half);
      rightCats = rightCats.slice(half);
    } else if (rightCats.length === 0 && leftCats.length > 1) {
      const half = Math.ceil(leftCats.length / 2);
      rightCats = leftCats.slice(half);
      leftCats = leftCats.slice(0, half);
    }

    const itemHeight = 36;
    const itemGap = 8;
    const catGap = 28;

    // Calculate height for left side
    let leftTotalH = 0;
    const leftMeta = leftCats.map((cat) => {
      const items = rawDataMap[cat.key];
      const count = items.length;
      const h = count * (itemHeight + itemGap) - itemGap;
      leftTotalH += h;
      return { cat, items, count, height: h };
    });
    leftTotalH += Math.max(0, leftCats.length - 1) * catGap;

    // Calculate height for right side
    let rightTotalH = 0;
    const rightMeta = rightCats.map((cat) => {
      const items = rawDataMap[cat.key];
      const count = items.length;
      const h = count * (itemHeight + itemGap) - itemGap;
      rightTotalH += h;
      return { cat, items, count, height: h };
    });
    rightTotalH += Math.max(0, rightCats.length - 1) * catGap;

    const width = 1180;
    const cx = width / 2;
    const maxContentH = Math.max(leftTotalH, rightTotalH, 300);
    const height = Math.max(540, maxContentH + 140);
    const cy = height / 2;

    const hubsList: HubItem[] = [];
    const leavesList: LeafItem[] = [];
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

    // 1. Layout Left Side
    const leftHubX = cx - 180;
    const leftLeafX = cx - 440;
    let curLeftY = cy - leftTotalH / 2;

    leftMeta.forEach(({ cat, items, count, height: groupH }) => {
      const hubId = `hub-${cat.key}`;
      const hubY = curLeftY + groupH / 2;

      hubsList.push({
        id: hubId,
        key: cat.key,
        label: cat.label,
        shortLabel: cat.shortLabel,
        relationDesc: cat.relationDesc,
        strokeHex: cat.strokeHex,
        badgeClass: cat.badgeClass,
        x: leftHubX,
        y: hubY,
        side: "left",
        count,
        icon: cat.icon,
      });

      // Link: Center Left Edge -> Hub Right Edge
      linksList.push({
        id: `link-center-${hubId}`,
        sourceX: cx - 110,
        sourceY: cy,
        targetX: leftHubX + 65,
        targetY: hubY,
        strokeHex: cat.strokeHex,
        categoryKey: cat.key,
        isHubLink: true,
      });

      // Leaves
      let itemY = curLeftY;
      items.forEach((item, idx) => {
        const leafId = `leaf-${cat.key}-${idx}`;
        const isObj = typeof item === "object" && item !== null;
        const name = isObj ? item.name : String(item);
        const targetId = isObj ? item.targetId : null;
        const process = isObj ? item.process : null;
        const yieldRatio =
          isObj && typeof item.yieldRatio === "number" ? item.yieldRatio : null;
        const nodeY = itemY + itemHeight / 2;

        leavesList.push({
          id: leafId,
          categoryKey: cat.key,
          categoryLabel: cat.label,
          name,
          targetId,
          process,
          yieldRatio,
          strokeHex: cat.strokeHex,
          x: leftLeafX,
          y: nodeY,
          side: "left",
          hubId,
        });

        // Link: Hub Left Edge -> Leaf Right Edge
        linksList.push({
          id: `link-${hubId}-${leafId}`,
          sourceX: leftHubX - 65,
          sourceY: hubY,
          targetX: leftLeafX + 115,
          targetY: nodeY,
          strokeHex: cat.strokeHex,
          categoryKey: cat.key,
          isHubLink: false,
          leafId,
        });

        itemY += itemHeight + itemGap;
      });

      curLeftY += groupH + catGap;
    });

    // 2. Layout Right Side
    const rightHubX = cx + 180;
    const rightLeafX = cx + 440;
    let curRightY = cy - rightTotalH / 2;

    rightMeta.forEach(({ cat, items, count, height: groupH }) => {
      const hubId = `hub-${cat.key}`;
      const hubY = curRightY + groupH / 2;

      hubsList.push({
        id: hubId,
        key: cat.key,
        label: cat.label,
        shortLabel: cat.shortLabel,
        relationDesc: cat.relationDesc,
        strokeHex: cat.strokeHex,
        badgeClass: cat.badgeClass,
        x: rightHubX,
        y: hubY,
        side: "right",
        count,
        icon: cat.icon,
      });

      // Link: Center Right Edge -> Hub Left Edge
      linksList.push({
        id: `link-center-${hubId}`,
        sourceX: cx + 110,
        sourceY: cy,
        targetX: rightHubX - 65,
        targetY: hubY,
        strokeHex: cat.strokeHex,
        categoryKey: cat.key,
        isHubLink: true,
      });

      // Leaves
      let itemY = curRightY;
      items.forEach((item, idx) => {
        const leafId = `leaf-${cat.key}-${idx}`;
        const isObj = typeof item === "object" && item !== null;
        const name = isObj ? item.name : String(item);
        const targetId = isObj ? item.targetId : null;
        const process = isObj ? item.process : null;
        const yieldRatio =
          isObj && typeof item.yieldRatio === "number" ? item.yieldRatio : null;
        const nodeY = itemY + itemHeight / 2;

        leavesList.push({
          id: leafId,
          categoryKey: cat.key,
          categoryLabel: cat.label,
          name,
          targetId,
          process,
          yieldRatio,
          strokeHex: cat.strokeHex,
          x: rightLeafX,
          y: nodeY,
          side: "right",
          hubId,
        });

        // Link: Hub Right Edge -> Leaf Left Edge
        linksList.push({
          id: `link-${hubId}-${leafId}`,
          sourceX: rightHubX + 65,
          sourceY: hubY,
          targetX: rightLeafX - 115,
          targetY: nodeY,
          strokeHex: cat.strokeHex,
          categoryKey: cat.key,
          isHubLink: false,
          leafId,
        });

        itemY += itemHeight + itemGap;
      });

      curRightY += groupH + catGap;
    });

    return {
      width,
      height,
      cx,
      cy,
      hubs: hubsList,
      leaves: leavesList,
      links: linksList,
      activeCategories: activeMeta,
    };
  }, [
    cleanedPartOf,
    cleanedVarieties,
    normalizedDerivatives,
    cleanedSubstitutes,
    cleanedPairsWith,
    cleanedUsedIn,
  ]);

  // Click Navigation
  const handleNodeClick = useCallback(
    (name: string, targetId?: string | null) => {
      if (targetId) {
        router.push(`/ingredient/${targetId}`);
      } else {
        router.push(`/?query=${encodeURIComponent(name)}`);
      }
    },
    [router],
  );

  // Zoom & Pan Handlers
  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(2.0, prev.scale * 1.2),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.5, prev.scale / 1.2),
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
      scale: Math.min(2.0, Math.max(0.5, prev.scale * zoomFactor)),
    }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
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

  // Search filter matching
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

  // Link highlight logic
  const isLinkActive = useCallback(
    (link: (typeof layout.links)[0]) => {
      if (!hoveredNodeId) return false;
      if (hoveredNodeId === "center-node") return true;
      if (hoveredNodeId === `hub-${link.categoryKey}`) return true;
      if (link.leafId && hoveredNodeId === link.leafId) return true;
      return false;
    },
    [hoveredNodeId, layout.links],
  );

  if (totalCount === 0) {
    return null;
  }

  const activeCategories = layout.activeCategories || [];

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
      {/* Top Header Bar */}
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
            Interactive relational map showing parent taxonomy, cultivars,
            culinary derivatives, swaps, and flavor pairings.
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

      {/* Axis Category Chips Bar */}
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
              ? "bg-primary text-primary-foreground border-primary font-semibold"
              : "bg-background text-muted-foreground border-border hover:bg-muted hover:text-foreground",
          )}
        >
          All ({totalCount})
        </button>

        {activeCategories.map((cat) => {
          const HubIcon = cat.icon;
          const count = layout.hubs.find((h) => h.key === cat.key)?.count || 0;
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

      {/* MAIN VIEW */}
      {viewMode === "graph" ? (
        <div
          role="region"
          aria-label="Interactive culinary knowledge graph canvas"
          className="relative flex-1 min-h-[540px] sm:min-h-[600px] bg-muted/5 select-none overflow-hidden cursor-grab active:cursor-grabbing"
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Zoom Controls (Floating Bottom-Right) */}
          <div className="absolute bottom-4 right-4 z-20 flex items-center gap-1 bg-card/95 backdrop-blur-md p-1 rounded-xl border border-border shadow-md">
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

          {/* Interactive Flow Canvas */}
          <div
            className="absolute inset-0 transition-transform duration-75 ease-out"
            style={{
              transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
              transformOrigin: "center center",
            }}
          >
            {/* SVG Connecting Bezier Arcs Layer */}
            <svg
              role="img"
              aria-label="Graph connectors"
              className="absolute inset-0 pointer-events-none"
              style={{
                width: `${layout.width}px`,
                height: `${layout.height}px`,
              }}
              viewBox={`0 0 ${layout.width} ${layout.height}`}
            >
              <title>Graph connecting lines</title>
              {layout.links.map((link) => {
                const isVisible =
                  selectedCategory === "all" ||
                  link.categoryKey === selectedCategory;
                if (!isVisible) return null;

                const isHighlight = isLinkActive(link);
                const leaf = link.leafId
                  ? layout.leaves.find((l) => l.id === link.leafId)
                  : null;
                const matchesSearch = leaf
                  ? isNodeMatching(leaf.name, leaf.categoryKey)
                  : true;

                // Bezier curve control points
                const dx = link.targetX - link.sourceX;
                const cx1 = link.sourceX + dx * 0.45;
                const cy1 = link.sourceY;
                const cx2 = link.targetX - dx * 0.45;
                const cy2 = link.targetY;

                return (
                  <path
                    key={link.id}
                    d={`M ${link.sourceX} ${link.sourceY} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${link.targetX} ${link.targetY}`}
                    fill="none"
                    stroke={link.strokeHex}
                    strokeWidth={
                      isHighlight ? 3.5 : link.isHubLink ? 2.5 : 1.75
                    }
                    strokeOpacity={
                      !matchesSearch
                        ? 0.1
                        : isHighlight
                          ? 1.0
                          : link.isHubLink
                            ? 0.65
                            : 0.4
                    }
                    className="transition-all duration-200"
                  />
                );
              })}
            </svg>

            {/* HTML Nodes Layer (100% Theme-Aware, High-Contrast, Zero Font Glitches) */}
            <div
              className="relative"
              style={{
                width: `${layout.width}px`,
                height: `${layout.height}px`,
              }}
            >
              {/* CENTER NODE: The Active Root Ingredient */}
              <div
                role="button"
                tabIndex={0}
                className="absolute z-10 -translate-x-1/2 -translate-y-1/2 bg-card text-card-foreground border-2 border-primary rounded-2xl shadow-lg px-5 py-3.5 flex flex-col items-center justify-center min-w-[200px] ring-4 ring-primary/10 transition-transform hover:scale-105"
                style={{ left: `${layout.cx}px`, top: `${layout.cy}px` }}
                onMouseEnter={() => setHoveredNodeId("center-node")}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                <span className="text-[9px] uppercase font-extrabold tracking-widest text-primary mb-0.5">
                  Root Ingredient
                </span>
                <span className="text-base sm:text-lg font-extrabold text-foreground capitalize tracking-tight text-center leading-tight">
                  {ingredientName}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono mt-1 font-semibold">
                  {totalCount} Linkages
                </span>
              </div>

              {/* CATEGORY HUBS */}
              {layout.hubs.map((hub) => {
                const isVisible =
                  selectedCategory === "all" || hub.key === selectedCategory;
                if (!isVisible) return null;

                const HubIcon = hub.icon;
                const isHovered = hoveredNodeId === hub.id;

                return (
                  <div
                    key={hub.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`${hub.label} (${hub.count})`}
                    className={cn(
                      "absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-xl border px-3 py-2 shadow-xs flex items-center gap-2 cursor-pointer transition-all",
                      "bg-card text-foreground font-semibold text-xs",
                      hub.badgeClass,
                      isHovered &&
                        "ring-2 ring-foreground/20 scale-105 shadow-md",
                    )}
                    style={{
                      left: `${hub.x}px`,
                      top: `${hub.y}px`,
                      borderColor: hub.strokeHex,
                    }}
                    onMouseEnter={() => setHoveredNodeId(hub.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() =>
                      setSelectedCategory(
                        selectedCategory === hub.key ? "all" : hub.key,
                      )
                    }
                  >
                    <div
                      className="p-1 rounded-md text-white shrink-0"
                      style={{ backgroundColor: hub.strokeHex }}
                    >
                      <HubIcon className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col text-left leading-none">
                      <span className="text-[11px] font-bold text-foreground">
                        {hub.shortLabel}
                      </span>
                      <span className="text-[9px] text-muted-foreground font-mono mt-0.5">
                        {hub.count} {hub.count === 1 ? "item" : "items"}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* LEAF NODES */}
              {layout.leaves.map((leaf) => {
                const isVisible =
                  selectedCategory === "all" ||
                  leaf.categoryKey === selectedCategory;
                if (!isVisible) return null;

                const matchesSearch = isNodeMatching(
                  leaf.name,
                  leaf.categoryKey,
                );
                const isHovered = hoveredNodeId === leaf.id;
                const isHubHovered = hoveredNodeId === leaf.hubId;
                const isHighlighted =
                  isHovered || isHubHovered || (searchFilter && matchesSearch);

                return (
                  <button
                    key={leaf.id}
                    type="button"
                    onClick={() => handleNodeClick(leaf.name, leaf.targetId)}
                    onMouseEnter={() => setHoveredNodeId(leaf.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    className={cn(
                      "absolute z-10 -translate-x-1/2 -translate-y-1/2 w-56 px-3 py-2 rounded-xl border text-left cursor-pointer transition-all flex items-center justify-between gap-2 shadow-xs",
                      "bg-card text-card-foreground border-border hover:shadow-md hover:scale-[1.02]",
                      !matchesSearch && "opacity-20",
                      isHighlighted && "border-2 shadow-md scale-[1.03]",
                    )}
                    style={{
                      left: `${leaf.x}px`,
                      top: `${leaf.y}px`,
                      borderColor: isHighlighted ? leaf.strokeHex : undefined,
                    }}
                    title={
                      leaf.process
                        ? `${leaf.name}: ${leaf.process}${
                            leaf.yieldRatio
                              ? ` (${Math.round(leaf.yieldRatio * 100)}% yield)`
                              : ""
                          }`
                        : `Explore ${leaf.name}`
                    }
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: leaf.strokeHex }}
                      />
                      <span className="text-xs font-semibold text-foreground truncate capitalize">
                        {leaf.name}
                      </span>
                    </div>

                    {/* Derivative Yield & Process Badges */}
                    <div className="flex items-center gap-1 shrink-0">
                      {typeof leaf.yieldRatio === "number" && (
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300">
                          {Math.round(leaf.yieldRatio * 100)}%
                        </span>
                      )}
                      {leaf.process && (
                        <span className="text-[9px] px-1 py-0.5 rounded bg-muted text-muted-foreground hidden sm:inline max-w-[65px] truncate">
                          {leaf.process}
                        </span>
                      )}
                      <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* CLUSTER MATRIX VIEW: Structured Multi-Column Grid */
        <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 bg-muted/5 max-h-[640px] overflow-y-auto">
          {activeCategories.map((cat) => {
            const CatIcon = cat.icon;
            const items = layout.leaves.filter(
              (l) => l.categoryKey === cat.key,
            );
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
                        className="p-1.5 rounded-md text-white"
                        style={{ backgroundColor: cat.strokeHex }}
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

                  <div className="flex flex-wrap gap-1.5 pt-2 max-h-56 overflow-y-auto pr-1">
                    {filteredItems.length === 0 ? (
                      <span className="text-xs text-muted-foreground italic py-2">
                        No matches for "{searchFilter}"
                      </span>
                    ) : (
                      filteredItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() =>
                            handleNodeClick(item.name, item.targetId)
                          }
                          className={cn(
                            "text-xs px-2.5 py-1.5 rounded-lg border text-left cursor-pointer transition-all hover:scale-[1.02] flex items-center gap-2",
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
                          <span className="capitalize font-medium">
                            {item.name}
                          </span>
                          {typeof item.yieldRatio === "number" && (
                            <span className="font-mono text-[10px] font-bold opacity-90 border-l pl-1.5 border-current">
                              {Math.round(item.yieldRatio * 100)}%
                            </span>
                          )}
                          {item.process && (
                            <span className="text-[9px] opacity-75 hidden sm:inline">
                              ({item.process})
                            </span>
                          )}
                        </button>
                      ))
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t text-[11px] text-muted-foreground flex items-center justify-between">
                  <span>Click item to search</span>
                  <ExternalLink className="h-3 w-3 text-muted-foreground/60" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
