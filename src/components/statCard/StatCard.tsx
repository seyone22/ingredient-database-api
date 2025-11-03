import { Card, CardContent, Typography } from "@mui/material";

export default function StatCard({
                                     title,
                                     value,
                                 }: {
    title: string;
    value: string | number;
}) {
    return (
        <Card
            sx={{
                borderRadius: 2,
                textAlign: "center",
                p: 2,
                boxShadow: 0,
                width: "auto",
            }}
        >
            <CardContent>
                <Typography variant="h6" color="text.secondary">
                    {title}
                </Typography>
                <Typography variant="h4" sx={{ mt: 1, color: "primary.main" }}>
                    {value}
                </Typography>
            </CardContent>
        </Card>
    );
}
