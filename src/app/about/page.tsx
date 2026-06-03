import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function About() {
    return (
        <div className="min-h-screen flex flex-col bg-background">
            <NavBar />

            <main className="flex-1 flex flex-col items-center justify-center px-6 py-12 md:py-24">
                <div className="max-w-3xl w-full space-y-10 text-center">

                    {/* Header Section */}
                    <div className="space-y-6">
                        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight">
                            <span className="text-primary">Food</span>Repo
                        </h1>
                        <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl mx-auto">
                            FoodRepo aggregates detailed ingredient data and relationships to help
                            cooks, developers, and researchers understand the origins, flavors, and
                            cultural context of ingredients.
                        </p>
                    </div>

                    {/* Statement Card */}
                    <Card className="max-w-2xl mx-auto border-dashed shadow-sm bg-muted/30">
                        <CardContent className="p-6 sm:p-8">
                            <p className="text-base sm:text-lg text-foreground">
                                All data is provided <strong className="font-semibold text-primary">freely</strong> for anyone to use.
                                Feel free to explore, integrate, or expand upon it.
                            </p>
                        </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                        <Button size="lg" className="w-full sm:w-auto h-12 px-8 text-base">
                            <a href="https://github.com/seyone22" target="_blank" rel="noopener noreferrer">
                                GitHub
                            </a>
                        </Button>
                        <Button size="lg" variant="outline" className="w-full sm:w-auto h-12 px-8 text-base bg-background">
                            <a href="mailto:s.g.seyone@proton.me">
                                <Mail className="mr-2 h-5 w-5" />
                                Email
                            </a>
                        </Button>
                    </div>

                </div>
            </main>

            <Footer />
        </div>
    );
}