import styles from "./IngredientCard.module.css";
import {IIngredientData} from "@/models/Ingredient";

export default function IngredientCard({ingredient}: { ingredient: IIngredientData }) {
    return (
        <li key={ingredient.name} className={styles.card}>
            <h2 className={styles.ingName}>{ingredient.name}</h2>
            <p>
                <strong>Provenance:</strong> {ingredient.provenance || "Unknown"}
            </p>
            {ingredient.flavor_profile && (
                <p>
                    <strong>Flavor:</strong> {ingredient.flavor_profile.join(", ")}
                </p>
            )}
            {ingredient.comment && (
                <p dangerouslySetInnerHTML={{__html: ingredient.comment}}></p>
            )}
        </li>
    );
}
