import styles from "./IngredientCard.module.css";
import { IIngredientData } from "@/models/Ingredient";

export default function IngredientCard({ ingredient }: { ingredient: IIngredientData }) {
    if (!ingredient) return null;

    const hasCountries = Array.isArray(ingredient.country) && ingredient.country.length > 0;
    const hasCuisines = Array.isArray(ingredient.cuisine) && ingredient.cuisine.length > 0;
    const hasFlavors = Array.isArray(ingredient.flavor_profile) && ingredient.flavor_profile.length > 0;
    const hasImage = !!ingredient.image?.url;
    const hasComment = typeof ingredient.comment === "string" && ingredient.comment.trim().length > 0;

    return (
        <li className={styles.card}>
            {hasImage && (
                <div className={styles.imageWrapper}>
                    <img
                        src={ingredient.image!.url}
                        alt={ingredient.name || "Unnamed ingredient"}
                        className={styles.image}
                    />
                </div>
            )}

            <div className={styles.content}>
                <div className={styles.header}>
                    <h2 className={styles.ingName}>{ingredient.name || "Unnamed"}</h2>
                    {ingredient.pronunciation && (
                        <span className={styles.pronunciation}>/{ingredient.pronunciation}/</span>
                    )}
                </div>

                {(hasCountries || hasCuisines) && (
                    <p className={styles.meta}>
                        {hasCountries && (
                            <>
                                <strong>Country: </strong>
                                {ingredient.country!.join(", ")}
                                {" "}
                            </>
                        )}
                        {hasCuisines && (
                            <>
                                <strong>Cuisine: </strong>
                                {ingredient.cuisine!.join(", ")}
                            </>
                        )}
                    </p>
                )}

                {hasFlavors && (
                    <p className={styles.flavor}>
                        <strong>Flavor: </strong>
                        {ingredient.flavor_profile!.join(", ")}
                    </p>
                )}

                {hasComment && (
                    <p
                        className={styles.comment}
                        dangerouslySetInnerHTML={{ __html: ingredient.comment! }}
                    />
                )}
            </div>
        </li>
    );
}
