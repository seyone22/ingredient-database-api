"use client";

import React, { useEffect, useState, useCallback } from "react";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  Trash2,
  Wand2,
  Edit2,
  Save,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface Ingredient {
  id: string;
  name: string;
  country?: string[];
  cuisine?: string[];
  region?: string[];
  flavor_profile?: string[];
  flavorProfile?: string[];
  aliases?: string[];
  provenance?: string;
  comment?: string;
}

interface ApiResponse {
  results: Ingredient[];
  total: number;
  page: number;
  limit: number;
}

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(false);

  // Pagination State
  const [totalRows, setTotalRows] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Search & Selection State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Inline Edit State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<Ingredient>>({});

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        query: searchQuery || "a",
        page: page.toString(),
        limit: pageSize.toString(),
      });

      const res = await fetch(`/api/ingredients?${params.toString()}`);
      const data: ApiResponse = await res.json();

      if (res.ok) {
        setIngredients(data.results);
        setTotalRows(data.total);
      } else {
        setIngredients([]);
        setTotalRows(0);
      }
    } catch (err) {
      console.error(err);
      setIngredients([]);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  // --- Selection Handlers ---
  const toggleSelectAll = () => {
    if (selectedIds.size === ingredients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(ingredients.map((i) => i.id)));
    }
  };

  const toggleSelectRow = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  // --- Bulk Action Handlers ---
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1); // Reset to first page on new search
    fetchIngredients();
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.size) return;
    if (
      !confirm(
        `Delete ${selectedIds.size} ingredient(s)? This cannot be undone.`,
      )
    )
      return;

    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/ingredients/${id}`, { method: "DELETE" }),
        ),
      );
      setIngredients((prev) => prev.filter((row) => !selectedIds.has(row.id)));
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      alert("Failed to delete some items.");
    }
  };

  const handleEnhanceSelected = async () => {
    if (!selectedIds.size) return;
    if (!confirm(`Enhance ${selectedIds.size} ingredient(s) using AI?`)) return;

    try {
      const res = await fetch(`/api/ingredients/enhance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: Array.from(selectedIds) }),
      });

      if (!res.ok) throw new Error("Enhancement failed");
      const data = await res.json();

      setIngredients((prev) =>
        prev.map((row) =>
          data.enriched[row.id] ? data.enriched[row.id] : row,
        ),
      );
      alert("Enhancement completed successfully!");
      setSelectedIds(new Set()); // Clear selection after success
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Enhancement failed");
    }
  };

  // --- Inline Edit Handlers ---
  const startEditing = (ingredient: Ingredient) => {
    setEditingId(ingredient.id);
    setEditFormData(ingredient);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveRow = async () => {
    if (!editingId) return;

    try {
      // Ensure array fields are formatted correctly if they were edited as comma-separated strings
      const formatArray = (val: any) =>
        typeof val === "string"
          ? val
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : val;

      const flavorVal = editFormData.flavorProfile || editFormData.flavor_profile;

      const payload = {
        ...editFormData,
        country: formatArray(editFormData.country),
        cuisine: formatArray(editFormData.cuisine),
        region: formatArray(editFormData.region),
        flavor_profile: formatArray(flavorVal),
        flavorProfile: formatArray(flavorVal),
        aliases: formatArray(editFormData.aliases),
      };

      const res = await fetch(`/api/ingredients/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update");

      // Update local state
      setIngredients((prev) =>
        prev.map((i) => (i.id === editingId ? { ...i, ...payload } : i)),
      );
      setEditingId(null);
      setEditFormData({});
    } catch (err) {
      console.error(err);
      alert("Failed to save ingredient.");
    }
  };

  // Helper to format arrays for display
  const formatValue = (val: any) => {
    if (!val) return "—";
    if (Array.isArray(val)) {
      const cleaned = val
        .map((v) => {
          if (!v) return "";
          if (typeof v === "string") {
            return v === "[object Object]" || v.includes("[object Object]") ? "" : v.trim();
          }
          if (typeof v === "object") {
            const str = v.name || v.alias || v.value || v.text || v.label || v.title;
            return typeof str === "string" && str !== "[object Object]" ? str.trim() : "";
          }
          return String(v);
        })
        .filter((v) => Boolean(v) && v !== "[object Object]");
      return cleaned.length > 0 ? cleaned.join(", ") : "—";
    }
    if (typeof val === "string" && (val === "[object Object]" || val.includes("[object Object]"))) {
      return "—";
    }
    return val;
  };

  const getFlavorValue = (row: Ingredient) =>
    formatValue(row.flavorProfile || row.flavor_profile);

  return (
    <div className="min-h-screen flex flex-col bg-background font-sans antialiased">
      <NavBar />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight">
              Ingredient Database
            </h1>
            <p className="text-muted-foreground">
              Manage and enrich your ingredient records.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              disabled={selectedIds.size === 0}
              onClick={handleDeleteSelected}
              className="w-full md:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete ({selectedIds.size})
            </Button>
            <Button
              variant="default"
              disabled={selectedIds.size === 0}
              onClick={handleEnhanceSelected}
              className="w-full md:w-auto bg-primary hover:bg-primary/90"
            >
              <Wand2 className="mr-2 h-4 w-4" /> Enhance ({selectedIds.size})
            </Button>
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search ingredients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" disabled={loading}>
            {loading ? "Loading..." : "Search"}
          </Button>
        </form>

        {/* Data Table */}
        <div className="rounded-md border bg-card overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={
                      ingredients.length > 0 &&
                      selectedIds.size === ingredients.length
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="min-w-[140px]">Name</TableHead>
                <TableHead className="min-w-[130px]">Country</TableHead>
                <TableHead className="min-w-[130px]">Cuisine</TableHead>
                <TableHead className="min-w-[130px]">Region</TableHead>
                <TableHead className="min-w-[140px]">Flavor Profile</TableHead>
                <TableHead className="min-w-[130px]">Aliases</TableHead>
                <TableHead className="min-w-[130px]">Provenance</TableHead>
                <TableHead className="text-right w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ingredients.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                ingredients.map((row) => {
                  const isEditing = editingId === row.id;

                  return (
                    <TableRow
                      key={row.id}
                      data-state={
                        selectedIds.has(row.id) ? "selected" : undefined
                      }
                    >
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => toggleSelectRow(row.id)}
                          aria-label={`Select ${row.name}`}
                        />
                      </TableCell>

                      {/* Name Cell */}
                      <TableCell className="font-medium">
                        {isEditing ? (
                          <Input
                            value={editFormData.name || ""}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                name: e.target.value,
                              })
                            }
                            className="h-8"
                          />
                        ) : (
                          row.name
                        )}
                      </TableCell>

                      {/* Country Cell */}
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={formatValue(editFormData.country)}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                country: e.target.value as any,
                              })
                            }
                            className="h-8"
                            placeholder="US, Italy, etc."
                          />
                        ) : (
                          <span className="truncate block max-w-[140px]" title={formatValue(row.country)}>
                            {formatValue(row.country)}
                          </span>
                        )}
                      </TableCell>

                      {/* Cuisine Cell */}
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={formatValue(editFormData.cuisine)}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                cuisine: e.target.value as any,
                              })
                            }
                            className="h-8"
                          />
                        ) : (
                          <span className="truncate block max-w-[140px]" title={formatValue(row.cuisine)}>
                            {formatValue(row.cuisine)}
                          </span>
                        )}
                      </TableCell>

                      {/* Region Cell */}
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={formatValue(editFormData.region)}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                region: e.target.value as any,
                              })
                            }
                            className="h-8"
                          />
                        ) : (
                          <span className="truncate block max-w-[140px]" title={formatValue(row.region)}>
                            {formatValue(row.region)}
                          </span>
                        )}
                      </TableCell>

                      {/* Flavor Profile Cell */}
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={getFlavorValue(editFormData as any)}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                flavorProfile: e.target.value as any,
                                flavor_profile: e.target.value as any,
                              })
                            }
                            className="h-8"
                          />
                        ) : (
                          <span className="truncate block max-w-[140px]" title={getFlavorValue(row)}>
                            {getFlavorValue(row)}
                          </span>
                        )}
                      </TableCell>

                      {/* Aliases Cell */}
                      <TableCell>
                        {isEditing ? (
                          <Input
                            value={formatValue(editFormData.aliases)}
                            onChange={(e) =>
                              setEditFormData({
                                ...editFormData,
                                aliases: e.target.value as any,
                              })
                            }
                            className="h-8"
                          />
                        ) : (
                          <span className="truncate block max-w-[140px]" title={formatValue(row.aliases)}>
                            {formatValue(row.aliases)}
                          </span>
                        )}
                      </TableCell>

                      {/* Provenance Cell */}
                      <TableCell>
                        {row.provenance ? (
                          <Badge variant="outline" className="text-[11px] font-mono whitespace-nowrap">
                            {row.provenance}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Actions Cell */}
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleSaveRow}
                              className="h-8 w-8 text-green-600 hover:text-green-700"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={cancelEditing}
                              className="h-8 w-8 text-muted-foreground"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => startEditing(row)}
                            className="h-8 w-8"
                          >
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Controls */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{" "}
            <span className="font-medium">
              {Math.min(page * pageSize, totalRows)}
            </span>{" "}
            of <span className="font-medium">{totalRows}</span> results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1 || loading}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * pageSize >= totalRows || loading}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
