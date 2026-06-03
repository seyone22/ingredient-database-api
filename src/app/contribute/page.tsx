"use client";

import {useState} from "react";
import Navbar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import {Card, CardContent} from "@/components/ui/card";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Button} from "@/components/ui/button";
import {AlertCircle, CheckCircle2, Loader2} from "lucide-react";

export default function ContributePage() {
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
        type: null,
        message: "",
    });

    const [formData, setFormData] = useState({
        name: "", aliases: "", provenance: "", country: "",
        cuisine: "", region: "", flavor: "", pronunciation: "",
        photo: "", comment: "",
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const {name, value} = e.target;
        setFormData((prev) => ({...prev, [name]: value}));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault(); // Prevent standard page reload
        setLoading(true);
        setStatus({type: null, message: ""});

        try {
            const res = await fetch("/api/ingredients", {
                method: "POST",
                headers: {"Content-Type": "application/json"},
                body: JSON.stringify({
                    name: formData.name,
                    aliases: formData.aliases.split(",").map((s) => s.trim()).filter(Boolean),
                    provenance: formData.provenance,
                    country: formData.country.split(",").map((s) => s.trim()).filter(Boolean),
                    cuisine: formData.cuisine.split(",").map((s) => s.trim()).filter(Boolean),
                    region: formData.region.split(",").map((s) => s.trim()).filter(Boolean),
                    flavor_profile: formData.flavor.split(",").map((s) => s.trim()).filter(Boolean),
                    comment: formData.comment,
                    pronunciation: formData.pronunciation,
                    photo: formData.photo,
                }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to add ingredient");
            }

            setStatus({type: "success", message: "Ingredient added successfully!"});

            // Reset form
            setFormData({
                name: "", aliases: "", provenance: "", country: "",
                cuisine: "", region: "", flavor: "", pronunciation: "",
                photo: "", comment: "",
            });
        } catch (err: any) {
            setStatus({type: "error", message: err.message || "Error submitting ingredient"});
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-muted/20">
            <Navbar/>
            <main className="flex-1 flex flex-col items-center py-12 px-4 sm:px-6">
                <div className="w-full max-w-3xl space-y-6">
                    <div className="space-y-2 text-center">
                        <h1 className="text-3xl font-bold tracking-tight">Contribute an Ingredient</h1>
                        <p className="text-muted-foreground">Help expand FoodRepo by adding new ingredients to the
                            database.</p>
                    </div>

                    <Card className="border-border/50 shadow-sm">
                        <CardContent className="p-6 sm:p-8 mt-4">
                            {status.type && (
                                <div
                                    className={`mb-6 p-4 rounded-md flex items-center gap-3 ${status.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                                    {status.type === "success" ? <CheckCircle2 className="h-5 w-5"/> :
                                        <AlertCircle className="h-5 w-5"/>}
                                    <p className="text-sm font-medium">{status.message}</p>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                    <div className="col-span-1 md:col-span-2 space-y-2">
                                        <label htmlFor="name" className="text-sm font-medium leading-none">Ingredient
                                            Name <span className="text-red-500">*</span></label>
                                        <Input id="name" name="name" value={formData.name} onChange={handleChange}
                                               placeholder="e.g. Cardamom" required/>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="aliases" className="text-sm font-medium leading-none">Aliases
                                            (comma-separated)</label>
                                        <Input id="aliases" name="aliases" value={formData.aliases}
                                               onChange={handleChange} placeholder="e.g. Elaichi, Ilaychi"/>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="provenance"
                                               className="text-sm font-medium leading-none">Provenance</label>
                                        <Input id="provenance" name="provenance" value={formData.provenance}
                                               onChange={handleChange} placeholder="e.g. Plant, Animal, Fungi"/>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="country" className="text-sm font-medium leading-none">Countries
                                            (comma-separated)</label>
                                        <Input id="country" name="country" value={formData.country}
                                               onChange={handleChange} placeholder="e.g. India, Guatemala"/>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="cuisine" className="text-sm font-medium leading-none">Cuisines
                                            (comma-separated)</label>
                                        <Input id="cuisine" name="cuisine" value={formData.cuisine}
                                               onChange={handleChange} placeholder="e.g. Indian, Middle Eastern"/>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="region" className="text-sm font-medium leading-none">Regions
                                            (comma-separated)</label>
                                        <Input id="region" name="region" value={formData.region} onChange={handleChange}
                                               placeholder="e.g. South Asia"/>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="flavor" className="text-sm font-medium leading-none">Flavor
                                            Profile (comma-separated)</label>
                                        <Input id="flavor" name="flavor" value={formData.flavor} onChange={handleChange}
                                               placeholder="e.g. Sweet, Spicy, Warm"/>
                                    </div>

                                    <div className="space-y-2">
                                        <label htmlFor="pronunciation"
                                               className="text-sm font-medium leading-none">Pronunciation</label>
                                        <Input id="pronunciation" name="pronunciation" value={formData.pronunciation}
                                               onChange={handleChange} placeholder="e.g. kahr-duh-muhm"/>
                                    </div>

                                    <div className="col-span-1 md:col-span-2 space-y-2">
                                        <label htmlFor="photo" className="text-sm font-medium leading-none">Photo
                                            URL</label>
                                        <Input id="photo" type="url" name="photo" value={formData.photo}
                                               onChange={handleChange} placeholder="https://example.com/image.jpg"/>
                                    </div>

                                    <div className="col-span-1 md:col-span-2 space-y-2">
                                        <label htmlFor="comment" className="text-sm font-medium leading-none">Description
                                            / Comment</label>
                                        <Textarea id="comment" name="comment" value={formData.comment}
                                                  onChange={handleChange}
                                                  placeholder="Share details about this ingredient..."
                                                  className="resize-none h-24"/>
                                    </div>
                                </div>

                                <div className="flex justify-end pt-4">
                                    <Button type="submit" disabled={loading} className="w-full sm:w-auto px-8">
                                        {loading ?
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : "Submit Ingredient"}
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </main>
            <Footer/>
        </div>
    );
}