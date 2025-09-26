import styles from "./IngredientCard.module.css";
import { IIngredientData } from "@/models/Ingredient";

export default function IngredientCard({ ingredient }: { ingredient: IIngredientData }) {
    return (
        <li className={styles.card}>
            <div className={styles.content}>
                <div className={styles.header}>
                    <h2 className={styles.ingName}>{ingredient.name}</h2>
                    {ingredient.pronunciation && (
                        <span className={styles.pronunciation}>/{ingredient.pronunciation}/</span>
                    )}
                </div>

                {ingredient?.country && ingredient?.cuisine && (ingredient?.country?.length > 0 || ingredient.cuisine?.length > 0) && (
                    <p className={styles.meta}>
                        <strong>Country: </strong>{ingredient.country?.join(", ")}{" | "}
                        <strong>Cuisine: </strong>{ingredient.cuisine?.length > 0 && <>· {ingredient.cuisine.join(", ")}</>}
                    </p>
                )}

                {ingredient.flavor_profile && ingredient.flavor_profile?.length > 0 && (
                    <p className={styles.flavor}>
                        <strong>Flavor:</strong> {ingredient.flavor_profile.join(", ")}
                    </p>
                )}

                {ingredient.comment && (
                    <p
                        className={styles.comment}
                        dangerouslySetInnerHTML={{ __html: ingredient.comment }}
                    />
                )}
            </div>
        </li>
    );
}
