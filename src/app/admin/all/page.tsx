"use client";
import React, { useEffect, useState, useCallback } from "react";
import styles from "../../page.module.css";
import NavBar from "@/components/navbar/NavBar";
import Footer from "@/components/footer/Footer";
import {
    DataGrid,
    GridColDef,
    GridPaginationModel,
    GridRowId,
    GridRowSelectionModel
} from "@mui/x-data-grid";
import {
    Box,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    SelectChangeEvent,
    Button
} from "@mui/material";

interface Ingredient {
    _id: string;
    name: string;
    country?: string;
    cuisine?: string;
    region?: string;
    flavor?: string;
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
    const [totalRows, setTotalRows] = useState(0);
    const [selectedRows, setSelectedRows] = useState<GridRowId[]>([]);


    const [rowSelectionModel, setRowSelectionModel] =
        useState<GridRowSelectionModel>({ type: "include", ids: new Set() });

    const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
        page: 0,
        pageSize: 100,
    });

    const [searchQuery, setSearchQuery] = useState("");
    const [filters, setFilters] = useState({
        country: "",
        cuisine: "",
        region: "",
        flavor: ""
    });

    const fetchIngredients = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                query: searchQuery || "a",
                page: (paginationModel.page + 1).toString(),
                limit: paginationModel.pageSize.toString(),
            });

            Object.entries(filters).forEach(([key, value]) => {
                if (value) params.append(key, value);
            });

            const res = await fetch(`/api/ingredients?${params.toString()}`);
            const data: ApiResponse = await res.json();

            if (res.ok) {
                setIngredients(data.results);
                setTotalRows(data.total);
            } else {
                console.error(data);
                setIngredients([]);
                setTotalRows(0);
            }
        } catch (err) {
            console.error(err);
            setIngredients([]);
            setTotalRows(0);
        } finally {
            setLoading(false);
        }
    }, [paginationModel.page, paginationModel.pageSize, searchQuery, filters]);

    useEffect(() => {
        fetchIngredients();
    }, [fetchIngredients]);

    const columns: GridColDef[] = [
        { field: "_id", headerName: "ID", width: 220, editable: false },
        { field: "name", headerName: "Name", width: 250, editable: true },
        { field: "country", headerName: "Country", width: 150, editable: true,
            valueGetter: (params: any) => Array.isArray(params) ? params.join(", ") : params,
            sortComparator: (v1, v2) => {
                const s1 = Array.isArray(v1) ? v1.join(", ") : v1;
                const s2 = Array.isArray(v2) ? v2.join(", ") : v2;
                return s1.localeCompare(s2);
            } },
        { field: "cuisine", headerName: "Cuisine", width: 150, editable: true,
            valueGetter: (params: any) => Array.isArray(params) ? params.join(", ") : params,
            sortComparator: (v1, v2) => {
                const s1 = Array.isArray(v1) ? v1.join(", ") : v1;
                const s2 = Array.isArray(v2) ? v2.join(", ") : v2;
                return s1.localeCompare(s2);
            } },
        { field: "region", headerName: "Region", width: 150, editable: true,
            valueGetter: (params: any) => Array.isArray(params) ? params.join(", ") : params,
            sortComparator: (v1, v2) => {
                const s1 = Array.isArray(v1) ? v1.join(", ") : v1;
                const s2 = Array.isArray(v2) ? v2.join(", ") : v2;
                return s1.localeCompare(s2);
            } },
        { field: "flavor_profile", headerName: "Flavor", width: 150, editable: true,
            valueGetter: (params: any) => Array.isArray(params) ? params.join(", ") : params,
            sortComparator: (v1, v2) => {
                const s1 = Array.isArray(v1) ? v1.join(", ") : v1;
                const s2 = Array.isArray(v2) ? v2.join(", ") : v2;
                return s1.localeCompare(s2);
            } },
        { field: "aliases", headerName: "Aliases", width: 150, editable: true,
            valueGetter: (params: any) => Array.isArray(params) ? params.join(", ") : params,
            sortComparator: (v1, v2) => {
                const s1 = Array.isArray(v1) ? v1.join(", ") : v1;
                const s2 = Array.isArray(v2) ? v2.join(", ") : v2;
                return s1.localeCompare(s2);
            } },
        {
            field: "comment",
        }
    ];

    const handleFilterChange = (e: SelectChangeEvent, key: string) => {
        setFilters((prev) => ({ ...prev, [key]: e.target.value }));
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleSearchSubmit = () => {
        setPaginationModel((prev) => ({ ...prev, page: 0 }));
        fetchIngredients();
    };

    const handleRowUpdate = async (newRow: Ingredient) => {
        try {
            const res = await fetch(`/api/ingredients/${newRow._id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newRow),
            });
            if (!res.ok) throw new Error("Failed to update");
            return newRow;
        } catch (err) {
            console.error(err);
            return ingredients.find((row) => row._id === newRow._id)!; // revert
        }
    };

    const handleEnhanceSelected = async () => {
        if (!selectedRows.length) return;
        if (!confirm(`Enhance ${selectedRows.length} ingredient(s)?`)) return;

        try {
            const res = await fetch(`/api/ingredients/enhance`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: selectedRows }), // sending array of IDs
            });

            if (!res.ok) throw new Error("Enhancement failed");

            const data = await res.json();

            // Update the table with enriched data
            setIngredients((prev) =>
                prev.map((row) => (data.enriched[row._id] ? data.enriched[row._id] : row))
            );

            alert("Enhancement completed!");
        } catch (err: any) {
            console.error(err);
            alert(err.message || "Enhancement failed");
        }
    };


    const handleDeleteSelected = async () => {
        if (!selectedRows.length) return;
        if (!confirm(`Delete ${selectedRows.length} ingredient(s)?`)) return;

        try {
            await Promise.all(
                selectedRows.map((id) =>
                    fetch(`/api/ingredients/${id}`, { method: "DELETE" })
                )
            );
            setIngredients((prev) => prev.filter((row) => !selectedRows.includes(row._id)));
            setSelectedRows([]);
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className={styles.page}>
            <NavBar />
            <main className={styles.main}>
                <Box sx={{ width: "100%", mb: 2, display: "flex", alignItems: "center", gap: 2 }}>
                    <TextField
                        label="Search Ingredients"
                        variant="outlined"
                        value={searchQuery}
                        onChange={handleSearchChange}
                        size="small"
                        onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                    />
                    <Button variant="contained" onClick={handleSearchSubmit}>
                        Search
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        disabled={!selectedRows.length}
                        onClick={handleDeleteSelected}
                    >
                        Delete Selected
                    </Button>
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={!selectedRows.length}
                        onClick={handleEnhanceSelected}
                    >
                        Enhance
                    </Button>
                </Box>

                <Box sx={{ height: 'auto', width: "100%" }}>
                    <DataGrid
                        paginationModel={paginationModel}
                        autoPageSize={false}
                        pageSizeOptions={[5, 10, 25, 50, 100]}
                        rows={ingredients}
                        columns={columns}
                        getRowId={(row) => row._id}
                        loading={loading}
                        rowCount={totalRows}
                        pagination
                        paginationMode="server"
                        onPaginationModelChange={setPaginationModel}
                        editMode="row"
                        processRowUpdate={handleRowUpdate}
                        checkboxSelection
                        onRowSelectionModelChange={(newModel) => {
                            setRowSelectionModel(newModel);
                            // convert Set to array for your selectedRows state
                            setSelectedRows(Array.from(newModel.ids));
                        }}
                    />
                </Box>
            </main>
            <Footer />
        </div>
    );
}
