"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Search,
  Database,
  Activity,
  Check,
  Link as LinkIcon,
  AlertTriangle,
  Trash2,
  Loader2,
  Sparkles,
} from "lucide-react";

interface NutritionData {
  fdcId: number;
  description: string;
  foodCategory?: string;
  caloriesKcal?: number;
  proteinG?: number;
  fatG?: number;
  carbsG?: number;
  fiberG?: number;
  sodiumMg?: number;
  sugarG?: number;
}

interface NutritionFactsProps {
  ingredientId: string;
  ingredientName: string;
  nutrition: NutritionData | null;
  onLinkSuccess: (
    fdcId: number | null,
    nutritionData: NutritionData | null,
  ) => void;
}

export default function NutritionFacts({
  ingredientId,
  ingredientName,
  nutrition,
  onLinkSuccess,
}: NutritionFactsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<NutritionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FDA Daily Value guidelines for a standard 2000 kcal diet
  const DAILY_VALUES = {
    fat: 78,
    carbs: 275,
    fiber: 28,
    sodium: 2300,
    protein: 50, // DV% not typically shown but standard reference
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/usda?query=${encodeURIComponent(val)}&limit=25`,
      );
      if (!res.ok) throw new Error("Search request failed");
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (err: any) {
      setError(err.message || "Failed to search USDA database");
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async (food: NutritionData | null) => {
    setLinking(true);
    setError(null);
    try {
      const res = await fetch(`/api/ingredients/${ingredientId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fdcId: food ? food.fdcId : null }),
      });

      if (!res.ok) throw new Error("Failed to update ingredient link");

      onLinkSuccess(food ? food.fdcId : null, food);
      setIsModalOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (err: any) {
      setError(err.message || "Failed to link USDA food");
    } finally {
      setLinking(false);
    }
  };

  // Calculate dynamic dietary badges
  const getDietaryBadges = (nut: NutritionData) => {
    const badges = [];
    const fat = nut.fatG || 0;
    const carbs = nut.carbsG || 0;
    const protein = nut.proteinG || 0;
    const sodium = nut.sodiumMg || 0;
    const sugar = nut.sugarG || 0;

    if (carbs < 5)
      badges.push({
        text: "Low Carb",
        color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      });
    if (fat < 3)
      badges.push({
        text: "Low Fat",
        color: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      });
    if (protein > 15)
      badges.push({
        text: "High Protein",
        color: "bg-indigo-500/10 text-indigo-500 border-indigo-500/20",
      });
    if (sodium < 140)
      badges.push({
        text: "Low Sodium",
        color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      });
    if (sugar < 5)
      badges.push({
        text: "Low Sugar",
        color: "bg-pink-500/10 text-pink-500 border-pink-500/20",
      });

    return badges;
  };

  // Calculate energy contribution percentages
  const getMacroRatios = (nut: NutritionData) => {
    const pKcal = (nut.proteinG || 0) * 4;
    const fKcal = (nut.fatG || 0) * 9;
    const cKcal = (nut.carbsG || 0) * 4;
    const totalKcal = pKcal + fKcal + cKcal;

    if (totalKcal === 0) return { protein: 33, fat: 33, carbs: 34 };

    return {
      protein: Math.round((pKcal / totalKcal) * 100),
      fat: Math.round((fKcal / totalKcal) * 100),
      carbs: Math.round((cKcal / totalKcal) * 100),
    };
  };

  if (!nutrition) {
    return (
      <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center text-center p-8 space-y-4">
          <div className="p-3 bg-muted rounded-full text-muted-foreground">
            <Activity className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-lg">No Nutrition Data Linked</CardTitle>
            <CardDescription className="max-w-md">
              Linking a USDA SR Legacy nutrition profile will enable
              macronutrient breakdown visualizers and health/allergen warning
              indicators.
            </CardDescription>
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2"
          >
            <LinkIcon className="h-4 w-4" />
            Link USDA Profile
          </Button>
        </CardContent>

        {/* Modal for search */}
        <LinkModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          searchQuery={searchQuery}
          onSearchChange={handleSearch}
          loading={loading}
          searchResults={searchResults}
          onLink={handleLink}
          linking={linking}
          error={error}
          ingredientName={ingredientName}
        />
      </Card>
    );
  }

  const dvPercent = (val: number | undefined, max: number) => {
    if (!val) return 0;
    return Math.round((val / max) * 100);
  };

  const ratios = getMacroRatios(nutrition);
  const badges = getDietaryBadges(nutrition);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 space-y-4 md:space-y-0">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl flex items-center gap-2">
              <Activity className="text-primary h-5 w-5" />
              Nutritional Profile
            </CardTitle>
            <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
              Per 100g
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Linked:{" "}
            <span className="font-medium text-foreground">
              {nutrition.description}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsModalOpen(true)}
          >
            Change Link
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="p-2"
            onClick={() => handleLink(null)}
            title="Unlink Nutrition Profile"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-2 pb-6">
        {/* Visual Ratio breakdown and metrics */}
        <div className="space-y-5 flex flex-col justify-start w-full">
          {/* Energy Density Card */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-muted/40 border border-muted/80 rounded-2xl gap-4 shadow-xs">
            <div className="space-y-1">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">
                Energy Density
              </span>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-extrabold tracking-tight">
                  {nutrition.caloriesKcal || 0}
                </span>
                <span className="text-muted-foreground text-sm font-semibold uppercase">
                  kcal / 100g
                </span>
              </div>
            </div>
            {badges.length > 0 && (
              <div className="flex flex-row flex-wrap sm:flex-nowrap gap-1.5 justify-start sm:justify-end items-center">
                {badges.map((b, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className={`px-2 py-0.5 text-[10px] font-bold tracking-wide rounded-md shadow-xs whitespace-nowrap ${b.color}`}
                  >
                    {b.text}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Calorie Breakdown Card */}
          <div className="p-5 border border-muted/80 rounded-2xl bg-card shadow-xs space-y-4">
            <div className="flex justify-between items-center text-sm font-bold text-foreground">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-indigo-500" />
                Calorie Breakdown
              </span>
              <span className="text-muted-foreground text-xs font-normal">
                Est. Caloric Share
              </span>
            </div>

            <div className="h-5 w-full rounded-full overflow-hidden flex text-white text-[9px] font-extrabold text-center shadow-inner border border-muted/20">
              {ratios.carbs > 0 && (
                <div
                  style={{ width: `${ratios.carbs}%` }}
                  className="bg-amber-500 flex items-center justify-center transition-all"
                  title={`Carbs: ${ratios.carbs}%`}
                >
                  {ratios.carbs >= 10 && `${ratios.carbs}% C`}
                </div>
              )}
              {ratios.fat > 0 && (
                <div
                  style={{ width: `${ratios.fat}%` }}
                  className="bg-rose-500 flex items-center justify-center transition-all"
                  title={`Fat: ${ratios.fat}%`}
                >
                  {ratios.fat >= 10 && `${ratios.fat}% F`}
                </div>
              )}
              {ratios.protein > 0 && (
                <div
                  style={{ width: `${ratios.protein}%` }}
                  className="bg-indigo-500 flex items-center justify-center transition-all"
                  title={`Protein: ${ratios.protein}%`}
                >
                  {ratios.protein >= 10 && `${ratios.protein}% P`}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs pt-3 border-t border-muted/50 font-medium">
              <div className="flex flex-col items-center justify-center p-2 bg-amber-500/5 rounded-lg border border-amber-500/10">
                <span className="text-muted-foreground text-[10px]">
                  Carbohydrates
                </span>
                <span className="font-extrabold text-amber-600 mt-0.5">
                  {nutrition.carbsG || 0}g
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-rose-500/5 rounded-lg border border-rose-500/10">
                <span className="text-muted-foreground text-[10px]">
                  Total Lipids
                </span>
                <span className="font-extrabold text-rose-600 mt-0.5">
                  {nutrition.fatG || 0}g
                </span>
              </div>
              <div className="flex flex-col items-center justify-center p-2 bg-indigo-500/5 rounded-lg border border-indigo-500/10">
                <span className="text-muted-foreground text-[10px]">
                  Protein
                </span>
                <span className="font-extrabold text-indigo-600 mt-0.5">
                  {nutrition.proteinG || 0}g
                </span>
              </div>
            </div>
          </div>

          {/* Database Provenance Note Card */}
          <div className="p-4 bg-muted/30 border border-dashed border-muted-foreground/20 rounded-2xl text-xs text-muted-foreground flex gap-3 shadow-xs">
            <Database className="h-4 w-4 text-indigo-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-foreground block">
                Database Provenance
              </span>
              <p className="leading-relaxed">
                Data is sourced from the{" "}
                <strong>USDA SR Legacy Database (Released April 2018)</strong>.
                Nutritional counts represent standard reference profiles per
                100g serving and may vary slightly across retail brands,
                batches, and culinary preparations.
              </p>
            </div>
          </div>
        </div>

        {/* Classic FDA-style Nutrition Facts label */}
        <div className="flex justify-center lg:justify-end items-start w-full">
          <div className="border-[6px] border-foreground p-5 sm:p-6 bg-background w-full max-w-[340px] sm:max-w-sm text-foreground select-none font-sans shadow-md">
            <h2 className="text-3xl font-black tracking-tight leading-none">
              Nutrition Facts
            </h2>
            <div className="border-b-2 border-foreground pb-1 text-sm mt-1">
              Serving size: <strong>100g</strong>
            </div>
            <div className="flex justify-between font-black text-xl py-1.5">
              <span>Calories</span>
              <span className="text-2xl">{nutrition.caloriesKcal || 0}</span>
            </div>
            <div className="h-2 bg-foreground my-1" />

            <div className="text-right text-xs font-bold pt-1 border-b border-foreground pb-0.5">
              % Daily Value*
            </div>

            <div className="border-b border-foreground py-1 text-sm flex justify-between">
              <span>
                <strong>Total Fat</strong> {nutrition.fatG || 0}g
              </span>
              <strong>{dvPercent(nutrition.fatG, DAILY_VALUES.fat)}%</strong>
            </div>

            <div className="border-b border-foreground py-1 text-sm flex justify-between">
              <span>
                <strong>Sodium</strong> {nutrition.sodiumMg || 0}mg
              </span>
              <strong>
                {dvPercent(nutrition.sodiumMg, DAILY_VALUES.sodium)}%
              </strong>
            </div>

            <div className="border-b border-foreground py-1 text-sm flex justify-between">
              <span>
                <strong>Total Carbohydrate</strong> {nutrition.carbsG || 0}g
              </span>
              <strong>
                {dvPercent(nutrition.carbsG, DAILY_VALUES.carbs)}%
              </strong>
            </div>

            <div className="border-b border-foreground py-1 pl-4 text-sm flex justify-between text-muted-foreground">
              <span>Dietary Fiber {nutrition.fiberG || 0}g</span>
              <strong>
                {dvPercent(nutrition.fiberG, DAILY_VALUES.fiber)}%
              </strong>
            </div>

            <div className="border-b border-foreground py-1 pl-4 text-sm">
              Total Sugars {nutrition.sugarG || 0}g
            </div>

            <div className="py-1 text-sm flex justify-between">
              <span>
                <strong>Protein</strong> {nutrition.proteinG || 0}g
              </span>
              <strong>
                {dvPercent(nutrition.proteinG, DAILY_VALUES.protein)}%
              </strong>
            </div>
            <div className="h-1 bg-foreground my-1" />

            <p className="text-[9px] leading-tight pt-2">
              * The % Daily Value (DV) tells you how much a nutrient in a
              serving of food contributes to a daily diet. 2,000 calories a day
              is used for general nutrition advice.
            </p>
          </div>
        </div>
      </CardContent>

      {/* Modal for search (change link) */}
      <LinkModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        searchQuery={searchQuery}
        onSearchChange={handleSearch}
        loading={loading}
        searchResults={searchResults}
        onLink={handleLink}
        linking={linking}
        error={error}
        ingredientName={ingredientName}
      />
    </Card>
  );
}

// Modal component extraction to make layout clean
function LinkModal({
  open,
  onOpenChange,
  searchQuery,
  onSearchChange,
  loading,
  searchResults,
  onLink,
  linking,
  error,
  ingredientName,
}: any) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle>Link USDA Nutrition Profile</DialogTitle>
          <DialogDescription>
            Search the USDA SR Legacy database to link a reference nutrition
            profile to <strong>{ingredientName}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reference food... (e.g. Olive Oil, Garlic, Hummus)"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {error && (
          <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-lg flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-[300px] border rounded-lg bg-muted/10 divide-y">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground space-y-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm">Querying reference foods...</span>
            </div>
          ) : searchQuery.length < 2 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground p-8 text-center space-y-2">
              <Database className="h-8 w-8 text-muted-foreground/60" />
              <span className="text-sm">
                Type 2 or more characters to search 7,700+ foods
              </span>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-muted-foreground p-8 text-center space-y-2">
              <AlertTriangle className="h-8 w-8 text-muted-foreground/60" />
              <span className="text-sm">
                No USDA reference foods found for "{searchQuery}"
              </span>
            </div>
          ) : (
            searchResults.map((food: NutritionData) => (
              <div
                key={food.fdcId}
                className="flex items-center justify-between p-3.5 hover:bg-muted/40 transition-colors"
              >
                <div className="space-y-1.5 max-w-[70%]">
                  <h4 className="font-semibold text-sm leading-tight">
                    {food.description}
                  </h4>
                  <div className="flex flex-wrap gap-1 items-center">
                    <Badge
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0.5 bg-muted"
                    >
                      {food.foodCategory || "Generic"}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      FDC: {food.fdcId}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right text-[11px] leading-tight text-muted-foreground font-mono hidden sm:block">
                    <div>{food.caloriesKcal || 0} kcal</div>
                    <div>
                      P: {food.proteinG || 0}g | C: {food.carbsG || 0}g | F:{" "}
                      {food.fatG || 0}g
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => onLink(food)}
                    disabled={linking}
                    className="h-8 px-3 font-semibold text-xs"
                  >
                    {linking ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      "Link"
                    )}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
