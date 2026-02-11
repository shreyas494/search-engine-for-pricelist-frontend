import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

const AdminImport = () => {
    const [file, setFile] = useState(null);
    const [parsedData, setParsedData] = useState([]);
    const [rawText, setRawText] = useState("");
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [status, setStatus] = useState("");

    const handleFileChange = (e) => {
        console.log("📍 Frontend using API_URL:", API_URL);
        setFile(e.target.files[0]);
        setStatus("");
    };

    const handleParse = async () => {
        if (!file) {
            alert("Please select a PDF file first");
            return;
        }

        setLoading(true);
        setStatus("Scanning PDF... This may take a few seconds.");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await fetch(`${API_URL}/api/admin/parse-pdf`, {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Failed to parse PDF");
            }

            const { extractedData, rawText: text } = await res.json();
            setRawText(text);

            if (Array.isArray(extractedData) && extractedData.length > 0) {
                setParsedData(extractedData);
                setStatus(`Extraction complete: Found ${extractedData.length} items. Please review and edit in the grid below.`);
            } else {
                setParsedData([]);
                setStatus("AI was throttled. I've loaded the raw text below for you. Please use '+ Add Manually' to fill the list.");
            }
        } catch (error) {
            console.error(error);
            setStatus(`Note: ${error.message}. You can still add data manually below.`);
        } finally {
            setLoading(false);
        }
    };

    const handleAddRow = () => {
        setParsedData([
            { brand: "", model: "", type: "", dp: null, mrp: null },
            ...parsedData,
        ]);
        setStatus("New row added. Fill in the details manually.");
    };

    const handleDataChange = (index, field, value) => {
        const newData = [...parsedData];
        newData[index][field] = value;
        setParsedData(newData);
    };

    const handleDeleteRow = (index) => {
        const newData = parsedData.filter((_, i) => i !== index);
        setParsedData(newData);
    };

    const handleClearAll = () => {
        if (window.confirm("Are you sure you want to clear all extracted data?")) {
            setParsedData([]);
            setStatus("");
        }
    };

    const handleImport = async () => {
        if (parsedData.length === 0) return;

        setImporting(true);
        try {
            const res = await fetch(`${API_URL}/api/admin/import`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(parsedData),
            });

            if (res.ok) {
                alert("Data successfully imported to Database! 🚀");
                setParsedData([]);
                setFile(null);
                setStatus("Import Complete.");
            } else {
                alert("Failed to import data.");
            }
        } catch (error) {
            console.error(error);
            alert("Error importing data.");
        } finally {
            setImporting(false);
        }
    };

    const downloadCSV = () => {
        if (parsedData.length === 0) return;
        const headers = ["brand", "model", "type", "dp", "mrp"];
        const csvContent = [
            headers.join(","),
            ...parsedData.map(row => headers.map(fieldName => JSON.stringify(row[fieldName] || "")).join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `pricelist_export_${new Date().toISOString().slice(0, 10)}.csv`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const downloadJSON = () => {
        if (parsedData.length === 0) return;
        const blob = new Blob([JSON.stringify(parsedData, null, 2)], { type: "application/json" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `pricelist_export_${new Date().toISOString().slice(0, 10)}.json`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto bg-white min-h-screen">
            <h1 className="text-3xl font-bold mb-6 text-gray-800">Admin: PDF Pricelist Importer</h1>

            {/* Upload Section */}
            <div className="mb-8 p-6 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 flex flex-col items-center">
                <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileChange}
                    className="mb-4 text-lg"
                />
                <div className="flex gap-4">
                    <button
                        onClick={handleParse}
                        disabled={!file || loading}
                        className={`px-6 py-2 rounded-lg text-white font-semibold shadow-md transition ${loading ? "bg-gray-400 cursor-not-allowed" : "bg-indigo-600 hover:bg-indigo-700"
                            }`}
                    >
                        {loading ? "Scanning with AI..." : "Scan & Extract Data"}
                    </button>
                    <button
                        onClick={() => { setParsedData([{ brand: "", model: "", type: "", dp: null, mrp: null }, ...parsedData]); setStatus("Manual row added."); }}
                        className="px-6 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 font-semibold shadow-sm"
                    >
                        + Add Manually
                    </button>
                </div>
                {status && <p className="mt-4 text-sm text-gray-500 bg-gray-100 px-4 py-2 rounded-full">{status}</p>}
            </div>

            {/* Raw Text Reference (Only if AI fails or user needs it) */}
            {rawText && (
                <div className="mb-6 border border-amber-200 bg-amber-50 rounded-lg p-4">
                    <details className="cursor-pointer">
                        <summary className="font-bold text-amber-800 flex items-center gap-2">
                            📖 See PDF Text Reference (Use this to copy names/prices)
                        </summary>
                        <div className="mt-3 p-3 bg-white border border-amber-200 rounded max-h-40 overflow-auto font-mono text-xs text-gray-700 whitespace-pre-wrap">
                            {rawText}
                        </div>
                    </details>
                </div>
            )}

            {/* Review Section - Spreadsheet UI */}
            <div className="mt-8 bg-gray-50 border border-gray-200 rounded-xl overflow-hidden shadow-xl animate-fade-in">
                <div className="p-4 bg-white border-b border-gray-200 flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800">Review Data</h2>
                        <p className="text-sm text-gray-500">{parsedData.length} records ready to process</p>
                    </div>

                    <div className="flex gap-3 items-center">
                        <div className="flex rounded-md shadow-sm overflow-hidden border border-gray-300">
                            <button
                                onClick={downloadCSV}
                                className="px-3 py-2 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 border-r border-gray-300 flex items-center gap-1"
                            >
                                ⬇️ CSV
                            </button>
                            <button
                                onClick={downloadJSON}
                                className="px-3 py-2 bg-white text-gray-700 text-xs font-bold hover:bg-gray-50 flex items-center gap-1"
                            >
                                ⬇️ JSON
                            </button>
                        </div>

                        <button
                            onClick={handleClearAll}
                            className="px-4 py-2 bg-red-50 text-red-600 text-sm font-bold rounded-lg hover:bg-red-100 transition"
                        >
                            Clear All
                        </button>

                        <button
                            onClick={handleImport}
                            disabled={importing || parsedData.length === 0}
                            className="px-8 py-2 bg-green-600 text-white font-black rounded-lg hover:bg-green-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105"
                        >
                            {importing ? "SAVING..." : "SAVE TO DATABASE"}
                        </button>
                    </div>
                </div>

                <div className="overflow-auto max-h-[600px] spreadsheet-container">
                    <table className="w-full border-collapse bg-white">
                        <thead className="sticky top-0 z-10 shadow-sm">
                            <tr className="bg-gray-100 text-gray-600 text-xs uppercase font-bold text-left">
                                <th className="px-4 py-3 border-r border-b border-gray-200 w-12 text-center bg-gray-100">#</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 min-w-[150px]">Brand</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 min-w-[200px]">Model / Pattern</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 min-w-[120px]">Type</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 min-w-[100px]">Dealer Price</th>
                                <th className="px-4 py-3 border-r border-b border-gray-200 min-w-[100px]">MRP</th>
                                <th className="px-4 py-3 border-b border-gray-200 w-16 text-center">Delete</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm font-medium">
                            {parsedData.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="py-20 text-center text-gray-400 italic">
                                        No data yet. Upload a PDF or click "+ Add Manually" to begin.
                                    </td>
                                </tr>
                            ) : (
                                parsedData.map((item, index) => (
                                    <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-4 py-2 border-r border-b border-gray-100 text-center text-gray-400 font-mono text-xs bg-gray-50/50">
                                            {index + 1}
                                        </td>
                                        {["brand", "model", "type", "dp", "mrp"].map((field) => (
                                            <td key={field} className="p-0 border-r border-b border-gray-100">
                                                <input
                                                    type={field === "dp" || field === "mrp" ? "number" : "text"}
                                                    value={item[field] || ""}
                                                    placeholder={`Enter ${field}...`}
                                                    onChange={(e) => handleDataChange(index, field, e.target.value)}
                                                    className="w-full h-10 px-4 focus:bg-white focus:ring-2 focus:ring-blue-400 focus:outline-none bg-transparent border-none transition-all placeholder-gray-300"
                                                />
                                            </td>
                                        ))}
                                        <td className="px-4 py-2 border-b border-gray-100 text-center">
                                            <button
                                                onClick={() => handleDeleteRow(index)}
                                                className="w-8 h-8 flex items-center justify-center rounded-full text-red-300 hover:text-red-600 hover:bg-red-50 transition-all font-bold"
                                                title="Delete this row"
                                            >
                                                ✕
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AdminImport;
