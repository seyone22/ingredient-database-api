import Link from "next/link";
import { IIngredientData } from "@/models/Ingredient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Globe, Utensils } from "lucide-react";

export default function IngredientCard({ ingredient }: { ingredient: IIngredientData }) {
    if (!ingredient) return null;

    const hasCountries = Array.isArray(ingredient.country) && ingredient.country.length > 0;
    const hasCuisines = Array.isArray(ingredient.cuisine) && ingredient.cuisine.length > 0;
    const hasFlavors = Array.isArray(ingredient.flavor_profile) && ingredient.flavor_profile.length > 0;
    const hasImage = !!ingredient.image?.url;
    const hasComment = typeof ingredient.comment === "string" && ingredient.comment.trim().length > 0;

    // Fallback to _id if using MongoDB, or name if id is missing.
    // Adjust this to match your exact IIngredientData schema!
    const destinationId = ingredient.id || (ingredient as any)._id;

    return (
        <Link
            href={`/ingredient/${destinationId}`}
            className="block h-full outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl"
        >
            <Card className="overflow-hidden pt-0 flex flex-col h-full transition-all hover:shadow-md hover:border-primary/50 group cursor-pointer">
                {/* Image Section */}
                {hasImage ? (
                    <div className="relative h-48 w-full overflow-hidden bg-muted">
                        <img
                            src={ingredient.image!.url}
                            alt={ingredient.name || "Ingredient image"}
                            className="object-cover w-full h-full transition-transform duration-300 group-hover:scale-105"
                        />
                    </div>
                ) : (
                    // Fallback for ingredients without images
                    <div className="h-48 w-full bg-muted flex items-center justify-center">
                        <span className="text-muted-foreground text-sm">No image available</span>
                    </div>
                )}

                {/* Header Section */}
                <CardHeader className="pb-3 flex-none">
                    <div className="flex items-baseline justify-between gap-2">
                        <CardTitle className="text-xl font-bold leading-none tracking-tight line-clamp-1 group-hover:text-primary transition-colors">
                            {ingredient.name || "Unnamed"}
                        </CardTitle>
                        {ingredient.pronunciation && (
                            <span className="text-sm text-muted-foreground italic shrink-0">
                                /{ingredient.pronunciation}/
                            </span>
                        )}
                    </div>
                </CardHeader>

                {/* Content Section */}
                <CardContent className="flex-1 flex flex-col gap-4">
                    {/* Metadata: Country & Cuisine */}
                    {(hasCountries || hasCuisines) && (
                        <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                            {hasCountries && (
                                <div className="flex items-center gap-2">
                                    <Globe className="h-4 w-4 shrink-0" />
                                    <span className="line-clamp-1">{ingredient.country!.join(", ")}</span>
                                </div>
                            )}
                            {hasCuisines && (
                                <div className="flex items-center gap-2">
                                    <Utensils className="h-4 w-4 shrink-0" />
                                    <span className="line-clamp-1">{ingredient.cuisine!.join(", ")}</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Flavor Badges */}
                    {hasFlavors && (
                        <div className="flex flex-wrap gap-1.5">
                            {ingredient.flavor_profile!.map((flavor) => (
                                <Badge key={flavor} variant="secondary" className="font-normal">
                                    {flavor}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Comment Section */}
                    {hasComment && (
                        <div className="mt-auto pt-2 border-t">
                            <div
                                className="text-sm text-muted-foreground line-clamp-3"
                                dangerouslySetInnerHTML={{ __html: ingredient.comment! }}
                            />
                        </div>
                    )}
                </CardContent>
            </Card>
        </Link>
    );
}